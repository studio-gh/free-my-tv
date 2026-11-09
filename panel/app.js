(() => {
  const $ = id => document.getElementById(id);
  const state = { pin: "", collection: "family", connected: false, imageUrls: [] };
  const names = { family: "TV: Família", visits: "TV: Visitas", travel: "TV: Viagens", art: "TV: Arte" };

  function toast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");
    setTimeout(() => $("toast").classList.remove("show"), 2800);
  }

  function headers() { return { "X-Admin-Pin": state.pin }; }

  async function connect() {
    const pin = $("pin").value.trim();
    if (!pin) return toast("Digite o PIN do painel.");
    state.pin = pin;
    try {
      const response = await fetch("./api/manifest", { headers: headers() });
      if (!response.ok) throw new Error("Não foi possível validar o PIN.");
      state.connected = true;
      $("status").textContent = "Conectado";
      $("status").classList.add("ok");
      $("google-picker").disabled = !window.TV_STUDIO_CONFIG?.googleClientId;
      $("connection-hint").textContent = "Conexão segura ativa nesta sessão.";
      $("picker-hint").textContent = window.TV_STUDIO_CONFIG?.googleClientId
        ? "Selecione imagens no Google Fotos e importe para a coleção ativa."
        : "Google Fotos será ativado quando o Client ID do Google Cloud estiver configurado.";
      await refresh();
      toast("Painel conectado.");
    } catch (error) {
      state.pin = "";
      state.connected = false;
      toast(error.message);
    }
  }

  async function refresh() {
    if (!state.connected) return;
    const response = await fetch("./api/manifest", { headers: headers() });
    if (!response.ok) throw new Error("Falha ao carregar biblioteca.");
    const data = await response.json();
    const photos = data.photos.filter(photo => photo.collection === state.collection);
    const gallery = $("gallery");
    state.imageUrls.forEach(url => URL.revokeObjectURL(url));
    state.imageUrls = [];
    gallery.replaceChildren();
    if (!photos.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "Ainda não há fotos nesta coleção.";
      gallery.append(empty);
      return;
    }
    for (const photo of photos) {
      const tile = document.createElement("div");
      tile.className = "photo";
      const img = document.createElement("img");
      img.alt = photo.name || names[photo.collection];
      img.loading = "lazy";
      try {
        const imageResponse = await fetch(photo.url, { headers: headers() });
        if (!imageResponse.ok) throw new Error("Foto indisponível");
        const objectUrl = URL.createObjectURL(await imageResponse.blob());
        state.imageUrls.push(objectUrl);
        img.src = objectUrl;
      } catch {
        continue;
      }
      tile.append(img);
      gallery.append(tile);
    }
  }

  async function upload(file, collection = state.collection) {
    const form = new FormData();
    form.append("file", file, file.name || "photo.jpg");
    form.append("name", file.name || names[collection]);
    form.append("collection", collection);
    const response = await fetch("./api/photos/upload", { method: "POST", headers: headers(), body: form });
    if (!response.ok) throw new Error((await response.json()).error || "Falha no envio.");
  }

  function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function durationMs(value, fallback) {
    const seconds = Number.parseFloat(String(value || ""));
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : fallback;
  }

  async function pickerRequest(path, token, options = {}) {
    const response = await fetch(`https://photospicker.googleapis.com/v1/${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) }
    });
    if (!response.ok) {
      let detail = "";
      try { detail = (await response.json()).error?.message || ""; } catch {}
      throw new Error(detail || `Google Fotos respondeu com erro (${response.status}).`);
    }
    return response.status === 204 ? null : response.json();
  }

  async function importFromGooglePhotos(token, pickerWindow) {
    const session = await pickerRequest("sessions", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickingConfig: { maxItemCount: "100" } })
    });
    if (!session?.id || !session?.pickerUri) throw new Error("O Google não criou a sessão de seleção.");
    pickerWindow.location.href = session.pickerUri + "/autoclose";

    const timeout = durationMs(session.pollingConfig?.timeoutIn, 5 * 60 * 1000);
    const deadline = Date.now() + Math.min(timeout, 10 * 60 * 1000);
    let ready = false;
    while (Date.now() < deadline) {
      await wait(durationMs(session.pollingConfig?.pollInterval, 3000));
      const current = await pickerRequest(`sessions/${encodeURIComponent(session.id)}`, token);
      if (current.mediaItemsSet) { ready = true; break; }
    }
    if (!ready) throw new Error("A seleção expirou ou não foi concluída. Tente novamente.");

    let pageToken = "";
    let imported = 0;
    do {
      const query = new URLSearchParams({ sessionId: session.id, pageSize: "100" });
      if (pageToken) query.set("pageToken", pageToken);
      const page = await pickerRequest(`mediaItems?${query.toString()}`, token);
      for (const item of page.mediaItems || []) {
        const media = item.mediaFile;
        if (!media?.baseUrl || !String(media.mimeType || "").startsWith("image/")) continue;
        const imageResponse = await fetch(media.baseUrl + "=w1920-h1080", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!imageResponse.ok) continue;
        const blob = await imageResponse.blob();
        const file = new File([blob], media.filename || `google-photo-${item.id}.jpg`, {
          type: media.mimeType || blob.type || "image/jpeg"
        });
        await upload(file);
        imported++;
        toast(`Importando fotos… ${imported}`);
      }
      pageToken = page.nextPageToken || "";
    } while (pageToken);

    await pickerRequest(`sessions/${encodeURIComponent(session.id)}`, token, { method: "DELETE" });
    await refresh();
    toast(imported ? `${imported} foto(s) adicionada(s) a ${names[state.collection]}.` : "Nenhuma foto compatível foi selecionada.");
  }

  async function startGooglePicker() {
    const clientId = window.TV_STUDIO_CONFIG?.googleClientId;
    if (!clientId || !window.google?.accounts?.oauth2) {
      return toast("O acesso do Google Fotos ainda não está configurado.");
    }
    const pickerWindow = window.open("about:blank", "tv-studio-google-photos");
    if (!pickerWindow) return toast("Permita a abertura de janelas para escolher as fotos.");
    try {
      const token = await new Promise((resolve, reject) => {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
          callback: result => result.error ? reject(new Error(result.error_description || result.error)) : resolve(result.access_token),
          error_callback: error => reject(new Error(error.message || "Não foi possível autenticar no Google."))
        });
        client.requestAccessToken();
      });
      await importFromGooglePhotos(token, pickerWindow);
    } catch (error) {
      pickerWindow.close();
      toast(error.message || "Não foi possível importar as fotos.");
    }
  }

  $("connect").addEventListener("click", connect);
  $("pin").addEventListener("keydown", event => { if (event.key === "Enter") connect(); });
  document.querySelectorAll("[data-collection]").forEach(button => button.addEventListener("click", async () => {
    state.collection = button.dataset.collection;
    document.querySelectorAll("[data-collection]").forEach(item => item.classList.toggle("active", item === button));
    try { await refresh(); } catch (error) { toast(error.message); }
  }));

  $("file-input").addEventListener("change", async event => {
    if (!state.connected) return toast("Conecte o painel primeiro.");
    const files = [...event.target.files];
    if (!files.length) return;
    try {
      for (let index = 0; index < files.length; index++) {
        toast(`Enviando ${index + 1} de ${files.length}…`);
        await upload(files[index]);
      }
      await refresh();
      toast(`${files.length} foto(s) adicionada(s) a ${names[state.collection]}.`);
    } catch (error) { toast(error.message); }
    event.target.value = "";
  });

  $("google-picker").addEventListener("click", startGooglePicker);
})();
