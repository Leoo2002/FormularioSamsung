/* =========================================================
   Central de Casos — Minimal Edition · App Logic
   ========================================================= */

const cascadeData = {
  "eStore - Preventa": {
    "Caracteristica del producto (diseno, especificaciones, etc)": [""],
    "Consulta de disponibilidad de producto": [""],
    "Garantia (cobertura, garantia extendida, SC +)": [""],
    "Informacion de impuestos (IVA, etc)": [""],
    "Opciones de Entrega/Instalacion": [""],
    "Precio/Pago (comparacion de precios, opcion de financiacion)": [""],
    "Promociones (Black Friday, Buen Fin, descuento, etc)": [""],
    "Trade-In (eligibilidad, valor, informacion de recogida, etc)": [""]
  },
  "eStore - Otros": {
    "Asistencia de inicio de sesion EPP": [""],
    "Feedback": [""],
    "Opciones de Samsung Account (como registrarse, info, etc)": [""],
    "Opciones de voucher (como se usa, etc.)": [""],
    "Otros": [""],
    "Problemas con el voucher (no funciona, se vuelve a emitir, etc)": [""],
    "Programa de Rewards": [""],
    "Solicitud de recogida de articulos usados": [""]
  },
  "eStore - Pedidos": {
    "Articulo entregado incorrecto (diferente al articulo pedido)": [""],
    "Articulos faltantes en la entrega": [""],
    "Click & Collect (recogida en tienda)": [""],
    "Disputa de devolucion de cargo por Trade In": [""],
    "El producto entregado esta danado": [""],
    "Error de pago (pedido cancelado, no se pudo completar)": [""],
    "Estado de pedido": [""],
    "Modificacion de pedido (Direccion/Metodo)": [""],
    "Problema con Trade In (retraso en el proceso, etc)": [""],
    "Problema de pedido (Carrito/Pago/Promocion)": [""],
    "Retraso de instalacion (producto aun no instalado)": [""],
    "Retraso en la entrega (producto aun no entregado)": [""],
    "Solicitud de estado de instalacion": [""],
    "Solicitud de factura (copia de factura, etc.)": [""]
  },
  "eStore - Cancelacion": {
    "Cambio incorrecto (producto incorrecto recibido)": [""],
    "Cancelacion de pedido": [""],
    "Estado de Reembolso/Cambio": [""],
    "Politica de devolucion (Reembolso o Cambio)": [""],
    "Reembolso incorrecto (cantidad incorrecta recibida)": [""],
    "Retraso de cambio (aun no recibido)": [""],
    "Retraso en el reembolso (aun no recibido)": [""],
    "Solicitud de devolucion de pedido (Reembolso o Cambio)": [""],
    "Solicitud de reembolso por entrega express": [""]
  }
};

const COLUMNS = [
  "REF. PEDIDO.",
  "NOMBRE DE CLIENTE",
  "GCIC",
  "ASUNTO",
  "TA",
  "Week",
  "Fecha / Fecha de ingreso de caso",
  "Hora de ingreso de caso",
  "Fecha en que lo vi",
  "Hora en que lo vi",
  "Fecha en que lo respondi",
  "Hora en que lo respondi",
  "ESTADO DEL RECLAMO",
  "Agente",
  "Tipo de Solicitud",
  "Casuistica",
  "OBSERVACIONES",
  "ULTIMO COMENTARIO DEL SELLER",
  "FECHA DE REVISION",
  "SELLER",
  "CANAL DE COMPRA",
  "API / CASILLA"
];

const configs = {
  mktp: { previewLabel: "22 columnas", unusedColumns: [0, 1, 2],     columns: COLUMNS, defaultValues: {} },
  apis: { previewLabel: "22 columnas", unusedColumns: [3, 8, 9, 20], columns: COLUMNS, defaultValues: {} }
};

let activeForm = "mktp";
let validationResolver = null;

