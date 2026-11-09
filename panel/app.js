(() => {
  const $ = id => document.getElementById(id);
  const state = { pin: "", collection: "family", connected: false };
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
      img.src = photo.url;
      img.onerror = () => tile.remove();
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

  $("google-picker").addEventListener("click", () => {
    toast("A conexão Google será ativada na próxima etapa de configuração.");
  });
})();
