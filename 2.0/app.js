/* =========================================================
   Central de Casos — Application Logic
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
  mktp: {
    previewLabel: "UNIFICADO · 22 columnas",
    defaultValues: {},
    unusedColumns: [0, 1, 2],
    columns: COLUMNS
  },
  apis: {
    previewLabel: "UNIFICADO · 22 columnas",
    defaultValues: {},
    unusedColumns: [3, 8, 9, 20],
    columns: COLUMNS
  }
};

const RING_CIRCUMFERENCE = 2 * Math.PI * 52; // r=52 in SVG

let activeForm = "mktp";
let validationModalResolver = null;

/* ---------- Utils ---------- */
function limpiarTextoParaExcel(texto) {
  if (!texto) return "";
  return String(texto).replace(/\r?\n|\r/g, " - ").trim();
}
function sanitizeNumericInput(event) {
  event.target.value = event.target.value.replace(/\D/g, "");
}
function getFieldLabel(field) {
  const label = document.querySelector(`label[for='${field.id}']`);
  return label ? label.textContent.trim() : field.id;
}
function formatearHora(hora) {
  if (!hora) return "";
  return hora.length === 5 ? `${hora}:00` : hora;
}
function formatearFechaLatina(fechaIso) {
  if (!fechaIso) return "";
  const partes = fechaIso.split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fechaIso;
}
function obtenerSemana(fechaString) {
  if (!fechaString) return "";
  const [y, m, d] = fechaString.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

/* ---------- Select default lock ---------- */
function setSelectDefaultState(select, disableDefaultOption) {
  const initialValue = select.dataset.initialValue ?? "";
  const defaultOption = Array.from(select.options).find((opt) => opt.value === initialValue);
  if (defaultOption) defaultOption.disabled = disableDefaultOption;
}
function lockSelectDefaultAfterChange(event) {
  const select = event.target;
  if (!select || select.tagName !== "SELECT") return;
  const initialValue = select.dataset.initialValue ?? "";
  const locked = select.dataset.defaultLocked === "true";
  if (!locked && select.value !== initialValue) {
    select.dataset.defaultLocked = "true";
    setSelectDefaultState(select, true);
  }
}
function initSelectDefaultLocks() {
  document.querySelectorAll("select").forEach((select) => {
    if (select.dataset.initializedDefaultLock === "true") return;
    select.dataset.initializedDefaultLock = "true";
    select.dataset.initialValue = select.value;
    select.dataset.defaultLocked = "false";
    select.addEventListener("change", lockSelectDefaultAfterChange);
  });
}
function resetSelectDefaultLocks(prefix) {
  document.querySelectorAll(`#view-${prefix} select`).forEach((select) => {
    select.dataset.defaultLocked = "false";
    setSelectDefaultState(select, false);
  });
}

/* ---------- Validation ---------- */
function getMissingActiveFormFields() {
  const activeView = document.getElementById(`view-${activeForm}`);
  const missing = [];
  activeView.querySelectorAll("input, select, textarea").forEach((field) => {
    if (field.disabled || field.type === "button" || field.type === "submit") return;
    if (String(field.value || "").trim() === "") missing.push(getFieldLabel(field));
  });
  return missing;
}
function getDateTimeValue(dateId, timeId) {
  const dateValue = document.getElementById(dateId).value;
  const timeValue = document.getElementById(timeId).value;
  if (!dateValue || !timeValue) return null;
  return new Date(`${dateValue}T${timeValue}`);
}
function getChronologyValidationIssues() {
  const issues = [];
  if (activeForm === "mktp") {
    const recibido = getDateTimeValue("mktp_fecha", "mktp_hora_cayo");
    const visto = getDateTimeValue("mktp_fecha_vi", "mktp_hora_vi");
    const respondido = getDateTimeValue("mktp_fecha_respondi", "mktp_hora_respondi");
    if (recibido && visto && recibido >= visto) issues.push("La fecha y hora de recibido debe ser anterior a la fecha y hora en que lo vi.");
    if (visto && respondido && visto >= respondido) issues.push("La fecha y hora en que lo vi debe ser anterior a la fecha y hora en que lo respondi.");
  }
  if (activeForm === "apis") {
    const recibido = getDateTimeValue("apis_fecha_ingreso", "apis_hora_ingreso");
    const respondido = getDateTimeValue("apis_fecha_respuesta", "apis_hora_respuesta");
    if (recibido && respondido && recibido >= respondido) issues.push("La fecha y hora de recibido debe ser anterior a la fecha y hora en que lo respondi.");
  }
  return issues;
}
function getActiveFormValidationIssues() {
  const missing = getMissingActiveFormFields().map((f) => `Falta completar: ${f}`);
  return [...missing, ...getChronologyValidationIssues()];
}

/* ---------- Modal ---------- */
function closeValidationModal(shouldContinue) {
  const modal = document.getElementById("validation-modal");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  if (validationModalResolver) {
    validationModalResolver(shouldContinue);
    validationModalResolver = null;
  }
}
function showValidationModal(issues) {
  const modal = document.getElementById("validation-modal");
  const list = document.getElementById("validation-modal-list");
  const confirmBtn = document.getElementById("validation-confirm");
  list.innerHTML = "";
  issues.forEach((issue) => {
    const li = document.createElement("li");
    li.textContent = issue;
    list.appendChild(li);
  });
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => confirmBtn.focus());
  return new Promise((resolve) => { validationModalResolver = resolve; });
}