/* ---------- Utils ---------- */
const $ = (id) => document.getElementById(id);
function clean(t) { return t ? String(t).replace(/\r?\n|\r/g, " - ").trim() : ""; }
function labelText(field) {
  const l = document.querySelector(`label[for='${field.id}']`);
  return l ? l.textContent.trim() : field.id;
}
function formatTime(h) { return !h ? "" : (h.length === 5 ? `${h}:00` : h); }
function formatDate(iso) {
  if (!iso) return "";
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}
function getWeek(iso) {
  if (!iso) return "";
  const [y,m,d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m-1, d));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil(((dt - yStart) / 86400000 + 1) / 7);
}
function escapeHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

/* ---------- Select default lock ---------- */
function setDefaultState(select, disable) {
  const initial = select.dataset.initialValue ?? "";
  const opt = Array.from(select.options).find((o) => o.value === initial);
  if (opt) opt.disabled = disable;
}
function onSelectChange(e) {
  const s = e.target;
  if (!s || s.tagName !== "SELECT") return;
  if (s.dataset.defaultLocked !== "true" && s.value !== (s.dataset.initialValue ?? "")) {
    s.dataset.defaultLocked = "true";
    setDefaultState(s, true);
  }
}
function initSelectLocks() {
  document.querySelectorAll("select").forEach((s) => {
    if (s.dataset.init === "1") return;
    s.dataset.init = "1";
    s.dataset.initialValue = s.value;
    s.dataset.defaultLocked = "false";
    s.addEventListener("change", onSelectChange);
  });
}
function resetSelectLocks(prefix) {
  document.querySelectorAll(`#view-${prefix} select`).forEach((s) => {
    s.dataset.defaultLocked = "false";
    setDefaultState(s, false);
  });
}

/* ---------- Validation ---------- */
function getMissing() {
  const view = $(`view-${activeForm}`);
  const missing = [];
  view.querySelectorAll("input, select, textarea").forEach((f) => {
    if (f.disabled) return;
    if (String(f.value || "").trim() === "") missing.push(labelText(f));
  });
  return missing;
}
function dt(dId, tId) {
  const d = $(dId).value, t = $(tId).value;
  if (!d || !t) return null;
  return new Date(`${d}T${t}`);
}
function getChronoIssues() {
  const i = [];
  if (activeForm === "mktp") {
    const r = dt("mktp_fecha","mktp_hora_cayo"),
          v = dt("mktp_fecha_vi","mktp_hora_vi"),
          s = dt("mktp_fecha_respondi","mktp_hora_respondi");
    if (r && v && r >= v) i.push("Recibido debe ser anterior a Visto.");
    if (v && s && v >= s) i.push("Visto debe ser anterior a Respondido.");
  } else {
    const r = dt("apis_fecha_ingreso","apis_hora_ingreso"),
          s = dt("apis_fecha_respuesta","apis_hora_respuesta");
    if (r && s && r >= s) i.push("Recibido debe ser anterior a Respondido.");
  }
  return i;
}
function getIssues() {
  return [...getMissing().map((f) => `Falta: ${f}`), ...getChronoIssues()];
}

/* ---------- Modal ---------- */
function closeModal(ok) {
  const m = $("validation-modal");
  m.classList.remove("is-open");
  m.setAttribute("aria-hidden", "true");
  if (validationResolver) { validationResolver(ok); validationResolver = null; }
}
function showModal(issues) {
  const m = $("validation-modal"), list = $("validation-modal-list");
  list.innerHTML = "";
  issues.forEach((i) => {
    const li = document.createElement("li");
    li.textContent = i;
    list.appendChild(li);
  });
  m.classList.add("is-open");
  m.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => $("validation-confirm").focus());
  return new Promise((resolve) => { validationResolver = resolve; });
}

/* ---------- Clipboard ---------- */
function copy(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.top = "-9999px";
    document.body.appendChild(ta); ta.select();
    try {
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error("No se pudo copiar."));
    } catch (e) {
      document.body.removeChild(ta); reject(e);
    }
  });
}

