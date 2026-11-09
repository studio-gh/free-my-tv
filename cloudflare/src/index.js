const COLLECTIONS = new Set(["family", "visits", "travel", "art"]);
const MAX_BYTES = 15 * 1024 * 1024;

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

function safeCollection(value) {
  return COLLECTIONS.has(value) ? value : null;
}

async function readManifest(bucket) {
  const object = await bucket.get("manifest.json");
  if (!object) return { version: 1, updatedAt: null, photos: [] };
  try { return await object.json(); }
  catch { return { version: 1, updatedAt: null, photos: [] }; }
}

async function handleApi(request, env, url) {
  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({ ok: true, service: "TV Studio Photos", storage: Boolean(env.TV_PHOTOS) });
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
      version: manifest.version,
      updatedAt: manifest.updatedAt,
      photos: manifest.photos.filter(photo => !collection || photo.collection === collection)
        .map(({ id, collection: group, name, contentType, size, createdAt }) =>
          ({ id, collection: group, name, contentType, size, createdAt, url: `/api/photo/${id}?collection=${group}` }))
    });
  }

  const photoMatch = url.pathname.match(/^\/api\/photo\/([a-f0-9-]+)$/i);
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
    headers.set("cache-control", "public, max-age=86400");
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