/* ---------- Clipboard ---------- */
function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try {
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (!ok) reject(new Error("No se pudo copiar."));
      else resolve();
    } catch (err) {
      document.body.removeChild(ta);
      reject(err);
    }
  });
}

/* ---------- Cascade ---------- */
function setCascadeOptions(prefix) {
  const tipo = document.getElementById(`${prefix}_tipo_solicitud`);
  const cas1 = document.getElementById(`${prefix}_casuistica1`);
  tipo.innerHTML = '<option value="">Seleccionar tipo…</option>';
  Object.keys(cascadeData).forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item; opt.textContent = item;
    tipo.appendChild(opt);
  });
  cas1.innerHTML = '<option value="">Primero seleccione tipo…</option>';
  cas1.disabled = true;
  tipo.addEventListener("change", () => updateCasuistica1(prefix));
}
function updateCasuistica1(prefix) {
  const tipo = document.getElementById(`${prefix}_tipo_solicitud`).value;
  const cas1 = document.getElementById(`${prefix}_casuistica1`);
  cas1.innerHTML = '<option value="">Seleccionar casuística…</option>';
  if (tipo && cascadeData[tipo]) {
    cas1.disabled = false;
    Object.keys(cascadeData[tipo]).forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat; opt.textContent = cat;
      cas1.appendChild(opt);
    });
  } else {
    cas1.disabled = true;
    cas1.innerHTML = '<option value="">Primero seleccione tipo…</option>';
  }
  actualizarPreview();
}
function getCasuistica(prefix) {
  return document.getElementById(`${prefix}_casuistica1`).value || "";
}

