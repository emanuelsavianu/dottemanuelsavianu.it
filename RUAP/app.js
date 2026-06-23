// ====================================================
// 1. COSTANTI E CONFIGURAZIONE
// ====================================================
const STORAGE_DOCTORS = 'ruap-turni-medici';
const STORAGE_ASSIGNMENTS = 'ruap-turni-assegnazioni';
const STORAGE_HISTORY = 'ruap-turni-history';
const STORAGE_VERSION_KEY = 'ruap-storage-version';
const STORAGE_PLACES = 'ruap-places';
const STORAGE_SLOTS = 'ruap-slots';
const STORAGE_DARK_MODE = 'ruap-dark-mode';
const STORAGE_VERSION = 2;
const HISTORY_MAX = 50;

const DAY_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
const DAY_KEYS  = ['lun', 'mar', 'mer', 'gio', 'ven'];

let PLACES = (typeof CONFIG !== 'undefined' && CONFIG.places) ? [...CONFIG.places] : ['M.S.Savino', 'Subbiano'];
let SLOTS = (typeof CONFIG !== 'undefined' && CONFIG.slots) ? CONFIG.slots : [
  { key: 'mat', label: '08:00–14:00', hours: 6, icon: '🌅' },
  { key: 'pom', label: '14:00–20:00', hours: 6, icon: '🌆' },
];

const DROPDOWN_HEIGHT = 350;
const DROPDOWN_WIDTH  = 320;
const MONTHLY_WEEKS = 4;

const EXTERNAL_PREFIX = '__ext__::';
const MS_PER_DAY = 86400 * 1000;
const EXCEL_EPOCH_OFFSET = 25569;

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const COLOR_PALETTE = [
  { bg: 'bg-blue-500',   text: 'text-white', hex: '#3b82f6',  label: 'Blu' },
  { bg: 'bg-green-500',  text: 'text-white', hex: '#22c55e',  label: 'Verde' },
  { bg: 'bg-purple-500', text: 'text-white', hex: '#a855f7',  label: 'Viola' },
  { bg: 'bg-rose-500',   text: 'text-white', hex: '#f43f5e',  label: 'Rosa' },
  { bg: 'bg-amber-500',  text: 'text-white', hex: '#f59e0b',  label: 'Ambra' },
  { bg: 'bg-teal-500',   text: 'text-white', hex: '#14b8a6',  label: 'Teal' },
  { bg: 'bg-orange-500', text: 'text-white', hex: '#f97316',  label: 'Arancio' },
  { bg: 'bg-cyan-600',   text: 'text-white', hex: '#0891b2',  label: 'Ciano' },
  { bg: 'bg-indigo-500', text: 'text-white', hex: '#6366f1',  label: 'Indaco' },
  { bg: 'bg-pink-500',   text: 'text-white', hex: '#ec4899',  label: 'Rosa Scuro' },
  { bg: 'bg-lime-500',   text: 'text-white', hex: '#84cc16',  label: 'Lime' },
  { bg: 'bg-emerald-500',text: 'text-white', hex: '#10b981',  label: 'Smeraldo' },
  { bg: 'bg-sky-500',    text: 'text-white', hex: '#0ea5e9',  label: 'Sky' },
  { bg: 'bg-violet-500', text: 'text-white', hex: '#8b5cf6',  label: 'ViolaChiaro' },
  { bg: 'bg-fuchsia-500',text: 'text-white', hex: '#d946ef',  label: 'Fucsia' },
  { bg: 'bg-rose-700',   text: 'text-white', hex: '#be123c',  label: 'Rosso' },
];

// ====================================================
// 2. STATE & HISTORY
// ====================================================
let state = {
  doctors: [],
  assignments: {},
  places: [],
  slots: [],
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  sidebarWeekStart: getWeekStart(new Date()),
  editingDoctorId: null,
  activeSlotKey: null,
  calendarView: 'monthly',
  calendarWeekStart: getWeekStart(new Date()),
};

let historyStack = [];
let historyIndex = -1;
let isProcessing = false;

// ====================================================
// 3. DOMAIN HELPERS (pure — no DOM access)
// ====================================================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function cleanDoctorName(name) {
  return name.replace(/^Dott\.\s*/i, '');
}

function excelDateToDate(excelDate) {
  if (typeof excelDate === 'number') {
    const utcDays = excelDate - EXCEL_EPOCH_OFFSET;
    const utcValue = utcDays * MS_PER_DAY;
    return new Date(utcValue);
  }
  if (typeof excelDate === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(excelDate)) return new Date(excelDate + 'T00:00:00');
    if (/\//.test(excelDate)) {
      const parts = excelDate.split('/');
      if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(excelDate);
  }
  if (excelDate instanceof Date && !isNaN(excelDate)) return excelDate;
  return null;
}

function getEasterDate(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getEasterMondayDate(year) {
  const easter = getEasterDate(year);
  return new Date(easter.getTime() + MS_PER_DAY);
}

function isItalianHoliday(date) {
  const d = date.getDate(), m = date.getMonth(), y = date.getFullYear();
  if (m === 0 && d === 1) return true;
  if (m === 0 && d === 6) return true;
  if (m === 3 && d === 25) return true;
  if (m === 4 && d === 1) return true;
  if (m === 5 && d === 2) return true;
  if (m === 5 && d === 24) return true;
  if (m === 7 && d === 15) return true;
  if (m === 10 && d === 1) return true;
  if (m === 11 && d === 8) return true;
  if (m === 11 && d === 25) return true;
  if (m === 11 && d === 26) return true;
  const easter = getEasterDate(y);
  const easterMon = getEasterMondayDate(y);
  if (date.getTime() === easter.getTime()) return true;
  if (date.getTime() === easterMon.getTime()) return true;
  return false;
}

function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateShort(date) {
  return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
}

function isDoctorUnavailable(doctor, dateKey) {
  if (!doctor.unavailPeriods || doctor.unavailPeriods.length === 0) return false;
  const d = new Date(dateKey + 'T00:00:00');
  return doctor.unavailPeriods.some(p => {
    const from = new Date(p.from + 'T00:00:00');
    const to = new Date(p.to + 'T00:00:00');
    return d >= from && d <= to;
  });
}

function isDoctorAvailableForSlot(doctor, dateKey, slotKey) {
  if (!doctor.availability) return false;
  if (isDoctorUnavailable(doctor, dateKey)) return false;
  const d = new Date(dateKey + 'T00:00:00');
  if (d.getDay() === 0 || d.getDay() === 6) return false;
  if (isItalianHoliday(d)) return false;
  const dayMap = { 1: 'lun', 2: 'mar', 3: 'mer', 4: 'gio', 5: 'ven' };
  const dayKey = dayMap[d.getDay()];
  if (!dayKey) return false;
  const avail = doctor.availability[dayKey];
  if (!avail) return false;
  return avail[slotKey] === true;
}

function getDoctorById(id) {
  return state.doctors.find(d => d.id === id);
}

function calculateDebtByPatients(patients) {
  if (!patients || patients < 0) return 38;
  if (patients <= 400) return 38;
  if (patients <= 1000) return 24;
  if (patients <= 1200) return 12;
  if (patients <= 1500) return 6;
  return 0;
}

function getDoctorColor(doctor) {
  return COLOR_PALETTE[doctor.colorIndex ?? 0] || COLOR_PALETTE[0];
}

function getDefaultDoctors() {
  if (typeof CONFIG === 'undefined' || !CONFIG.doctors) return [];
  return CONFIG.doctors.map(d => ({
    ...d,
    availability: d.availability ? JSON.parse(JSON.stringify(d.availability)) : Object.fromEntries(
      DAY_KEYS.map(k => [k, { mat: true, pom: true }])
    ),
    unavailPeriods: d.unavailPeriods ? JSON.parse(JSON.stringify(d.unavailPeriods)) : [],
  }));
}

function getWeeklyAssignedHours(doctorId, weekStart) {
  let hours = 0;
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dk = toDateKey(d);
    hours += sumSlotHours((slot, place) => state.assignments[`${dk}_${slot.key}_${place}`] === doctorId);
  }
  return hours;
}

function getAssignedHoursInMonth(docId, month, year) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  let hours = 0;
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dk = toDateKey(d);
    hours += sumSlotHours((slot, place) => state.assignments[`${dk}_${slot.key}_${place}`] === docId);
  }
  return hours;
}

function sumSlotHours(predicate) {
  let hours = 0;
  SLOTS.forEach(slot => {
    PLACES.forEach(place => {
      if (predicate(slot, place)) hours += slot.hours;
    });
  });
  return hours;
}

function getMonthlyBudget(doctor) {
  if (doctor.monthlyBudget != null) return doctor.monthlyBudget;
  return (doctor.weeklyHours || 38) * MONTHLY_WEEKS;
}

function getRemainingMonthlyHours(doctor, month, year) {
  return Math.max(0, getMonthlyBudget(doctor) - getAssignedHoursInMonth(doctor.id, month, year));
}

function getProgressBarData(assigned, debt) {
  const pct = debt > 0 ? Math.min(100, Math.round((assigned / debt) * 100)) : 0;
  const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';
  return { pct, barColor };
}

// ====================================================
// 4. STORAGE LAYER
// ====================================================
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_DOCTORS, JSON.stringify(state.doctors));
    localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(state.assignments));
    localStorage.setItem(STORAGE_PLACES, JSON.stringify(state.places));
    localStorage.setItem(STORAGE_SLOTS, JSON.stringify(state.slots));
  } catch (e) {
    toast('Errore salvataggio: ' + e.message, 'error');
    console.error(e);
  }
}

function loadFromStorage() {
  try {
    const docs = localStorage.getItem(STORAGE_DOCTORS);
    const asgn = localStorage.getItem(STORAGE_ASSIGNMENTS);
    const plcs = localStorage.getItem(STORAGE_PLACES);
    const slts = localStorage.getItem(STORAGE_SLOTS);
    if (docs) state.doctors = JSON.parse(docs);
    if (asgn) state.assignments = JSON.parse(asgn);
    if (plcs) state.places = JSON.parse(plcs);
    if (slts) state.slots = JSON.parse(slts);
  } catch (e) { console.error(e); }
}

function reloadPlaces() {
  if (state.places && state.places.length > 0) {
    PLACES = [...state.places];
  } else if (typeof CONFIG !== 'undefined' && CONFIG.places) {
    PLACES = [...CONFIG.places];
  } else {
    PLACES = ['M.S.Savino', 'Subbiano'];
  }
}

function reloadSlots() {
  if (state.slots && state.slots.length > 0) {
    SLOTS = [...state.slots];
  } else if (typeof CONFIG !== 'undefined' && CONFIG.slots) {
    SLOTS = CONFIG.slots.map(s => ({ ...s }));
  } else {
    SLOTS = [
      { key: 'mat', label: '08:00–14:00', hours: 6, icon: '🌅' },
      { key: 'pom', label: '14:00–20:00', hours: 6, icon: '🌆' },
    ];
  }
}