/* ---------- Cascade ---------- */
function setCascade(prefix) {
  const tipo = $(`${prefix}_tipo_solicitud`), cas1 = $(`${prefix}_casuistica1`);
  tipo.innerHTML = '<option value="">—</option>';
  Object.keys(cascadeData).forEach((k) => {
    const o = document.createElement("option");
    o.value = k; o.textContent = k;
    tipo.appendChild(o);
  });
  cas1.innerHTML = '<option value="">—</option>';
  cas1.disabled = true;
  tipo.addEventListener("change", () => updateCascade(prefix));
}
function updateCascade(prefix) {
  const tipo = $(`${prefix}_tipo_solicitud`).value, cas1 = $(`${prefix}_casuistica1`);
  cas1.innerHTML = '<option value="">—</option>';
  if (tipo && cascadeData[tipo]) {
    cas1.disabled = false;
    Object.keys(cascadeData[tipo]).forEach((k) => {
      const o = document.createElement("option");
      o.value = k; o.textContent = k;
      cas1.appendChild(o);
    });
  } else {
    cas1.disabled = true;
    cas1.innerHTML = '<option value="">—</option>';
  }
  updatePreview();
}

/* ---------- Data mapping ---------- */
function mktpData() {
  const fecha = $("mktp_fecha").value;
  return [
    "", "", "",
    clean($("mktp_asunto").value),
    $("mktp_ta").value,
    getWeek(fecha),
    formatDate(fecha),
    formatTime($("mktp_hora_cayo").value),
    formatDate($("mktp_fecha_vi").value),
    formatTime($("mktp_hora_vi").value),
    formatDate($("mktp_fecha_respondi").value),
    formatTime($("mktp_hora_respondi").value),
    $("mktp_estado").value,
    $("mktp_agente").value,
    $("mktp_tipo_solicitud").value,
    $("mktp_casuistica1").value || "",
    clean($("mktp_observacion").value),
    clean($("mktp_ultimo_comentario").value),
    formatDate($("mktp_revision").value),
    $("mktp_seller").value,
    $("mktp_canal_compra").value,
    $("mktp_origen").value
  ];
}
function apisData() {
  const fi = $("apis_fecha_ingreso").value;
  return [
    clean($("apis_ref_pedido").value),
    clean($("apis_nombre_cliente").value),
    $("apis_gcic").value,
    "",
    $("apis_n_caso_gcic").value,
    getWeek(fi),
    formatDate(fi),
    formatTime($("apis_hora_ingreso").value),
    "", "",
    formatDate($("apis_fecha_respuesta").value),
    formatTime($("apis_hora_respuesta").value),
    $("apis_estado_reclamo").value,
    $("apis_agente").value,
    $("apis_tipo_solicitud").value,
    $("apis_casuistica1").value || "",
    clean($("apis_observaciones").value),
    clean($("apis_ultimo_comentario_seller").value),
    formatDate($("apis_fecha_revision").value),
    $("apis_seller").value,
    "",
    $("apis_origen").value
  ];
}
function activeData() { return activeForm === "mktp" ? mktpData() : apisData(); }

/* ---------- Preview ---------- */
function updatePreview() {
  const body = $("preview-body");
  const data = activeData();
  const cfg = configs[activeForm];
  const unused = new Set(cfg.unusedColumns);
  $("preview-mode").textContent = cfg.previewLabel;
  body.innerHTML = "";
  let ok = 0, wait = 0, na = 0;
  const frag = document.createDocumentFragment();
  cfg.columns.forEach((col, i) => {
    const v = data[i] ?? "";
    const isNA = unused.has(i);
    const isE = String(v).trim() === "";
    let cls = "";
    if (isNA) { cls = "row-unused"; na++; }
    else if (isE) { cls = "row-empty"; wait++; }
    else ok++;
    const tr = document.createElement("tr");
    if (cls) tr.className = cls;
    tr.innerHTML = `<td>${String(i+1).padStart(2,"0")}</td><td>${escapeHtml(col)}</td><td>${isNA ? "—" : (isE ? "Pendiente" : escapeHtml(String(v)))}</td>`;
    frag.appendChild(tr);
  });
  body.appendChild(frag);
  $("preview-filled").textContent = ok;
  $("preview-empty").textContent  = wait;
  $("preview-unused").textContent = na;
  const app = ok + wait;
  const pct = app === 0 ? 0 : Math.round((ok / app) * 100);
  $("progress-percent").textContent = pct;
  $("progress-fill").style.width = `${pct}%`;
  $("preview-row").value = data.map((v) => v || "").join(" \\t ");
}