/* ---------- Data mapping ---------- */
function getMktpData() {
  const fecha = document.getElementById("mktp_fecha").value;
  return [
    "", "", "",
    limpiarTextoParaExcel(document.getElementById("mktp_asunto").value),
    document.getElementById("mktp_ta").value,
    obtenerSemana(fecha),
    formatearFechaLatina(fecha),
    formatearHora(document.getElementById("mktp_hora_cayo").value),
    formatearFechaLatina(document.getElementById("mktp_fecha_vi").value),
    formatearHora(document.getElementById("mktp_hora_vi").value),
    formatearFechaLatina(document.getElementById("mktp_fecha_respondi").value),
    formatearHora(document.getElementById("mktp_hora_respondi").value),
    document.getElementById("mktp_estado").value,
    document.getElementById("mktp_agente").value,
    document.getElementById("mktp_tipo_solicitud").value,
    getCasuistica("mktp"),
    limpiarTextoParaExcel(document.getElementById("mktp_observacion").value),
    limpiarTextoParaExcel(document.getElementById("mktp_ultimo_comentario").value),
    formatearFechaLatina(document.getElementById("mktp_revision").value),
    document.getElementById("mktp_seller").value,
    document.getElementById("mktp_canal_compra").value,
    document.getElementById("mktp_origen").value
  ];
}
function getApisData() {
  const fechaIngreso = document.getElementById("apis_fecha_ingreso").value;
  return [
    limpiarTextoParaExcel(document.getElementById("apis_ref_pedido").value),
    limpiarTextoParaExcel(document.getElementById("apis_nombre_cliente").value),
    document.getElementById("apis_gcic").value,
    "",
    document.getElementById("apis_n_caso_gcic").value,
    obtenerSemana(fechaIngreso),
    formatearFechaLatina(fechaIngreso),
    formatearHora(document.getElementById("apis_hora_ingreso").value),
    "", "",
    formatearFechaLatina(document.getElementById("apis_fecha_respuesta").value),
    formatearHora(document.getElementById("apis_hora_respuesta").value),
    document.getElementById("apis_estado_reclamo").value,
    document.getElementById("apis_agente").value,
    document.getElementById("apis_tipo_solicitud").value,
    getCasuistica("apis"),
    limpiarTextoParaExcel(document.getElementById("apis_observaciones").value),
    limpiarTextoParaExcel(document.getElementById("apis_ultimo_comentario_seller").value),
    formatearFechaLatina(document.getElementById("apis_fecha_revision").value),
    document.getElementById("apis_seller").value,
    "",
    document.getElementById("apis_origen").value
  ];
}
function getActiveData() {
  return activeForm === "mktp" ? getMktpData() : getApisData();
}

/* ---------- Preview + progress ---------- */
function actualizarPreview() {
  const body = document.getElementById("preview-body");
  const modeEl = document.getElementById("preview-mode");
  const filledEl = document.getElementById("preview-filled");
  const emptyEl = document.getElementById("preview-empty");
  const unusedEl = document.getElementById("preview-unused");
  const rowEl = document.getElementById("preview-row");
  const ringEl = document.getElementById("progress-ring");
  const percentEl = document.getElementById("progress-percent");

  const data = getActiveData();
  const cfg = configs[activeForm];
  const unusedSet = new Set(cfg.unusedColumns || []);

  modeEl.textContent = cfg.previewLabel;
  body.innerHTML = "";

  let filled = 0, pending = 0, unused = 0;

  const frag = document.createDocumentFragment();
  cfg.columns.forEach((colName, index) => {
    const value = data[index] ?? "";
    const isUnused = unusedSet.has(index);
    const isEmpty = String(value).trim() === "";
    let cls = "";
    if (isUnused) { cls = "row-unused"; unused++; }
    else if (isEmpty) { cls = "row-empty"; pending++; }
    else filled++;

    const tr = document.createElement("tr");
    if (cls) tr.className = cls;
    tr.innerHTML = `
      <td>${String(index + 1).padStart(2, "0")}</td>
      <td>${colName}</td>
      <td>${isUnused ? "No aplica" : (isEmpty ? "Pendiente" : escapeHtml(String(value)))}</td>
    `;
    frag.appendChild(tr);
  });
  body.appendChild(frag);

  filledEl.textContent = filled;
  emptyEl.textContent = pending;
  unusedEl.textContent = unused;

  const applicable = filled + pending;
  const percent = applicable === 0 ? 0 : Math.round((filled / applicable) * 100);
  percentEl.textContent = `${percent}%`;
  const offset = RING_CIRCUMFERENCE * (1 - percent / 100);
  ringEl.style.strokeDashoffset = offset;

  rowEl.value = data.map((v) => v || "").join(" \\t ");
}
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- Reset form ---------- */
function limpiarFormularioActivo() {
  const prefix = activeForm;
  document.querySelectorAll(`#view-${prefix} input, #view-${prefix} select, #view-${prefix} textarea`).forEach((campo) => {
    if (campo.tagName === "SELECT") campo.selectedIndex = 0;
    else campo.value = "";
  });
  Object.entries(configs[prefix].defaultValues).forEach(([id, val]) => {
    document.getElementById(id).value = val;
  });
  updateCasuistica1(prefix);
  const cas1 = document.getElementById(`${prefix}_casuistica1`);
  cas1.innerHTML = '<option value="">Primero seleccione tipo…</option>';
  cas1.disabled = true;
  resetSelectDefaultLocks(prefix);
  actualizarPreview();
}

