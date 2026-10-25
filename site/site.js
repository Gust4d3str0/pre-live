// Lê latest.json (escrito por `npm run release:prepare` no momento da release). Nenhum link de download existe no HTML:
// sem um latest.json válido o botão fica desativado e a página diz que a versão ainda não foi publicada.
(async () => {
  const $ = (id) => document.getElementById(id);
  const all = (selector) => [...document.querySelectorAll(selector)];
  const isVersion = (v) => typeof v === "string" && /^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(v);
  const github = (u, re) => {
    try { const x = new URL(u); return x.protocol === "https:" && x.hostname === "github.com" && re.test(x.pathname) ? x.href : ""; } catch { return ""; }
  };
  const newer = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return true; };
  const day = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) return "";
    const d = new Date(value.slice(0, 10) + "T12:00:00Z");
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  };

  // Movimento discreto: respeita prefers-reduced-motion (o CSS já remove a transição).
  const items = all(".reveal");
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    items.forEach((el) => io.observe(el));
  } else items.forEach((el) => el.classList.add("in"));

  const copy = $("copy-sha");
  if (copy) copy.addEventListener("click", async () => {
    const text = $("sha").textContent.trim();
    if (!/^[a-f0-9]{64}$/.test(text)) return;
    try { await navigator.clipboard.writeText(text); copy.textContent = "Copiado"; } catch { copy.textContent = "Selecione e copie"; }
    setTimeout(() => (copy.textContent = "Copiar"), 2200);
  });

  let release = null;
  try {
    const response = await fetch("latest.json", { cache: "no-store" });
    if (!response.ok) throw Error("sem latest.json");
    const m = await response.json();
    const down = github(m.downloadUrl, /^\/[\w.-]+\/[\w.-]+\/releases\/download\/v[\d.]+\/[\w.-]+\.exe$/);
    const page = github(m.releaseUrl, /^\/[\w.-]+\/[\w.-]+\/releases\/tag\/v[\d.]+$/);
    const sha = typeof m.sha256 === "string" && /^[a-f0-9]{64}$/i.test(m.sha256) ? m.sha256.toLowerCase() : "";
    if (!isVersion(m.version) || !down || !page || !sha) throw Error("latest.json inválido");
    release = { version: m.version, down, page, sha, size: Number.isFinite(m.size) ? m.size : 0, date: day(m.publishedAt) };
  } catch { /* Sem versão publicada: nada é inventado. */ }

  const label = release
    ? `Versão ${release.version}${release.size ? ` · ${(release.size / 1048576).toFixed(1).replace(".", ",")} MB` : ""} · Windows 10 e 11, 64 bits`
    : "A versão 0.8.0 ainda não foi publicada.";
  all("[data-release-label]").forEach((el) => (el.textContent = label));
  all("[data-download]").forEach((a) => {
    if (release) { a.href = release.down; a.removeAttribute("aria-disabled"); a.removeAttribute("data-pending"); }
    else if (a.dataset.strict !== undefined) {
      a.textContent = "Download em breve";
      a.setAttribute("aria-disabled", "true");
      a.setAttribute("href", "#");
      a.addEventListener("click", (e) => e.preventDefault());
    }
  });
  all("[data-release-page]").forEach((a) => { if (release) a.href = release.page; else a.removeAttribute("href"); });
  all("[data-version]").forEach((el) => (el.textContent = release ? release.version : "—"));
  if ($("sha")) $("sha").textContent = release ? release.sha : "Publicado junto com a versão.";
  if ($("release-size")) $("release-size").textContent = release?.size ? `${(release.size / 1048576).toFixed(1).replace(".", ",")} MB` : "—";
  if ($("release-date")) $("release-date").textContent = release?.date || "—";
  if ($("release-version")) $("release-version").textContent = release ? `v${release.version}` : "Ainda não publicada";
  if (copy) copy.disabled = !release;

  // Notas de versão: só aparecem como publicadas quando a release correspondente existe.
  all("[data-release-version]").forEach((entry) => {
    const wanted = entry.dataset.releaseVersion, tag = entry.querySelector(".status");
    const live = !!release && newer(release.version, wanted);
    if (!tag) return;
    tag.textContent = live ? `Publicada${release.version === wanted && release.date ? ` em ${release.date}` : ""}` : "Em preparação · ainda não publicada";
    tag.classList.toggle("ok", live);
  });
})();
