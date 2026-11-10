const COLLECTIONS = new Set(["family", "visits", "travel", "art"]);
const MAX_BYTES = 15 * 1024 * 1024;
const PAIR_TTL = 10 * 60 * 1000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
function authorized(request, secret, header) {
  const supplied = request.headers.get(header) || "";
  return Boolean(secret && supplied && supplied === secret);
}
function safeCollection(value) { return COLLECTIONS.has(value) ? value : null; }
function randomHex(bytes = 24) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return [...data].map(value => value.toString(16).padStart(2, "0")).join("");
}
async function readJson(bucket, key) {
  const object = await bucket.get(key);
  if (!object) return null;
  try { return await object.json(); } catch { return null; }
}
async function readManifest(bucket) {
  return (await readJson(bucket, "manifest.json")) || { version: 1, updatedAt: null, photos: [] };
}
async function handleApi(request, env, url) {
  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({ ok: true, service: "TV Studio Photos", storage: Boolean(env.TV_PHOTOS) });
  }

  // TV creates a short-lived pairing request. The returned id is unguessable; the code is shown on the TV.
  if (url.pathname === "/api/pair/start" && request.method === "POST") {
    const id = randomHex(16);
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    const expiresAt = Date.now() + PAIR_TTL;
    await env.TV_PHOTOS.put(`pairings/${id}.json`, JSON.stringify({ id, code, status: "pending", expiresAt }));
    await env.TV_PHOTOS.put(`pair-codes/${code}.json`, JSON.stringify({ id, expiresAt }));
    return json({ id, code, expiresAt });
  }

  // The phone panel exchanges the one-time code for a device-specific TV token.
  if (url.pathname === "/api/pair/approve" && request.method === "POST") {
    if (!authorized(request, env.ADMIN_PIN, "x-admin-pin")) return json({ error: "Unauthorized" }, 401);
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }
    const code = String(body.code || "").replace(/\\D/g, "");
    if (!/^\\d{6}$/.test(code)) return json({ error: "Digite o código de 6 números exibido na TV." }, 400);
    const codeRecord = await readJson(env.TV_PHOTOS, `pair-codes/${code}.json`);
    if (!codeRecord || codeRecord.expiresAt < Date.now()) return json({ error: "Código expirado. Gere um novo código na TV." }, 410);
    const key = `pairings/${codeRecord.id}.json`;
    const pairing = await readJson(env.TV_PHOTOS, key);
    if (!pairing || pairing.status !== "pending" || pairing.expiresAt < Date.now()) return json({ error: "Este pedido de conexão não está mais disponível." }, 410);
    const token = randomHex(32);
    pairing.status = "approved";
    pairing.token = token;
    pairing.approvedAt = Date.now();
    await env.TV_PHOTOS.put(key, JSON.stringify(pairing));
    await env.TV_PHOTOS.delete(`pair-codes/${code}.json`);
    return json({ ok: true, message: "TV conectada. A credencial foi entregue diretamente à TV." });
  }

  // TV polls using the unguessable request id; token is returned only after explicit panel approval.
  if (url.pathname === "/api/pair/status" && request.method === "GET") {
    const id = url.searchParams.get("id") || "";
    if (!/^[a-f0-9]{32}$/.test(id)) return json({ error: "Invalid pairing id" }, 400);
    const key = `pairings/${id}.json`;
    const pairing = await readJson(env.TV_PHOTOS, key);
    if (!pairing || pairing.expiresAt < Date.now()) {
      await env.TV_PHOTOS.delete(key);
      return json({ status: "expired" }, 410);
    }
    if (pairing.status === "approved") {
      const token = pairing.token;
      pairing.status = "claimed";
      delete pairing.token;
      await env.TV_PHOTOS.put(key, JSON.stringify(pairing));
      return json({ status: "approved", token });
    }
    return json({ status: pairing.status });
  }

  if (url.pathname === "/api/photos/upload" && request.method === "POST") {
    if (!authorized(request, env.ADMIN_PIN, "x-admin-pin")) return json({ error: "Unauthorized" }, 401);
    const form = await request.formData();
    const file = form.get("file");
    const collection = safeCollection(String(form.get("collection") || ""));
    if (!(file instanceof File) || !collection) return json({ error: "Invalid photo or collection" }, 400);
    if (!file.type.startsWith("image/") || file.size < 1 || file.size > MAX_BYTES) {
      return json({ error: "Photo must be an image up to 15 MB" }, 400);
    }
    const id = crypto.randomUUID();
    const key = `photos/${collection}/${id}`;
    await env.TV_PHOTOS.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { collection, originalName: String(form.get("name") || file.name).slice(0, 180) }
    });
    const manifest = await readManifest(env.TV_PHOTOS);
    manifest.photos = manifest.photos.filter(photo => photo.id !== id);
    manifest.photos.push({
      id, collection, key, name: String(form.get("name") || file.name).slice(0, 180),
      contentType: file.type, size: file.size, createdAt: new Date().toISOString()
    });
    manifest.updatedAt = new Date().toISOString();
    await env.TV_PHOTOS.put("manifest.json", JSON.stringify(manifest), {
      httpMetadata: { contentType: "application/json; charset=utf-8" }
    });
    return json({ ok: true, photo: manifest.photos[manifest.photos.length - 1] }, 201);
  }

  if (url.pathname === "/api/manifest" && request.method === "GET") {
    if (!authorized(request, env.TV_TOKEN, "x-tv-token") &&
        !authorized(request, env.ADMIN_PIN, "x-admin-pin")) return json({ error: "Unauthorized" }, 401);
    const collection = url.searchParams.get("collection");
    const manifest = await readManifest(env.TV_PHOTOS);
    return json({
      version: manifest.version, updatedAt: manifest.updatedAt,
      photos: manifest.photos.filter(photo => !collection || photo.collection === collection)
        .map(({ id, collection: group, name, contentType, size, createdAt }) =>
          ({ id, collection: group, name, contentType, size, createdAt, url: `/api/photo/${id}?collection=${group}` }))
    });
  }

  const photoMatch = url.pathname.match(/^\\/api\\/photo\\/([a-f0-9-]+)$/i);
  if (photoMatch && request.method === "GET") {
    if (!authorized(request, env.TV_TOKEN, "x-tv-token") &&
        !authorized(request, env.ADMIN_PIN, "x-admin-pin")) return json({ error: "Unauthorized" }, 401);
    const collection = safeCollection(url.searchParams.get("collection"));
    if (!collection) return json({ error: "Invalid collection" }, 400);
    const manifest = await readManifest(env.TV_PHOTOS);
    const photo = manifest.photos.find(item => item.id === photoMatch[1] && item.collection === collection);
    if (!photo) return json({ error: "Not found" }, 404);
    const object = await env.TV_PHOTOS.get(photo.key);
    if (!object) return json({ error: "Not found" }, 404);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "private, max-age=86400");
    headers.set("etag", object.httpEtag);
    return new Response(object.body, { headers });
  }
  return json({ error: "Not found" }, 404);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      if (!env.TV_PHOTOS) return json({ error: "R2 bucket binding is missing" }, 503);
      return handleApi(request, env, url);
    }
    return env.ASSETS.fetch(request);
  }
};