function updateHeaderSubtitle() {
  const el = document.getElementById('header-subtitle');
  if (el) el.textContent = 'Attività Diurne — ' + PLACES.join(' · ');
}

function initDarkMode() {
  const enabled = localStorage.getItem(STORAGE_DARK_MODE) === 'true';
  if (enabled) document.documentElement.classList.add('dark');
}

function toggleDarkMode() {
  const html = document.documentElement;
  html.classList.toggle('dark');
  localStorage.setItem(STORAGE_DARK_MODE, html.classList.contains('dark') ? 'true' : 'false');
}

function loadHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_HISTORY);
    if (saved) {
      const data = JSON.parse(saved);
      historyStack = data.stack || [];
      historyIndex = data.index || -1;
    }
  } catch (e) { console.error(e); }
}

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify({ stack: historyStack, index: historyIndex }));
  } catch (e) { console.error(e); }
}

function pushHistory() {
  const snapshot = JSON.stringify({ assignments: state.assignments });
  if (historyIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyIndex + 1);
  }
  historyStack.push(snapshot);
  if (historyStack.length > HISTORY_MAX) {
    historyStack.shift();
  } else {
    historyIndex++;
  }
  saveHistory();
  updateUndoRedoButtons();
}

// ====================================================
// 5. STATE ACTIONS
// ====================================================
function assignDoctor(slotKey, docId) {
  pushHistory();
  state.assignments[slotKey] = docId;
  saveToStorage();
  closeAssignDropdown();
  renderAll();
}

function removeAssignment(slotKey) {
  pushHistory();
  delete state.assignments[slotKey];
  saveToStorage();
  closeAssignDropdown();
  renderAll();
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  state.assignments = JSON.parse(historyStack[historyIndex]);
  saveToStorage();
  renderAll();
  updateUndoRedoButtons();
}

function redo() {
  if (historyIndex >= historyStack.length - 1) return;
  historyIndex++;
  state.assignments = JSON.parse(historyStack[historyIndex]);
  saveToStorage();
  renderAll();
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');
  if (undoBtn) {
    undoBtn.classList.toggle('opacity-30', historyIndex <= 0);
    undoBtn.classList.toggle('pointer-events-none', historyIndex <= 0);
  }
  if (redoBtn) {
    redoBtn.classList.toggle('opacity-30', historyIndex >= historyStack.length - 1);
    redoBtn.classList.toggle('pointer-events-none', historyIndex >= historyStack.length - 1);
  }
}

// ====================================================
// 6. DOM HELPERS
// ====================================================
function el(id) { return document.getElementById(id); }

function toast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const colors = { info: 'bg-slate-800', success: 'bg-green-600', warning: 'bg-amber-500', error: 'bg-red-500' };
  const toastEl = document.createElement('div');
  toastEl.className = `toast-item ${colors[type] || colors.info} text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all duration-300`;
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
  toastEl.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toastEl);
  requestAnimationFrame(() => { toastEl.style.opacity = '1'; toastEl.style.transform = 'translateY(0)'; });
  setTimeout(() => { toastEl.style.opacity = '0'; toastEl.style.transform = 'translateY(-10px)'; setTimeout(() => toastEl.remove(), 300); }, duration);
}

// ====================================================
// 7. RENDERING
// ====================================================
function renderSidebar() {
  const container = document.getElementById('sidebar-doctors');
  if (!container) return;
  const filtered = filterDoctors();
  container.innerHTML = filtered.map(doc => {
    const color = getDoctorColor(doc);
    const weeklyH = getWeeklyAssignedHours(doc.id, state.sidebarWeekStart);
    const { pct, barColor } = getProgressBarData(weeklyH, doc.weeklyHours || 24);
    const monthH = getAssignedHoursInMonth(doc.id, state.calMonth, state.calYear);
    const budget = getMonthlyBudget(doc);
    const remH = Math.max(0, budget - monthH);
    return `
      <div class="doctor-card bg-white rounded-xl shadow-sm border border-slate-200 p-3 cursor-pointer hover:shadow-md transition-shadow" onclick="openDoctorModal('${doc.id}')" title="Click per modificare">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="w-3 h-3 rounded-full flex-shrink-0" style="background:${color.hex}"></span>
          <span class="font-semibold text-sm text-slate-800 truncate">${cleanDoctorName(doc.name)}</span>
          <span class="text-[10px] text-slate-400 ml-auto">${remH}h residue</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="flex-1 h-1.5 bg-slate-100 rounded-full">
            <div style="width:${pct}%; background:${barColor}" class="h-1.5 rounded-full transition-all"></div>
          </div>
          <span class="text-[10px] text-slate-400 flex-shrink-0">${weeklyH}/${doc.weeklyHours || 24}h</span>
        </div>
      </div>`;
  }).join('');
  updateConflictsHeaderBadge();
}

function filterDoctors() {
  let filtered = state.doctors;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(d => d.name.toLowerCase().includes(q) || (d.preferredPlace && d.preferredPlace.toLowerCase().includes(q)));
  }
  if (filterAFT) {
    if (filterAFT === 'none') {
      filtered = filtered.filter(d => !d.aft || d.aft === '');
    } else {
      filtered = filtered.filter(d => d.aft === filterAFT);
    }
  }
  return filtered;
}

function getCoverageBadge(dateKey, place) {
  const matKey = `${dateKey}_mat_${place}`;
  const pomKey = `${dateKey}_pom_${place}`;
  const matAssigned = !!state.assignments[matKey];
  const pomAssigned = !!state.assignments[pomKey];
  const bothAssigned = matAssigned && pomAssigned;
  return {
    coverageClass: bothAssigned ? 'bg-green-100 text-green-700' : (matAssigned || pomAssigned) ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700',
    coverageIcon: bothAssigned ? '✓' : (matAssigned || pomAssigned) ? '◐' : '○',
  };
}

function createSlotButton(dateKey, place, slot, inMonth) {
  const slotKey = `${dateKey}_${slot.key}_${place}`;
  const assignedId = state.assignments[slotKey];
  const isExt = assignedId && typeof assignedId === 'string' && assignedId.startsWith(EXTERNAL_PREFIX);
  const assignedDoc = !isExt && assignedId ? getDoctorById(assignedId) : null;
  const extName = isExt ? assignedId.replace(EXTERNAL_PREFIX, '') : null;
  const color = assignedDoc ? getDoctorColor(assignedDoc) : (extName ? { hex: '#d97706' } : null);
  const displayName = assignedDoc ? cleanDoctorName(assignedDoc.name) : extName;

  const slotBtn = document.createElement('button');
  slotBtn.className = 'slot-btn w-full text-left rounded-lg px-2 py-1.5 mb-1 text-xs font-medium border transition-all ' +
    (displayName ? 'border-transparent text-white shadow-sm' : inMonth ? 'border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-brand-400 hover:bg-blue-50 hover:text-brand-700' : 'border-transparent bg-transparent cursor-default');
  if (color && displayName) slotBtn.style.backgroundColor = color.hex;

  slotBtn.innerHTML = displayName
    ? `<div class="truncate font-semibold text-xs">${displayName}</div><div class="text-[10px] opacity-80">${slot.icon} ${slot.label}</div>`
    : `<div class="text-slate-400 text-xs">${slot.icon} <span class="text-slate-400">Assegna</span></div>`;
  slotBtn.setAttribute('aria-label', displayName ? `${displayName} · ${place} · ${slot.label}` : `Assegna turno · ${place} · ${slot.label}`);

  if (inMonth) slotBtn.addEventListener('click', (e) => openAssignDropdown(e, slotKey, slot, dateKey, place));
  return slotBtn;
}

function renderCalendar() {
  if (state.calendarView === 'weekly') {
    renderCalendarWeek();
  } else {
    renderCalendarMonth();
  }
}

function renderCalendarWeek() {
  const weekStart = state.calendarWeekStart;
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 4);
  const container = document.getElementById('calendar-grid');
  if (!container) return;
  container.className = 'grid grid-cols-5 gap-2';
  container.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateKey = toDateKey(d);
    const isHoliday = isItalianHoliday(d);
    const cell = document.createElement('div');
    cell.className = `rounded-xl border border-slate-200 p-2 ${isHoliday ? 'holiday-cell' : 'bg-white'}`;
    const dayName = DAY_NAMES[i];
    const dayNum = d.getDate();
    cell.innerHTML = `<div class="text-xs font-bold text-slate-500 mb-1 pb-1 border-b border-slate-100 flex items-center justify-between">
      <span>${dayName} ${dayNum}</span>
      ${isHoliday ? '<span class="text-[10px] text-red-500 font-bold">FESTIVO</span>' : ''}
    </div>`;
    PLACES.forEach(place => {
      const { coverageClass, coverageIcon } = getCoverageBadge(dateKey, place);
      const placeDiv = document.createElement('div');
      placeDiv.className = 'mb-1';
      placeDiv.innerHTML = `<div class="flex items-center gap-1 mb-0.5"><span class="text-[10px] font-semibold text-slate-500 flex-1 truncate">${place}</span><span class="text-[10px] font-bold px-1 rounded ${coverageClass}">${coverageIcon}</span></div>`;
      SLOTS.forEach(slot => {
        placeDiv.appendChild(createSlotButton(dateKey, place, slot, true));
      });
      cell.appendChild(placeDiv);
    });
    container.appendChild(cell);
  }
}

function renderCalendarMonth() {
  const year = state.calYear;
  const month = state.calMonth;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const container = document.getElementById('calendar-grid');
  if (!container) return;
  container.innerHTML = '';
  container.className = 'grid grid-cols-5 gap-1';
  const totalCells = Math.ceil((lastDay + startOffset) / 5) * 5;
  for (let cellIdx = 0; cellIdx < totalCells; cellIdx++) {
    const day = cellIdx - startOffset + 1;
    const cell = document.createElement('div');
    const inMonth = day >= 1 && day <= lastDay;
    cell.className = `rounded-lg border ${!inMonth ? 'border-transparent bg-transparent' : 'border-slate-200 bg-white'} p-1.5 min-h-[60px]`;
    if (inMonth) {
      const d = new Date(year, month, day);
      const dateKey = toDateKey(d);
      const isHoliday = isItalianHoliday(d);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      if (isHoliday || isWeekend) cell.classList.add('holiday-cell');
      cell.innerHTML = `<div class="text-[10px] font-bold text-slate-400 mb-0.5 pb-0.5 border-b border-slate-100 flex items-center justify-between">
        <span>${day}</span>
        ${isHoliday ? '<span class="text-[8px] text-red-500 font-bold">FESTIVO</span>' : ''}
      </div>`;
      PLACES.forEach(place => {
        const { coverageClass, coverageIcon } = getCoverageBadge(dateKey, place);
        const placeDiv = document.createElement('div');
        placeDiv.className = 'mb-0.5';
        placeDiv.innerHTML = `<div class="flex items-center gap-1 mb-0.5"><span class="text-[8px] font-semibold text-slate-500 flex-1 truncate">${place}</span><span class="text-[8px] font-bold px-1 rounded ${coverageClass}">${coverageIcon}</span></div>`;
        SLOTS.forEach(slot => {
          placeDiv.appendChild(createSlotButton(dateKey, place, slot, true));
        });
        cell.appendChild(placeDiv);
      });
    }
    container.appendChild(cell);
  }
}