/* ---------- Copy ---------- */
async function copiarFila() {
  const btn = document.getElementById("btn-copiar");
  const label = btn.querySelector(".btn__label");
  const previewCard = document.getElementById("preview-card");
  const previousText = label ? label.textContent : "Copiar fila para Excel";
  const fila = getActiveData().join("\t");
  const issues = getActiveFormValidationIssues();

  if (issues.length > 0) {
    const shouldContinue = await showValidationModal(issues);
    if (!shouldContinue) return;
  }

  try {
    await copyTextToClipboard(fila);
    btn.classList.add("is-copied");
    if (label) label.textContent = "Copiado";
    if (previewCard) {
      previewCard.classList.remove("copy-flash");
      void previewCard.offsetWidth;
      previewCard.classList.add("copy-flash");
    }
    showToast();
    limpiarFormularioActivo();
    setTimeout(() => {
      btn.classList.remove("is-copied");
      if (label) label.textContent = previousText;
    }, 2200);
  } catch (err) {
    window.alert(`Hubo un error al copiar los datos: ${err}`);
  }
}

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast() {
  const toast = document.getElementById("toast");
  toast.classList.add("is-open");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-open"), 3200);
}

/* ---------- Tabs ---------- */
function switchTab(targetView, targetForm) {
  document.querySelectorAll(".mode-switch__btn").forEach((btn) => {
    const active = btn.dataset.target === targetView;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".form-view").forEach((view) => {
    view.classList.toggle("is-active", view.id === targetView);
  });
  document.querySelector(".mode-switch").dataset.active = targetForm;
  activeForm = targetForm;
  document.documentElement.dataset.mode = targetForm;
  actualizarPreview();
}
function initTabs() {
  document.querySelector(".mode-switch").dataset.active = "mktp";
  document.getElementById("tab-mktp").addEventListener("click", () => switchTab("view-mktp", "mktp"));
  document.getElementById("tab-apis").addEventListener("click", () => switchTab("view-apis", "apis"));
}

/* ---------- Live preview + numeric ---------- */
function initLivePreview() {
  document.querySelectorAll("[data-preview='true']").forEach((el) => {
    el.addEventListener("input", actualizarPreview);
    el.addEventListener("change", actualizarPreview);
  });
}
function initNumericOnlyInputs() {
  document.querySelectorAll("[data-numeric-only='true']").forEach((input) => {
    input.addEventListener("input", sanitizeNumericInput);
  });
}

/* ---------- Validation modal wiring ---------- */
function initValidationModal() {
  const modal = document.getElementById("validation-modal");
  document.getElementById("validation-cancel").addEventListener("click", () => closeValidationModal(false));
  document.getElementById("validation-confirm").addEventListener("click", () => closeValidationModal(true));
  modal.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", () => closeValidationModal(false));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeValidationModal(false);
  });
}

/* ---------- Theme ---------- */
const THEME_KEY = "cc:theme";
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
}
function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (_) {}
  const preferDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = saved || (preferDark ? "dark" : "light");
  applyTheme(initial);
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
  });
}

/* ---------- Progress ring setup ---------- */
function initProgressRing() {
  const ring = document.getElementById("progress-ring");
  ring.style.strokeDasharray = RING_CIRCUMFERENCE;
  ring.style.strokeDashoffset = RING_CIRCUMFERENCE;
}

/* ---------- Init ---------- */
function init() {
  initTheme();
  setCascadeOptions("mktp");
  setCascadeOptions("apis");
  initSelectDefaultLocks();
  initNumericOnlyInputs();
  initValidationModal();
  initTabs();
  initLivePreview();
  initProgressRing();
  document.getElementById("btn-copiar").addEventListener("click", copiarFila);
  document.getElementById("btn-limpiar").addEventListener("click", limpiarFormularioActivo);
  actualizarPreview();
}

document.addEventListener("DOMContentLoaded", init);