/* ---------- Reset ---------- */
function limpiar() {
  const p = activeForm;
  document.querySelectorAll(`#view-${p} input, #view-${p} select, #view-${p} textarea`).forEach((c) => {
    if (c.tagName === "SELECT") c.selectedIndex = 0;
    else c.value = "";
  });
  updateCascade(p);
  const cas1 = $(`${p}_casuistica1`);
  cas1.innerHTML = '<option value="">—</option>';
  cas1.disabled = true;
  resetSelectLocks(p);
  updatePreview();
}

/* ---------- Copy ---------- */
async function copiar() {
  const btn = $("btn-copiar"), label = btn.querySelector(".btn__label");
  const card = $("preview-card");
  const prevLabel = label ? label.textContent : "Copiar fila";
  const row = activeData().join("\t");
  const issues = getIssues();
  if (issues.length > 0) {
    const ok = await showModal(issues);
    if (!ok) return;
  }
  try {
    await copy(row);
    btn.classList.add("is-copied");
    if (label) label.textContent = "Copiado";
    if (card) { card.classList.remove("is-flash"); void card.offsetWidth; card.classList.add("is-flash"); }
    toast();
    limpiar();
    setTimeout(() => {
      btn.classList.remove("is-copied");
      if (label) label.textContent = prevLabel;
    }, 2000);
  } catch (e) {
    window.alert(`Error al copiar: ${e}`);
  }
}

/* ---------- Toast ---------- */
let toastTimer = null;
function toast() {
  const t = $("toast");
  t.classList.add("is-open");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-open"), 2400);
}

/* ---------- Tabs + pill ---------- */
function updatePill() {
  const seg = document.querySelector(".segmented"), pill = seg.querySelector(".segmented__pill");
  const active = seg.querySelector(".segmented__btn.is-active");
  if (!active) return;
  const sr = seg.getBoundingClientRect(), ar = active.getBoundingClientRect();
  pill.style.width = `${ar.width}px`;
  pill.style.transform = `translateX(${ar.left - sr.left - 3}px)`;
}
function switchTab(view, form) {
  document.querySelectorAll(".segmented__btn").forEach((b) => {
    const on = b.dataset.target === view;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("is-active", v.id === view));
  activeForm = form;
  document.documentElement.dataset.mode = form;
  updatePreview();
  updatePill();
}
function initTabs() {
  $("tab-mktp").addEventListener("click", () => switchTab("view-mktp", "mktp"));
  $("tab-apis").addEventListener("click", () => switchTab("view-apis", "apis"));
  window.addEventListener("resize", updatePill);
}

/* ---------- Live preview + numeric ---------- */
function initLive() {
  document.querySelectorAll("[data-preview='true']").forEach((el) => {
    el.addEventListener("input", updatePreview);
    el.addEventListener("change", updatePreview);
  });
}
function initNumeric() {
  document.querySelectorAll("[data-numeric-only='true']").forEach((i) => {
    i.addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, ""); });
  });
}

/* ---------- Modal wiring ---------- */
function initModal() {
  const m = $("validation-modal");
  $("validation-cancel").addEventListener("click", () => closeModal(false));
  $("validation-confirm").addEventListener("click", () => closeModal(true));
  m.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", () => closeModal(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && m.classList.contains("is-open")) closeModal(false);
  });
}

/* ---------- Theme ---------- */
const THEME_KEY = "cc-min:theme";
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(THEME_KEY, t); } catch (_) {}
}
function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (_) {}
  const dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (dark ? "dark" : "light"));
  $("theme-toggle").addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
}

/* ---------- Shortcut ---------- */
function initShortcut() {
  document.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.shiftKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      copiar();
    }
  });
}

/* ---------- Init ---------- */
function init() {
  initTheme();
  setCascade("mktp");
  setCascade("apis");
  initSelectLocks();
  initNumeric();
  initModal();
  initTabs();
  initLive();
  initShortcut();
  $("btn-copiar").addEventListener("click", copiar);
  $("btn-limpiar").addEventListener("click", limpiar);
  updatePreview();
  requestAnimationFrame(updatePill);
}
document.addEventListener("DOMContentLoaded", init);