function renderAll() {
  updateGeneraButtonLabel();
  renderCalendar();
  renderSidebar();
  renderMonthlyStats();
  updateConflictsHeaderBadge();
}

function toggleCalendarView() {
  state.calendarView = state.calendarView === 'monthly' ? 'weekly' : 'monthly';
  const icon = document.getElementById('calendar-view-icon');
  const label = document.getElementById('calendar-view-label');
  if (icon) icon.className = state.calendarView === 'monthly' ? 'fa-solid fa-calendar-week' : 'fa-solid fa-calendar-days';
  if (label) label.textContent = state.calendarView === 'monthly' ? 'Settimana' : 'Mese';
  renderAll();
}

// ====================================================
// 8. MODALI
// ====================================================

// --- Assign dropdown ---
function positionDropdown(rect) {
  const dropdown = document.getElementById('assign-dropdown');
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  let top;
  if (spaceBelow >= DROPDOWN_HEIGHT || spaceBelow > spaceAbove) {
    top = Math.min(rect.bottom + 4, window.innerHeight - DROPDOWN_HEIGHT - 4);
  } else {
    top = Math.max(4, rect.top - DROPDOWN_HEIGHT - 4);
  }
  top = Math.max(4, top);
  let left = Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - 4);
  left = Math.max(4, left);
  dropdown.style.top = `${top}px`;
  dropdown.style.left = `${left}px`;
}

function renderAvailableList(slotKey, slot, dateKey) {
  const list = document.getElementById('assign-available-list');
  const place = slotKey.split('_').slice(2).join('_');
  const availDocs = state.doctors.filter(doc => isDoctorAvailableForSlot(doc, dateKey, slot.key));
  availDocs.sort((a, b) => {
    const aPref = a.preferredPlace === place ? 0 : 1;
    const bPref = b.preferredPlace === place ? 0 : 1;
    if (aPref !== bPref) return aPref - bPref;
    return (b.weeklyHours || 0) - (a.weeklyHours || 0);
  });
  list.innerHTML = '';
  availDocs.forEach(doc => {
    const color = getDoctorColor(doc);
    const weeklyH = getWeeklyAssignedHours(doc.id, getWeekStart(new Date(dateKey + 'T00:00:00')));
    const pct = (doc.weeklyHours || 24) > 0 ? Math.round((weeklyH / (doc.weeklyHours || 24)) * 100) : 0;
    const btn = document.createElement('button');
    btn.className = 'w-full text-left rounded-lg px-3 py-2 hover:bg-slate-100 flex items-center gap-2 transition';
    btn.innerHTML = `
      <span class="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style="background:${color.hex}"></span>
      <span class="flex-1 font-medium text-xs">${doc.name}</span>
      <div class="flex flex-col items-end gap-0.5">
        <span class="text-[10px] text-slate-400">${weeklyH}/${doc.weeklyHours || 24}h</span>
        <div class="w-12 h-1 bg-slate-100 rounded-full"><div style="width:${Math.min(100, pct)}%; background:${pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e'}" class="h-1 rounded-full"></div></div>
      </div>`;
    btn.addEventListener('click', () => assignDoctor(slotKey, doc.id));
    list.appendChild(btn);
  });
}

function openAssignDropdown(e, slotKey, slot, dateKey, place) {
  closeAssignDropdown();
  state.activeSlotKey = slotKey;
  const dropdown = document.getElementById('assign-dropdown');
  const header = document.getElementById('assign-header-text');
  header.textContent = `${slot.icon} ${slot.label} · ${place} · ${dateKey}`;
  document.getElementById('assign-remove-wrap').classList.toggle('hidden', !state.assignments[slotKey]);
  renderAvailableList(slotKey, slot, dateKey);
  const unavailSection = document.getElementById('assign-unavail-section');
  const unavailList = document.getElementById('assign-unavail-list');
  unavailSection.classList.add('hidden');
  document.getElementById('assign-custom-section').classList.add('hidden');
  const availIds = new Set(state.doctors.filter(doc =>
    isDoctorAvailableForSlot(doc, dateKey, slot.key)
  ).map(d => d.id));
  const unavailDocs = state.doctors.filter(doc => !availIds.has(doc.id));
  unavailList.innerHTML = '';
  unavailDocs.forEach(doc => {
    const color = getDoctorColor(doc);
    const btn = document.createElement('button');
    btn.className = 'w-full text-left rounded-lg px-3 py-2 hover:bg-slate-100 flex items-center gap-2 transition';
    btn.innerHTML = `
      <span class="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style="background:${color.hex}"></span>
      <span class="flex-1 font-medium text-xs">${doc.name}</span>
      <span class="text-[10px] text-slate-400 italic">eccezione</span>`;
    btn.addEventListener('click', () => assignDoctor(slotKey, doc.id));
    unavailList.appendChild(btn);
  });
  document.getElementById('assign-exception-btn').classList.remove('hidden');
  document.getElementById('assign-custom-input').value = '';
  positionDropdown(e.currentTarget.getBoundingClientRect());
  dropdown.classList.remove('hidden');
}

function closeAssignDropdown() {
  document.getElementById('assign-dropdown').classList.add('hidden');
  document.getElementById('assign-unavail-section').classList.add('hidden');
  document.getElementById('assign-custom-section').classList.add('hidden');
  document.getElementById('assign-custom-input').value = '';
  state.activeSlotKey = null;
}

// --- Doctor modal ---
function populatePlaceSelect(selectEl, selected) {
  selectEl.innerHTML = `<option value="">-- Nessuna preferenza --</option>
    ${PLACES.map(p => `<option value="${p}"${p === selected ? ' selected' : ''}>${p}</option>`).join('')}`;
}

function renderAvailabilityTable(availability) {
  const tbody = document.getElementById('availability-tbody');
  if (!tbody) return;
  tbody.innerHTML = DAY_KEYS.map(dk => `
    <tr>
      <td class="px-2 py-1 text-xs font-medium text-slate-600">${DAY_NAMES[DAY_KEYS.indexOf(dk)]}</td>
      <td class="px-2 py-1"><input type="checkbox" ${availability?.[dk]?.mat ? 'checked' : ''} class="avail-check" data-day="${dk}" data-slot="mat"></td>
      <td class="px-2 py-1"><input type="checkbox" ${availability?.[dk]?.pom ? 'checked' : ''} class="avail-check" data-day="${dk}" data-slot="pom"></td>
    </tr>`).join('');
}

function renderColorPicker(selectedIndex) {
  const container = document.getElementById('color-picker');
  if (!container) return;
  container.innerHTML = COLOR_PALETTE.map((c, i) =>
    `<div class="w-6 h-6 rounded-full ${c.bg} cursor-pointer border-2 ${i === selectedIndex ? 'border-slate-800' : 'border-transparent'} color-swatch" data-index="${i}"></div>`
  ).join('');
}

function openDoctorModal(doctorId = null) {
  state.editingDoctorId = doctorId;
  document.getElementById('doctor-modal').classList.remove('hidden');
  document.getElementById('modal-doctor-id').value = doctorId || '';
  if (doctorId) {
    const doc = getDoctorById(doctorId);
    document.getElementById('modal-name').value = doc.name;
    document.getElementById('modal-patients').value = doc.patients || '';
    document.getElementById('modal-hours').value = doc.weeklyHours || 38;
    document.getElementById('modal-pool').checked = doc.isPool || false;
    document.getElementById('modal-budget').value = doc.monthlyBudget || '';
    document.getElementById('modal-aft').value = doc.aft || '';
    document.getElementById('modal-seniority').value = doc.seniority || '';
    renderAvailabilityTable(doc.availability);
    renderColorPicker(doc.colorIndex || 0);
    populatePlaceSelect(document.getElementById('modal-preferred-place'), doc.preferredPlace);
  } else {
    document.getElementById('modal-name').value = '';
    document.getElementById('modal-patients').value = '850';
    document.getElementById('modal-hours').value = '38';
    document.getElementById('modal-pool').checked = false;
    document.getElementById('modal-budget').value = '';
    document.getElementById('modal-aft').value = '';
    document.getElementById('modal-seniority').value = '';
    renderAvailabilityTable(null);
    renderColorPicker(0);
    populatePlaceSelect(document.getElementById('modal-preferred-place'), null);
  }
  const periodsContainer = document.getElementById('unavail-periods');
  periodsContainer.innerHTML = '';
  if (doctorId) {
    const doc = getDoctorById(doctorId);
    if (doc.unavailPeriods) doc.unavailPeriods.forEach(p => addUnavailPeriodRow(p.from, p.to));
  }
}

function closeDoctorModal() {
  document.getElementById('doctor-modal').classList.add('hidden');
}

function deleteDoctor(id) {
  const doc = getDoctorById(id);
  if (!doc) return;
  const toastEl = document.createElement('div');
  toastEl.className = 'toast-item flex items-center gap-3 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm';
  toastEl.innerHTML = `
    <span>Eliminare <strong>${cleanDoctorName(doc.name)}</strong>?</span>
    <button class="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-600 confirm-yes">Sì</button>
    <button class="bg-slate-200 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-300 confirm-no">No</button>`;
  document.getElementById('toast-container').appendChild(toastEl);
  toastEl.querySelector('.confirm-yes').addEventListener('click', () => {
    toastEl.remove();
    state.doctors = state.doctors.filter(d => d.id !== id);
    Object.keys(state.assignments).forEach(k => { if (state.assignments[k] === id) delete state.assignments[k]; });
    saveToStorage();
    pushHistory();
    closeDoctorModal();
    renderAll();
    toast('Medico eliminato', 'success');
  });
  toastEl.querySelector('.confirm-no').addEventListener('click', () => toastEl.remove());
}

function resetAssignments() {
  const toastEl = document.createElement('div');
  toastEl.className = 'toast-item flex items-center gap-3 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm';
  toastEl.innerHTML = `
    <span>Eliminare <strong>tutte le assegnazioni</strong>?</span>
    <button class="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-600 confirm-yes">Sì</button>
    <button class="bg-slate-200 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-300 confirm-no">No</button>`;
  document.getElementById('toast-container').appendChild(toastEl);
  toastEl.querySelector('.confirm-yes').addEventListener('click', () => {
    toastEl.remove();
    pushHistory();
    state.assignments = {};
    saveToStorage();
    renderAll();
    toast('Tutte le assegnazioni cancellate', 'success');
  });
  toastEl.querySelector('.confirm-no').addEventListener('click', () => toastEl.remove());
}

function addUnavailPeriodRow(from = '', to = '') {
  const container = document.getElementById('unavail-periods');
  if (!container) return;
  const periodEl = document.createElement('div');
  periodEl.className = 'flex gap-2 items-center bg-slate-50 rounded-lg p-2 unavail-period-row';
  periodEl.innerHTML = `
    <input type="date" value="${from}" class="border border-slate-300 rounded px-2 py-1 text-xs unavail-from" placeholder="Da">
    <span class="text-slate-400">—</span>
    <input type="date" value="${to}" class="border border-slate-300 rounded px-2 py-1 text-xs unavail-to" placeholder="A">
    <button type="button" onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700 text-xs">
      <i class="fa-solid fa-trash-can"></i>
    </button>`;
  container.appendChild(periodEl);
}

// --- Conflicts ---
function getConflicts() {
  const conflictsMap = {};
  for (const [key, docId] of Object.entries(state.assignments)) {
    const parts = key.split('_');
    const dateKey = parts[0];
    const slotKey = parts[1];
    const doc = getDoctorById(docId);
    const isUnavailable = doc ? isDoctorUnavailable(doc, dateKey) : false;
    const conflictKey = `${docId}_${dateKey}_${slotKey}`;
    const matches = Object.entries(state.assignments).filter(([k, v]) => v === docId && k.startsWith(`${dateKey}_${slotKey}_`));
    if (matches.length > 1 || isUnavailable) {
      if (!conflictsMap[conflictKey]) {
        conflictsMap[conflictKey] = { docId, dateKey, slotKey, keys: matches.map(m => m[0]), isUnavailable };
      }
    }
  }
  return Object.values(conflictsMap);
}

function openConflictsModal() {
  const conflicts = getConflicts();
  const modal = document.getElementById('conflicts-modal');
  const list = document.getElementById('conflicts-list');
  const badge = document.getElementById('conflicts-count-badge');
  const autoBtn = document.getElementById('btn-auto-resolve-all');
  badge.textContent = conflicts.length;
  autoBtn.disabled = conflicts.length === 0;
  if (conflicts.length === 0) {
    list.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 text-slate-400">
        <i class="fa-solid fa-check-circle text-5xl mb-3 text-green-400"></i>
        <p class="text-lg font-medium text-slate-500">Nessun conflitto trovato</p>
        <p class="text-sm">Tutti i turni sono assegnati correttamente.</p>
      </div>`;
  } else {
    list.innerHTML = conflicts.map((c, idx) => {
      const doc = getDoctorById(c.docId);
      const color = COLOR_PALETTE[doc?.colorIndex ?? 0] || COLOR_PALETTE[0];
      const slot = SLOTS.find(s => s.key === c.slotKey);
      const slotLabel = slot ? `${slot.icon} ${slot.label}` : c.slotKey;
      const [year, month, day] = c.dateKey.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const dateFormatted = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      const placesHtml = c.keys.map(k => {
        const parts = k.split('_');
        const place = parts.slice(2).join('_');
        return `<div class="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 mb-1">
          <span class="text-sm text-slate-700 flex items-center gap-2">
            <i class="fa-solid fa-location-dot text-slate-400"></i>${place}
          </span>
          <button onclick="removeAssignmentFromConflict('${k}')" class="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors">
            <i class="fa-solid fa-xmark mr-1"></i>Rimuovi
          </button>
        </div>`;
      }).join('');
      return `<div class="border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-50 px-4 py-3 flex items-center gap-3 border-b border-slate-200">
          <div class="w-3 h-3 rounded-full ${color.bg} flex-shrink-0"></div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-slate-800 text-sm truncate">${doc?.name || 'Medico sconosciuto'}</p>
            <p class="text-xs text-slate-500">${dateFormatted} · ${slotLabel}</p>
          </div>
          <div class="flex items-center gap-1">
            ${c.isUnavailable ? '<span class="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">Assente / Ferie</span>' : ''}
            <span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full flex-shrink-0">${c.keys.length} sedi</span>
          </div>
        </div>
        <div class="p-3 bg-white">${placesHtml}</div>
      </div>`;
    }).join('');
  }
  modal.classList.remove('hidden');
  updateConflictsHeaderBadge();
}

function closeConflictModal() {
  const modal = document.getElementById('conflict-modal');
  if (modal) modal.classList.add('hidden');
}

function closeConflictsModal() {
  document.getElementById('conflicts-modal').classList.add('hidden');
}

function removeAssignmentFromConflict(slotKey) {
  removeAssignment(slotKey);
  openConflictsModal();
}

function autoResolveAllConflicts() {
  const conflicts = getConflicts();
  if (conflicts.length === 0) return;
  pushHistory();
  for (const c of conflicts) {
    if (c.isUnavailable) {
      for (const k of c.keys) delete state.assignments[k];
    } else {
      const keysToRemove = c.keys.slice(1);
      for (const k of keysToRemove) delete state.assignments[k];
    }
  }
  saveToStorage();
  renderAll();
  openConflictsModal();
  toast(`Risolti ${conflicts.length} conflitti automaticamente`, 'success');
}

function updateConflictsHeaderBadge() {
  const conflicts = getConflicts();
  const badge = document.getElementById('conflicts-header-badge');
  if (conflicts.length > 0) {
    badge.textContent = conflicts.length;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// --- Instructions ---
function closeInstructions() {
  const modal = document.getElementById('instructions-modal');
  if (modal) modal.classList.add('hidden');
}

// ====================================================
// 9. IMPORTA/ESPORTA
// ====================================================

// --- JSON Export/Import ---
// (handled by top-level event listeners attached in section 17)

// --- EXCEL Import/Export ---
function importExcelFromFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') {
    toast('Libreria XLSX non caricata', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      importFromRows(rows);
      toast('Importazione Excel completata!', 'success');
    } catch (err) {
      toast('Errore importazione Excel: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = '';
}

function importFromRows(rows) {
  const importMonth = detectMonthFromRows(rows);
  const importYear = importMonth !== null ? rows.reduce((acc, r) => {
    if (!r) return acc;
    const d = excelDateToDate(r[1]);
    return d ? d.getFullYear() : acc;
  }, null) : null;

  const parsed = parseAssignmentSections(rows, importMonth, importYear);

  if (importMonth !== null && importYear !== null) {
    for (const key of Object.keys(state.assignments)) {
      const parts = key.split('_');
      const dateParts = parts[0].split('-');
      if (dateParts.length === 3) {
        const y = parseInt(dateParts[0]);
        const m = parseInt(dateParts[1]) - 1;
        if (y === importYear && m === importMonth) {
          delete state.assignments[key];
        }
      }
    }
  }

  let assigned = 0;
  for (const [key, excelName] of Object.entries(parsed.assignments)) {
    const doc = matchDoctorBySurname(excelName);
    if (doc) { state.assignments[key] = doc.id; assigned++; }
  }

  let debtCount = 0;
  for (const [excelName, hours] of Object.entries(parsed.debtDoctors)) {
    const doc = matchDoctorBySurname(excelName);
    if (doc) { doc.monthlyBudget = hours; debtCount++; }
  }
  for (const [excelName, hours] of Object.entries(parsed.poolDoctors)) {
    const doc = matchDoctorBySurname(excelName);
    if (doc) { doc.monthlyBudget = hours; doc.isPool = true; debtCount++; }
  }

  saveToStorage();
  renderAll();
  toast(`Importate ${assigned} assegnazioni, aggiornati ${debtCount} medici`, 'success');
}

function detectMonthFromRows(rows) {
  for (const row of rows) {
    if (!row) continue;
    const parsedDate = excelDateToDate(row[1]);
    if (parsedDate) return parsedDate.getMonth();
  }
  return null;
}

function parseAssignmentSections(rows, importMonth, importYear) {
  let currentPlace = null;
  let inDebtSection = false;
  let inPoolSection = false;
  const newAssignments = {};
  const debtDoctors = {};
  const poolDoctors = {};

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const c0 = row[0] !== undefined ? String(row[0]).trim() : '';
    const c1 = row[1];
    const c3 = row[3] !== undefined ? String(row[3]).trim() : '';
    const c4 = row[4] !== undefined ? String(row[4]).trim() : '';

    if (c0 === 'Struttura') {
      const titleRow = rows[r - 1] || [];
      const t = titleRow[1] ? String(titleRow[1]) : String(row[0] || '');
      currentPlace = PLACES.find(p => {
        const tLower = t.toLowerCase().replace(/[.\s]/g, '');
        const pLower = p.toLowerCase().replace(/[.\s]/g, '');
        return tLower.includes(pLower) || pLower.includes(tLower);
      }) || null;
      if (!currentPlace) {
        if (/monte/i.test(t) || /savino/i.test(t)) currentPlace = 'M.S.Savino';
        else if (/subbiano/i.test(t)) currentPlace = 'Subbiano';
      }
      continue;
    }

    if (c0.includes('debito orario')) { inDebtSection = true; inPoolSection = false; continue; }
    if (c3.includes('disponibilità') || c3.includes('disponibili')) { inDebtSection = false; inPoolSection = true; continue; }

    if (c0.startsWith('CdC') && c1) {
      const parsedDate = excelDateToDate(c1);
      if (parsedDate) {
        const shiftType = c3;
        const doctorName = c4;
        const slotKey = shiftType === 'Mattina' ? 'mat' : shiftType === 'Pomeriggio' ? 'pom' : null;
        if (slotKey && doctorName && doctorName !== 'SCOPERTO!' && currentPlace) {
          newAssignments[`${toDateKey(parsedDate)}_${slotKey}_${currentPlace}`] = doctorName;
        }
        continue;
      }
    }

    if (inDebtSection && c0 && c0 !== 'Medico' && !isNaN(parseFloat(row[1]))) {
      debtDoctors[c0] = parseFloat(row[1]);
    }
    if (inPoolSection && c3 && c3 !== 'Medico ' && row[4] !== undefined && !isNaN(parseFloat(row[4]))) {
      poolDoctors[c3] = parseFloat(row[4]);
    }
  }

  return { assignments: newAssignments, debtDoctors, poolDoctors };
}

function matchDoctorBySurname(excelName) {
  if (!excelName) return null;
  const cleanExcel = excelName.replace('Dott. ', '').trim().toLowerCase();
  let found = state.doctors.find(d => cleanDoctorName(d.name).toLowerCase() === cleanExcel);
  if (found) return found;
  const excelLast = cleanExcel.split(' ').slice(-1)[0];
  return state.doctors.find(d => {
    const docLast = cleanDoctorName(d.name).split(' ').slice(-1)[0].toLowerCase();
    return docLast === excelLast;
  });
}

function exportExcel() {
  if (typeof XLSX === 'undefined') {
    toast('Libreria XLSX non caricata', 'error');
    return;
  }
  const year = state.calYear;
  const month = state.calMonth;
  const monthName = MONTHS_IT[month];
  const lastDay = new Date(year, month + 1, 0).getDate();
  const DAY_SHORT = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const rows = [];

  function getDocName(dateKey, slotKey, place) {
    const id = state.assignments[`${dateKey}_${slotKey}_${place}`];
    if (!id) return '';
    if (typeof id === 'string' && id.startsWith(EXTERNAL_PREFIX)) return id.replace(EXTERNAL_PREFIX, '');
    const doc = getDoctorById(id);
    return doc ? cleanDoctorName(doc.name) : '';
  }

  const headers = ['Data', 'Giorno'];
  PLACES.forEach(place => {
    SLOTS.forEach(slot => {
      headers.push(`${place} ${slot.label}`);
    });
  });
  rows.push(headers);

  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dk = toDateKey(d);
    const row = [`${day}/${month + 1}`, DAY_SHORT[d.getDay()]];
    PLACES.forEach(place => {
      SLOTS.forEach(slot => {
        row.push(getDocName(dk, slot.key, place));
      });
    });
    rows.push(row);
  }

  rows.push([]);
  rows.push(['Medico', 'Ore residue mensili']);
  state.doctors.forEach(doc => {
    rows.push([cleanDoctorName(doc.name), Math.round(getRemainingMonthlyHours(doc, month, year))]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 10 }, { wch: 8 }, ...PLACES.flatMap(() => [{ wch: 24 }, { wch: 24 }])];
  XLSX.utils.book_append_sheet(wb, ws, monthName);
  XLSX.writeFile(wb, `turni-ruap-${monthName.toLowerCase()}-${year}.xlsx`);
  toast('Excel scaricato', 'success');
}

// --- PDF ---
function buildPdfContent() {
  const container = document.getElementById('pdf-content');
  const table = document.getElementById('pdf-table');
  if (!container || !table) return;
  const year = state.calYear;
  const month = state.calMonth;
  const monthName = MONTHS_IT[month];
  const lastDay = new Date(year, month + 1, 0).getDate();
  const DAY_SHORT = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  let html = '';

  PLACES.forEach(place => {
    html += `<h3 style="font-size:14px;font-weight:bold;margin:10px 0 4px;color:#1e3a5f">${place}</h3>`;
    html += `<table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:12px">
      <thead><tr style="background:#1e3a5f;color:white">
        <th style="padding:4px 6px;border:1px solid #ccc;text-align:left">Data</th>
        <th style="padding:4px 6px;border:1px solid #ccc;text-align:left">Giorno</th>`;
    SLOTS.forEach(s => { html += `<th style="padding:4px 6px;border:1px solid #ccc;text-align:left">${s.label}</th>`; });
    html += `</tr></thead><tbody>`;

    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(year, month, day);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const dk = toDateKey(d);
      html += `<tr>
        <td style="padding:5px 6px;border:1px solid #ddd">${day}/${month + 1}</td>
        <td style="padding:5px 6px;border:1px solid #ddd">${DAY_SHORT[d.getDay()]}</td>`;
      SLOTS.forEach(slot => {
        const id = state.assignments[`${dk}_${slot.key}_${place}`];
        let name = '';
        if (id) {
          if (typeof id === 'string' && id.startsWith(EXTERNAL_PREFIX)) {
            name = id.replace(EXTERNAL_PREFIX, '');
          } else {
            const doc = getDoctorById(id);
            if (doc) name = cleanDoctorName(doc.name);
          }
        }
        html += `<td style="padding:5px 6px;border:1px solid #ddd;${name ? 'background:#f0f9ff' : ''}">${name || ''}</td>`;
      });
      html += `</tr>`;
    }
    html += `</tbody></table>`;
  });

  table.innerHTML = html;
}

async function exportPDF() {
  if (typeof html2canvas === 'undefined') {
    toast('Libreria html2canvas non caricata — impossibile generare PDF', 'error');
    return;
  }
  if (typeof window.jspdf === 'undefined') {
    toast('Libreria jsPDF non caricata — impossibile generare PDF', 'error');
    return;
  }
  buildPdfContent();
  const el = document.getElementById('pdf-content');
  el.classList.remove('hidden');
  try {
    const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const maxW = pageW - 2 * margin;
    const maxH = pageH - 2 * margin;
    const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', margin, margin, canvas.width * ratio, canvas.height * ratio);
    pdf.save(`turni-ruap-${MONTHS_IT[state.calMonth].toLowerCase()}-${state.calYear}.pdf`);
    toast('PDF scaricato', 'success');
  } catch (err) {
    toast('Errore PDF: ' + err.message, 'error');
    console.error(err);
  } finally {
    el.classList.add('hidden');
  }
}

// ====================================================
// 10. AUTO-ASSIGN & GENERATION
// ====================================================
function enumerateEmptySlots(year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const slots = [];
  for (let day = 1; day <= lastDay; day++) {
    const cellDate = new Date(year, month, day);
    if (cellDate.getDay() === 0 || cellDate.getDay() === 6 || isItalianHoliday(cellDate)) continue;
    const dateKey = toDateKey(cellDate);
    SLOTS.forEach(slot => {
      PLACES.forEach(place => {
        const slotKey = `${dateKey}_${slot.key}_${place}`;
        if (!state.assignments[slotKey]) slots.push({ dateKey, slotKey, cellDate });
      });
    });
  }
  return slots;
}

function pickDoctorForSlot(slotToFill, primaryDocs, poolDocs, place, dateKey, slotKeyOnly, assignedInTarget, getEffectiveRemaining) {
  const notBusy = (doc) => {
    const prefix = `${dateKey}_${slotKeyOnly}_`;
    return !Object.entries(state.assignments).some(([k, v]) => v === doc.id && k.startsWith(prefix));
  };

  const filterAvailable = (docs) => docs.filter(doc =>
    isDoctorAvailableForSlot(doc, dateKey, slotKeyOnly)
    && notBusy(doc)
    && getEffectiveRemaining(doc) > 0
  );

  const availablePrimary = filterAvailable(primaryDocs);
  const availablePool = filterAvailable(poolDocs);

  const priorityGroups = [
    availablePrimary.filter(d => d.preferredPlace === place),
    availablePrimary.filter(d => !d.preferredPlace),
    availablePrimary.filter(d => d.preferredPlace && d.preferredPlace !== place),
    availablePool.filter(d => d.preferredPlace === place),
    availablePool.filter(d => !d.preferredPlace),
    availablePool.filter(d => d.preferredPlace && d.preferredPlace !== place),
  ];

  for (const group of priorityGroups) {
    if (group.length > 0) {
      group.sort((a, b) => getEffectiveRemaining(b) - getEffectiveRemaining(a));
      return group[0];
    }
  }
  return null;
}

function runAutoAssignForMonth(year, month) {
  if (isProcessing) return;
  if (state.doctors.length === 0) {
    toast('Aggiungi prima dei medici', 'warning');
    return;
  }

  isProcessing = true;
  pushHistory();
  const monthName = MONTHS_IT[month];
  const slotsToProcess = enumerateEmptySlots(year, month);

  if (slotsToProcess.length === 0) {
    isProcessing = false;
    toast(`Nessun turno vuoto in ${monthName}`, 'info');
    return;
  }

  const assignedInTarget = {};
  state.doctors.forEach(d => { assignedInTarget[d.id] = getAssignedHoursInMonth(d.id, month, year); });
  function getEffectiveRemaining(doc) {
    return Math.max(0, getMonthlyBudget(doc) - (assignedInTarget[doc.id] || 0));
  }

  const primaryDocs = state.doctors.filter(d => !d.isPool);
  const poolDocs = state.doctors.filter(d => d.isPool);

  const progressBar = document.getElementById('autoassign-progress-bar');
  const progressLabel = document.getElementById('autoassign-progress-label');
  const loadingEl = document.getElementById('autoassign-loading');
  const loadingText = document.getElementById('autoassign-loading-text');
  loadingEl.classList.remove('hidden');
  loadingText.textContent = `Generazione turni ${monthName}...`;
  let count = 0;
  const total = slotsToProcess.length;

  function processChunk(index) {
    const batchSize = 20;
    const end = Math.min(index + batchSize, total);

    for (let i = index; i < end; i++) {
      const { dateKey, slotKey, cellDate } = slotsToProcess[i];
      const parts = slotKey.split('_');
      const slotKeyOnly = parts[1];
      const slotDef = SLOTS.find(s => s.key === slotKeyOnly);
      const slotHours = slotDef ? slotDef.hours : 6;
      const place = parts.slice(2).join('_');

      const chosen = pickDoctorForSlot(slotKey, primaryDocs, poolDocs, place, dateKey, slotKeyOnly, assignedInTarget, getEffectiveRemaining);
      if (!chosen) continue;

      state.assignments[slotKey] = chosen.id;
      assignedInTarget[chosen.id] = (assignedInTarget[chosen.id] || 0) + slotHours;
      count++;
    }

    const pct = Math.round((end / total) * 100);
    progressBar.style.width = pct + '%';
    progressLabel.textContent = `${end} / ${total} turni`;
    loadingText.textContent = `Generazione turni ${monthName}... ${pct}%`;

    if (end < total) {
      requestAnimationFrame(() => processChunk(end));
    } else {
      loadingEl.classList.add('hidden');
      progressBar.style.width = '0%';
      if (count === 0) {
        toast(`Nessun turno da generare in ${monthName}`, 'info');
        return;
      }
      isProcessing = false;
      saveToStorage();
      renderAll();
      renderMonthlyStats();
      updateConflictsHeaderBadge();
      toast(`Generati ${count} turni per ${monthName}`, 'success');
    }
  }

  processChunk(0);
}

function autoAssign() {
  runAutoAssignForMonth(state.calYear, state.calMonth);
}

function generateNextMonth() {
  const nextMonth = state.calMonth + 1;
  const year = nextMonth > 11 ? state.calYear + 1 : state.calYear;
  runAutoAssignForMonth(year, nextMonth % 12);
}

function updateGeneraButtonLabel() {
  const label = document.getElementById('btn-genera-label');
  if (label) {
    const nextMonth = (state.calMonth + 1) % 12;
    label.textContent = MONTHS_IT[nextMonth];
  }
}

// ====================================================
// 11. MONTHLY STATS
// ====================================================
let hideZeroDocs = false;

function getMonthlyStats() {
  const year = state.calYear;
  const month = state.calMonth;
  const lastDay = new Date(year, month + 1, 0).getDate();
  let totalSlots = 0, filledSlots = 0;
  const doctorHours = {};
  state.doctors.forEach(d => doctorHours[d.id] = 0);

  for (let day = 1; day <= lastDay; day++) {
    const cellDate = new Date(year, month, day);
    const jsDay = cellDate.getDay();
    if (jsDay === 0 || jsDay === 6) continue;
    const dateKey = toDateKey(cellDate);
    PLACES.forEach(place => {
      SLOTS.forEach(slot => {
        totalSlots++;
        const key = `${dateKey}_${slot.key}_${place}`;
        if (state.assignments[key]) {
          filledSlots++;
          doctorHours[state.assignments[key]] += slot.hours;
        }
      });
    });
  }
  return { totalSlots, filledSlots, emptySlots: totalSlots - filledSlots, coverage: totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0, doctorHours };
}

function toggleHideZeroDocs() {
  hideZeroDocs = !hideZeroDocs;
  const icon = document.getElementById('btn-hide-zero-docs');
  if (hideZeroDocs) {
    icon.className = 'fa-solid fa-eye-slash text-brand-500 text-[10px] cursor-pointer hover:text-brand-600';
    icon.title = 'Mostra tutti';
  } else {
    icon.className = 'fa-regular fa-eye text-slate-400 text-[10px] cursor-pointer hover:text-brand-600';
    icon.title = 'Nascondi inattivi';
  }
  renderMonthlyStats();
}

function renderMonthlyStats() {
  const panel = document.getElementById('monthly-stats-panel');
  const stats = getMonthlyStats();

  const totalEl = document.getElementById('total-doctors');
  if (hideZeroDocs) {
    const activeCount = state.doctors.filter(d => (stats.doctorHours[d.id] || 0) > 0).length;
    totalEl.innerHTML = `<span class="text-brand-600">${activeCount}</span>/${state.doctors.length}`;
  } else {
    totalEl.textContent = state.doctors.length;
  }
  document.getElementById('total-hours').textContent = Object.values(stats.doctorHours).reduce((a, b) => a + b, 0);

  const coverageEl = document.getElementById('coverage-badge');
  if (coverageEl) {
    coverageEl.textContent = `${stats.coverage}%`;
    coverageEl.className = `text-xs font-bold px-2 py-0.5 rounded-full ${stats.coverage === 100 ? 'bg-green-100 text-green-700' : stats.coverage >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`;
  }

  if (!panel) return;
  const ordered = [...state.doctors].sort((a, b) => (b.isPool ? 1 : 0) - (a.isPool ? 1 : 0));
  const visible = hideZeroDocs ? ordered.filter(d => (stats.doctorHours[d.id] || 0) > 0) : ordered;

  panel.innerHTML = visible.map(doc => {
    const budget = getMonthlyBudget(doc);
    const used = stats.doctorHours[doc.id] || 0;
    const rem = Math.max(0, budget - used);
    const pct = budget > 0 ? Math.round((used / budget) * 100) : 0;
    const color = getDoctorColor(doc);
    const label = doc.isPool ? ' (pool)' : '';
    const barColor = rem === 0 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';
    return `<div class="flex items-center gap-2 py-1">
      <span class="w-3 h-3 rounded-full flex-shrink-0" style="background:${color.hex}"></span>
      <span class="flex-1 truncate text-slate-700" title="${doc.name}">${cleanDoctorName(doc.name)}${label}</span>
      <span class="text-slate-500 flex-shrink-0">${used}h/${budget}h</span>
      <div class="w-16 h-2.5 bg-slate-200 rounded-full flex-shrink-0">
        <div style="width:${Math.min(100, pct)}%; background:${barColor}" class="h-2.5 rounded-full"></div>
      </div>
    </div>`;
  }).join('');

  const printGrid = document.getElementById('print-bilancio-grid');
  if (printGrid) {
    const titleEl = document.getElementById('print-bilancio-title');
    if (titleEl) titleEl.textContent = `${MONTHS_IT[state.calMonth]} ${state.calYear}`;
    printGrid.innerHTML = visible.map(doc => {
      const budget = getMonthlyBudget(doc);
      const used = stats.doctorHours[doc.id] || 0;
      const pct = budget > 0 ? Math.round((used / budget) * 100) : 0;
      const barColor = (budget - used) <= 0 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';
      return `<div class="p-row">
        <span class="p-dot" style="background:${getDoctorColor(doc).hex}"></span>
        <span class="p-name">${doc.name}${doc.isPool ? ' (pool)' : ''}</span>
        <span class="p-hours">${used}h / ${budget}h</span>
        <div class="p-bar"><div class="p-fill" style="width:${Math.min(100, pct)}%;background:${barColor}"></div></div>
      </div>`;
    }).join('');
  }
}

function toggleMonthlyStats() {
  const panel = document.getElementById('monthly-stats-panel');
  const chevron = document.getElementById('monthly-stats-chevron');
  if (!panel) return;
  const open = panel.classList.toggle('hidden');
  chevron.style.transform = open ? '' : 'rotate(180deg)';
  if (!open) renderMonthlyStats();
}

// ====================================================
// 12. RICERCA E FILTRO MEDICI
// ====================================================
let searchQuery = '';
let filterAFT = '';

// ====================================================
// 13. COPIA SETTIMANA
// ====================================================
let copyWeekSource = null;

function copyWeekFromCurrentView() {
  const weekStart = state.calendarView === 'weekly' ? state.calendarWeekStart : state.sidebarWeekStart;
  copyWeek(weekStart);
}

function pasteWeekToCurrentView() {
  const weekStart = state.calendarView === 'weekly' ? state.calendarWeekStart : state.sidebarWeekStart;
  pasteWeek(weekStart);
}

function copyDay(dateKey) {
  if (!dateKey) return;
  copyWeekSource = { weekStart: null, assignments: {} };
  PLACES.forEach(place => {
    SLOTS.forEach(slot => {
      const key = `${dateKey}_${slot.key}_${place}`;
      if (state.assignments[key]) {
        copyWeekSource.assignments[key] = state.assignments[key];
      }
    });
  });
  const d = new Date(dateKey + 'T00:00:00');
  toast(`Giorno del ${d.toLocaleDateString('it-IT')} copiato (${Object.keys(copyWeekSource.assignments).length} turni)`, 'success');
}

function copyWeek(weekStart) {
  const startDate = weekStart instanceof Date ? weekStart : new Date(weekStart + 'T00:00:00');
  copyWeekSource = { weekStart: startDate, assignments: {} };
  for (let i = 0; i < 5; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateKey = toDateKey(d);
    PLACES.forEach(place => {
      SLOTS.forEach(slot => {
        const key = `${dateKey}_${slot.key}_${place}`;
        if (state.assignments[key]) {
          copyWeekSource.assignments[key] = state.assignments[key];
        }
      });
    });
  }
  toast(`Settimana del ${formatDateShort(startDate)} copiata (${Object.keys(copyWeekSource.assignments).length} turni)`, 'success');
}

function pasteWeek(weekStart) {
  if (!copyWeekSource || Object.keys(copyWeekSource.assignments).length === 0) {
    toast('Nessuna settimana in clipboard', 'warning');
    return;
  }
  pushHistory();
  const offset = Math.floor((weekStart - copyWeekSource.weekStart) / (7 * MS_PER_DAY));
  let count = 0;
  for (const [key, docId] of Object.entries(copyWeekSource.assignments)) {
    const parts = key.split('_');
    const oldDate = parts[0];
    const slotKey = parts[1];
    const place = parts.slice(2).join('_');
    const oldDateObj = new Date(oldDate + 'T00:00:00');
    const newDateObj = new Date(oldDateObj);
    newDateObj.setDate(newDateObj.getDate() + offset * 7);
    const newKey = `${toDateKey(newDateObj)}_${slotKey}_${place}`;
    if (!state.assignments[newKey]) {
      state.assignments[newKey] = docId;
      count++;
    }
  }
  saveToStorage();
  renderAll();
  toast(`${count} turni incollati`, 'success');
}

// ====================================================
// 14. WIZARD
// ====================================================
let wizardStep = 1;
const WIZARD_TOTAL = 4;
let wPlaces = [];
let wSlots = [];
let wDoctors = [];

function startWizard() {
  wizardStep = 1;
  wPlaces = [];
  wSlots = [{ key: 'mat', label: '08:00–14:00', hours: 6, icon: '🌅' }, { key: 'pom', label: '14:00–20:00', hours: 6, icon: '🌆' }];
  wDoctors = [];
  document.getElementById('ruap-wizard').classList.remove('hidden');
  renderWizardStep();
}

function restartWizard() {
  if (!confirm('Vuoi ricominciare la configurazione?\n\nTutti i dati verranno cancellati.')) return;
  localStorage.removeItem(STORAGE_DOCTORS);
  localStorage.removeItem(STORAGE_ASSIGNMENTS);
  localStorage.removeItem(STORAGE_HISTORY);
  localStorage.removeItem(STORAGE_PLACES);
  localStorage.removeItem(STORAGE_SLOTS);
  localStorage.removeItem(STORAGE_VERSION_KEY);
  state.doctors = [];
  state.assignments = {};
  state.places = [];
  state.slots = [];
  historyStack = [];
  historyIndex = -1;
  document.getElementById('demo-banner').classList.add('hidden');
  startWizard();
}

function renderWizardProgressDots() {
  const container = document.getElementById('wizard-progress-dots');
  if (!container) return;
  let html = '';
  for (let i = 1; i <= WIZARD_TOTAL; i++) {
    const cls = i < wizardStep ? 'dot done' : i === wizardStep ? 'dot active' : 'dot';
    html += `<span class="${cls}"></span>`;
  }
  container.innerHTML = html;
  document.getElementById('wizard-step-label').textContent = `Passo ${wizardStep} di ${WIZARD_TOTAL}`;
}

function renderWizardStep() {
  renderWizardProgressDots();
  const backBtn = document.getElementById('wizard-back');
  const nextBtn = document.getElementById('wizard-next');
  backBtn.classList.toggle('hidden', wizardStep === 1);
  nextBtn.classList.toggle('hidden', wizardStep === 1 || wizardStep === 4);

  const stepFns = [null, renderWizardStep1, renderWizardStep2, renderWizardStep3, renderWizardStep4];
  stepFns[wizardStep]();

  if (wizardStep === 2 || wizardStep === 3) {
    updateWizardNextState();
  }
}

function updateWizardNextState() {
  const nextBtn = document.getElementById('wizard-next');
  if (!nextBtn) return;
  const valid = (wizardStep === 2 && wPlaces.length >= 1) || (wizardStep === 3 && wSlots.length >= 1);
  nextBtn.disabled = !valid;
}

function wizardAdvance() {
  if (wizardStep === 2 && wPlaces.length < 1) return false;
  if (wizardStep === 3 && wSlots.length < 1) return false;
  return true;
}

function finishWizard() {
  state.doctors = wDoctors;
  state.assignments = {};
  state.places = [...wPlaces];
  state.slots = wSlots.map(s => ({ ...s }));
  historyStack = [];
  historyIndex = -1;
  document.getElementById('ruap-wizard').classList.add('hidden');
  reloadPlaces();
  reloadSlots();
  saveToStorage();
  pushHistory();
  renderAll();
  updateUndoRedoButtons();
  updateHeaderSubtitle();
  toast('Configurazione completata!', 'success');
}

function renderWizardStep1() {
  document.getElementById('wizard-step-content').innerHTML = `
    <div class="text-center" style="padding: 1.5rem 0">
      <div style="font-size:4rem; margin-bottom:1.2rem">📅</div>
      <h1>Benvenuto!</h1>
      <p class="wizard-body-text" style="margin: 1rem 0 0.5rem">
        Configuriamo insieme il tuo sistema di turni RUAP.
      </p>
      <p class="wizard-body-text" style="margin-bottom: 2rem">
        Ti farò <strong>4 semplici domande</strong> e sarai subito operativo.
      </p>
      <button id="w-start" class="wizard-big-btn primary" style="text-align:center">
        <span style="font-size:1.5rem; margin-right:0.5rem">👉</span> Iniziamo!
      </button>
    </div>`;
  document.getElementById('w-start').addEventListener('click', () => { wizardStep = 2; renderWizardStep(); });
}

function renderWizardStep2() {
  const chipsHtml = wPlaces.map(p => `
    <span class="wizard-chip" style="background:#dbeafe; color:#1e40af">
      ${p}
      <button class="chip-remove w-remove-place" data-place="${p}">×</button>
    </span>`).join('');

  document.getElementById('wizard-step-content').innerHTML = `
    <h1>Dove si lavora?</h1>
    <p class="wizard-body-text" style="margin:0.75rem 0 1.5rem">
      Quali sono le sedi ambulatoriali? (Es. "M.S.Savino", "Subbiano", "Castel Fisa")
    </p>
    <div class="flex flex-wrap gap-2 mb-4">${chipsHtml || '<span class="text-slate-400 text-sm">Nessuna sede aggiunta</span>'}</div>
    <div class="flex gap-2 mb-4">
      <input type="text" id="w-place-input" placeholder="Nome sede..." style="flex:1">
      <button id="w-place-add" class="wizard-big-btn outline" style="width:auto; padding:0.75rem 1.25rem; flex-shrink:0">+ Aggiungi</button>
    </div>
    <div class="mt-4 p-3 bg-slate-50 rounded-lg">
      <p class="text-sm text-slate-500">💡 <strong>Suggerimento:</strong> Puoi usare le sedi del tuo territorio USL</p>
    </div>`;

  document.getElementById('w-place-add').addEventListener('click', () => {
    const input = document.getElementById('w-place-input');
    const val = input.value.trim();
    if (val && !wPlaces.includes(val)) { wPlaces.push(val); renderWizardStep2(); }
  });
  document.getElementById('w-place-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('w-place-add').click();
  });
  document.querySelectorAll('.w-remove-place').forEach(btn => {
    btn.addEventListener('click', () => { wPlaces = wPlaces.filter(p => p !== btn.dataset.place); renderWizardStep2(); });
  });
  updateWizardNextState();
}

function renderWizardStep3() {
  const chipsHtml = wSlots.map(s => `
    <span class="wizard-chip" style="background:#fef3c7; color:#92400e">
      ${s.icon} ${s.label} (${s.hours}h)
      <button class="chip-remove w-remove-slot" data-key="${s.key}">×</button>
    </span>`).join('');

  document.getElementById('wizard-step-content').innerHTML = `
    <h1>Quali turni?</h1>
    <p class="wizard-body-text" style="margin:0.75rem 0 1.5rem">
      Definisci gli orari dei turni. Ogni turno ha una durata in ore.
    </p>
    <div class="flex flex-wrap gap-2 mb-4">${chipsHtml || '<span class="text-slate-400 text-sm">Nessun turno aggiunto</span>'}</div>
    <div class="grid grid-cols-2 gap-2 mb-3">
      <div>
        <label class="text-sm font-semibold text-slate-600 mb-1 block">Orario inizio</label>
        <input type="time" id="w-slot-start" value="08:00">
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-600 mb-1 block">Orario fine</label>
        <input type="time" id="w-slot-end" value="14:00">
      </div>
    </div>
    <div class="mb-4">
      <label class="text-sm font-semibold text-slate-600 mb-1 block">Icona</label>
      <div class="flex gap-2">
        <button class="w-slot-icon text-2xl p-2 border-2 border-transparent rounded hover:border-brand-400" data-icon="🌅">🌅</button>
        <button class="w-slot-icon text-2xl p-2 border-2 border-transparent rounded hover:border-brand-400" data-icon="🌆">🌆</button>
        <button class="w-slot-icon text-2xl p-2 border-2 border-transparent rounded hover:border-brand-400" data-icon="🌙">🌙</button>
        <button class="w-slot-icon text-2xl p-2 border-2 border-transparent rounded hover:border-brand-400" data-icon="☀️">☀️</button>
      </div>
    </div>
    <button id="w-slot-add" class="wizard-big-btn outline w-full" style="padding:0.75rem; font-size:1rem">+ Aggiungi turno</button>
    <p class="text-xs text-slate-400 mt-2">Usa standard 08:00-14:00 (Mattina) e 14:00-20:00 (Pomeriggio)</p>`;

  let selectedIcon = '🌅';
  document.querySelectorAll('.w-slot-icon').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.w-slot-icon').forEach(b => b.classList.remove('border-brand-400'));
      btn.classList.add('border-brand-400');
      selectedIcon = btn.dataset.icon;
    });
  });
  document.querySelector('.w-slot-icon').classList.add('border-brand-400');

  document.getElementById('w-slot-add').addEventListener('click', () => {
    const start = document.getElementById('w-slot-start').value;
    const end = document.getElementById('w-slot-end').value;
    if (start && end) {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const hours = eh * 60 + em - (sh * 60 + sm);
      const key = 'slot-' + Date.now();
      wSlots.push({ key, label: `${start}–${end}`, hours: hours / 60, icon: selectedIcon });
      document.getElementById('w-slot-start').value = '14:00';
      document.getElementById('w-slot-end').value = '20:00';
      renderWizardStep3();
    }
  });
  document.querySelectorAll('.w-remove-slot').forEach(btn => {
    btn.addEventListener('click', () => { wSlots = wSlots.filter(s => s.key !== btn.dataset.key); renderWizardStep3(); });
  });
  updateWizardNextState();
}

function renderWizardStep4() {
  const placesHtml = wPlaces.map(p => `<li>📍 <strong>${p}</strong></li>`).join('');
  const slotsHtml = wSlots.map(s => `<li>${s.icon} <strong>${s.label}</strong> (${s.hours}h)</li>`).join('');

  document.getElementById('wizard-step-content').innerHTML = `
    <h1>Quasi pronto!</h1>
    <p class="wizard-body-text" style="margin:0.75rem 0 1rem">
      Riepilogo della configurazione:
    </p>
    <div class="bg-slate-50 rounded-xl p-4 mb-4">
      <h3 class="font-bold text-slate-700 mb-2">📍 Sedi (${wPlaces.length})</h3>
      <ul class="text-sm space-y-1 mb-4">${placesHtml}</ul>
      <h3 class="font-bold text-slate-700 mb-2">🕐 Turni (${wSlots.length})</h3>
      <ul class="text-sm space-y-1">${slotsHtml}</ul>
    </div>
    <p class="wizard-body-text" style="margin-bottom: 1rem">
      Ora aggiungi i medici che faranno i turni.
    </p>
    <div class="mb-3">
      <input type="text" id="w-doctor-name" placeholder="Nome del medico (es. Dott. Rossi)" class="mb-2">
      <input type="number" id="w-doctor-patients" placeholder="Numero assistiti (es. 850)" class="mb-2">
      <select id="w-doctor-place" class="w-full border-2 border-slate-200 rounded-lg p-2">
        <option value="">-- Sede preferita --</option>
        ${wPlaces.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
    </div>
    <button id="w-doctor-add" class="wizard-big-btn outline w-full mb-3" style="padding:0.75rem; font-size:1rem">+ Aggiungi medico</button>
    <div id="w-doctor-list" class="flex flex-wrap gap-2 mb-4">
      ${wDoctors.map((d, i) => `
        <span class="wizard-chip" style="background:${COLOR_PALETTE[i % COLOR_PALETTE.length].hex}; color:white">
          ${d.name}
          <button class="chip-remove w-remove-doctor" data-index="${i}">×</button>
        </span>`).join('')}
      ${wDoctors.length === 0 ? '<span class="text-slate-400 text-sm">Nessun medico aggiunto</span>' : ''}
    </div>
    <button id="w-finish" class="wizard-big-btn success w-full" style="text-align:center; margin-top:1rem; ${wDoctors.length < 1 ? 'opacity:0.4; pointer-events:none' : ''}">
      ✅ Configura e inizia
    </button>`;

  document.getElementById('w-doctor-add').addEventListener('click', () => {
    const name = document.getElementById('w-doctor-name').value.trim();
    const patients = parseInt(document.getElementById('w-doctor-patients').value) || 850;
    const preferredPlace = document.getElementById('w-doctor-place').value || null;
    if (name) {
      wDoctors.push({ name: name.startsWith('Dott. ') ? name : 'Dott. ' + name, patients, weeklyHours: calculateDebtByPatients(patients), colorIndex: wDoctors.length % 8, preferredPlace, availability: Object.fromEntries(DAY_KEYS.map(k => [k, { mat: true, pom: true }])), unavailPeriods: [] });
      document.getElementById('w-doctor-name').value = '';
      document.getElementById('w-doctor-patients').value = '';
      renderWizardStep4();
    }
  });
  document.querySelectorAll('.w-remove-doctor').forEach(btn => {
    btn.addEventListener('click', () => { wDoctors.splice(parseInt(btn.dataset.index), 1); renderWizardStep4(); });
  });
  document.getElementById('w-finish').addEventListener('click', finishWizard);
}

// ====================================================
// 15. KEYBOARD SHORTCUTS
// ====================================================
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
  if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
  if (e.key === 'ArrowLeft' && e.ctrlKey) { e.preventDefault(); state.calMonth--; if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; } renderAll(); }
  if (e.key === 'ArrowRight' && e.ctrlKey) { e.preventDefault(); state.calMonth++; if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; } renderAll(); }
  if (e.key === 'Escape') { closeAssignDropdown(); closeDoctorModal(); closeConflictModal(); closeInstructions(); }
});

// ====================================================
// 16. KONAMI CODE EASTER EGG
// ====================================================
const konamiCode = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIndex = 0;
document.addEventListener('keydown', (e) => {
  if (e.key === konamiCode[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === konamiCode.length) {
      toast('🎉 Sei un vero utente RUAP!', 'success');
      document.body.style.animation = 'rainbow 2s';
      setTimeout(() => { document.body.style.animation = ''; }, 2000);
      konamiIndex = 0;
    }
  } else {
    konamiIndex = 0;
  }
});

// ====================================================
// 17. WIZARD NAV LISTENERS (attached once, event delegation)
// ====================================================
document.getElementById('wizard-back')?.addEventListener('click', () => { if (wizardStep > 1) { wizardStep--; renderWizardStep(); } });
document.getElementById('wizard-next')?.addEventListener('click', () => {
  if (wizardAdvance() && wizardStep < 4) { wizardStep++; renderWizardStep(); }
});

// ====================================================
// 18. TOP-LEVEL EVENT LISTENERS
// ====================================================
document.getElementById('btn-export').addEventListener('click', () => {
  const data = { version: 1, exportDate: new Date().toISOString(), doctors: state.doctors, assignments: state.assignments };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `turni-${toDateKey(new Date())}.json`; a.click(); URL.revokeObjectURL(url);
});

document.getElementById('btn-export-excel').addEventListener('click', exportExcel);
document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.doctors || !data.assignments) throw new Error('Formato non valido');
      state.doctors = data.doctors; state.assignments = data.assignments;
      saveToStorage(); renderAll(); renderMonthlyStats(); toast('Importazione completata!', 'success');
    } catch (err) { toast('Errore importazione: ' + err.message, 'error'); }
  };
  reader.readAsText(file); e.target.value = '';
});
document.getElementById('import-excel-file').addEventListener('change', importExcelFromFile);

// Assign dropdown
document.getElementById('assign-remove').addEventListener('click', () => {
  if (state.activeSlotKey) removeAssignment(state.activeSlotKey);
});
document.addEventListener('click', (e) => { if (!document.getElementById('assign-dropdown').contains(e.target)) closeAssignDropdown(); });
document.getElementById('assign-close').addEventListener('click', closeAssignDropdown);
document.getElementById('assign-exception-btn').addEventListener('click', () => {
  document.getElementById('assign-unavail-section').classList.toggle('hidden');
  document.getElementById('assign-custom-section').classList.toggle('hidden');
});
document.getElementById('assign-custom-add').addEventListener('click', () => {
  const input = document.getElementById('assign-custom-input');
  const name = input.value.trim();
  if (!name || !state.activeSlotKey) return;
  assignDoctor(state.activeSlotKey, EXTERNAL_PREFIX + name);
});
document.getElementById('assign-custom-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('assign-custom-add').click();
});

// Doctor modal save/cancel
document.getElementById('modal-cancel').addEventListener('click', closeDoctorModal);
document.getElementById('modal-save').addEventListener('click', () => {
  const doctorId = document.getElementById('modal-doctor-id').value || generateId();
  const name = document.getElementById('modal-name').value.trim();
  if (!name) { toast('Inserisci un nome', 'warning'); return; }
  const patients = parseInt(document.getElementById('modal-patients').value) || 0;
  const weeklyHours = parseInt(document.getElementById('modal-hours').value) || 38;
  const isPool = document.getElementById('modal-pool').checked;
  const budget = document.getElementById('modal-budget').value ? parseFloat(document.getElementById('modal-budget').value) : undefined;
  const aft = document.getElementById('modal-aft').value || '';
  const seniority = parseInt(document.getElementById('modal-seniority').value) || 0;
  const preferredPlace = document.getElementById('modal-preferred-place').value || null;
  const selectedSwatch = document.querySelector('.color-swatch.border-slate-800');
  const colorIndex = selectedSwatch ? parseInt(selectedSwatch.dataset.index) : 0;
  const availability = {};
  document.querySelectorAll('.avail-check').forEach(cb => {
    const day = cb.dataset.day;
    const slot = cb.dataset.slot;
    if (!availability[day]) availability[day] = { mat: false, pom: false };
    availability[day][slot] = cb.checked;
  });
  const unavailPeriods = [];
  document.querySelectorAll('.unavail-period-row').forEach(row => {
    const from = row.querySelector('.unavail-from').value;
    const to = row.querySelector('.unavail-to').value;
    if (from && to) unavailPeriods.push({ from, to });
  });

  if (state.editingDoctorId) {
    const doc = getDoctorById(state.editingDoctorId);
    if (doc) {
      if (doc.name !== name) doc.name = name;
      doc.patients = patients;
      doc.weeklyHours = weeklyHours;
      doc.isPool = isPool;
      if (budget !== undefined) doc.monthlyBudget = budget; else delete doc.monthlyBudget;
      doc.aft = aft;
      doc.seniority = seniority;
      doc.preferredPlace = preferredPlace;
      doc.colorIndex = colorIndex;
      doc.availability = availability;
      doc.unavailPeriods = unavailPeriods;
    }
  } else {
    state.doctors.push({
      id: generateId(), name, patients, weeklyHours, isPool, monthlyBudget: budget,
      colorIndex, preferredPlace, availability, unavailPeriods, aft, seniority
    });
  }
  saveToStorage();
  pushHistory();
  closeDoctorModal();
  renderAll();
  toast(state.editingDoctorId ? 'Medico aggiornato' : 'Medico aggiunto', 'success');
});
document.getElementById('modal-patients')?.addEventListener('input', (e) => {
  const patients = parseInt(e.target.value) || 0;
  const hours = calculateDebtByPatients(patients);
  document.getElementById('modal-hours').value = hours;
});
document.getElementById('btn-add-period')?.addEventListener('click', () => { addUnavailPeriodRow('', ''); });

// Color swatch selection
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('color-swatch')) {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('border-slate-800'));
    e.target.classList.add('border-slate-800');
  }
});

// Header and toolbar buttons
const btnAutoAssign = document.getElementById('btn-auto-assign');
if (btnAutoAssign) btnAutoAssign.addEventListener('click', autoAssign);
const btnGeneraMese = document.getElementById('btn-genera-mese');
if (btnGeneraMese) btnGeneraMese.addEventListener('click', generateNextMonth);
const btnPdf = document.getElementById('btn-pdf');
if (btnPdf) btnPdf.addEventListener('click', exportPDF);
const btnDarkMode = document.getElementById('btn-darkmode');
if (btnDarkMode) btnDarkMode.addEventListener('click', toggleDarkMode);
const btnInstructions = document.getElementById('btn-instructions');
if (btnInstructions) {
  btnInstructions.addEventListener('click', () => {
    document.getElementById('instructions-modal').classList.remove('hidden');
  });
}
document.getElementById('instructions-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'instructions-modal') e.target.classList.add('hidden');
});
document.getElementById('close-instructions')?.addEventListener('click', closeInstructions);
document.getElementById('close-instructions-bottom')?.addEventListener('click', closeInstructions);
const btnResetAssignments = document.getElementById('btn-reset-assignments');
if (btnResetAssignments) btnResetAssignments.addEventListener('click', resetAssignments);
const btnConflicts = document.getElementById('btn-conflicts');
if (btnConflicts) btnConflicts.addEventListener('click', openConflictsModal);
document.getElementById('conflicts-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'conflicts-modal') closeConflictsModal();
});
const btnRestartWizard = document.getElementById('btn-restart-wizard');
if (btnRestartWizard) btnRestartWizard.addEventListener('click', restartWizard);
const btnUndo = document.getElementById('btn-undo');
if (btnUndo) btnUndo.addEventListener('click', undo);
const btnRedo = document.getElementById('btn-redo');
if (btnRedo) btnRedo.addEventListener('click', redo);
const btnOggi = document.getElementById('btn-oggi');
if (btnOggi) {
  btnOggi.addEventListener('click', () => {
    const now = new Date();
    state.calYear = now.getFullYear();
    state.calMonth = now.getMonth();
    state.sidebarWeekStart = getWeekStart(now);
    state.calendarWeekStart = getWeekStart(now);
    if (state.calendarView === 'weekly') toggleCalendarView();
    renderAll();
    toast('Tornato a oggi', 'info');
  });
}
// Calendar navigation
document.getElementById('cal-prev').addEventListener('click', () => {
  if (state.calendarView === 'weekly') {
    state.calendarWeekStart.setDate(state.calendarWeekStart.getDate() - 7);
    state.sidebarWeekStart = new Date(state.calendarWeekStart);
  } else {
    state.calMonth--;
    if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
  }
  renderAll();
});
document.getElementById('cal-next').addEventListener('click', () => {
  if (state.calendarView === 'weekly') {
    state.calendarWeekStart.setDate(state.calendarWeekStart.getDate() + 7);
    state.sidebarWeekStart = new Date(state.calendarWeekStart);
  } else {
    state.calMonth++;
    if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
  }
  renderAll();
});
document.getElementById('sidebar-week-prev').addEventListener('click', () => {
  state.sidebarWeekStart.setDate(state.sidebarWeekStart.getDate() - 7);
  state.calendarWeekStart = new Date(state.sidebarWeekStart);
  renderSidebar();
  if (state.calendarView === 'weekly') renderCalendar();
});
document.getElementById('sidebar-week-next').addEventListener('click', () => {
  state.sidebarWeekStart.setDate(state.sidebarWeekStart.getDate() + 7);
  state.calendarWeekStart = new Date(state.sidebarWeekStart);
  renderSidebar();
  if (state.calendarView === 'weekly') renderCalendar();
});

document.getElementById('doctor-search')?.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderSidebar();
});
document.getElementById('filter-aft')?.addEventListener('change', (e) => {
  filterAFT = e.target.value;
  renderSidebar();
});

// ====================================================
// 19. INIT
// ====================================================
function init() {
  initDarkMode();
  const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
  const isVersionMismatch = storedVersion !== String(STORAGE_VERSION);
  if (isVersionMismatch) {
    localStorage.removeItem(STORAGE_DOCTORS);
    localStorage.removeItem(STORAGE_ASSIGNMENTS);
    localStorage.removeItem(STORAGE_HISTORY);
    localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
  }
  loadFromStorage();
  reloadPlaces();
  reloadSlots();
  loadHistory();
  const isFirstRun = state.doctors.length === 0;
  if (isFirstRun) {
    const now = new Date();
    state.calYear = now.getFullYear();
    state.calMonth = now.getMonth();
    state.doctors = getDefaultDoctors();
    if (typeof CONFIG !== 'undefined' && CONFIG.places) state.places = [...CONFIG.places];
    if (typeof CONFIG !== 'undefined' && CONFIG.assignments) {
      Object.entries(CONFIG.assignments).forEach(([key, docId]) => {
        if (state.doctors.some(d => d.id === docId)) state.assignments[key] = docId;
      });
    }
    saveToStorage();
    document.getElementById('demo-banner').classList.remove('hidden');
  } else {
    pushHistory();
  }
  updateGeneraButtonLabel();
  renderAll();
  renderMonthlyStats();
  updateUndoRedoButtons();
  updateConflictsHeaderBadge();
  updateHeaderSubtitle();
}

init();
