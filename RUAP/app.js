// ====================================================
// COSTANTI E CONFIGURAZIONE
// ====================================================
const STORAGE_DOCTORS = 'ruap-turni-medici';
const STORAGE_ASSIGNMENTS = 'ruap-turni-assegnazioni';
const STORAGE_HISTORY = 'ruap-turni-history';
const STORAGE_VERSION_KEY = 'ruap-storage-version';
const STORAGE_VERSION = 2;
const HISTORY_MAX = 50;

const DAY_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
const DAY_KEYS  = ['lun', 'mar', 'mer', 'gio', 'ven'];
// Read from config.js if available, fall back to hardcoded defaults
const PLACES = (typeof CONFIG !== 'undefined' && CONFIG.places) ? CONFIG.places : ['M.S.Savino', 'Subbiano'];
const SLOTS = (typeof CONFIG !== 'undefined' && CONFIG.slots) ? CONFIG.slots : [
  { key: 'mat', label: '08:00–14:00', hours: 6, icon: '🌅' },
  { key: 'pom', label: '14:00–20:00', hours: 6, icon: '🌆' },
];

const DROPDOWN_HEIGHT = 350;
const DROPDOWN_WIDTH  = 320;
const MONTHLY_WEEKS = 4;

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

let state = {
  doctors: [],
  assignments: {},
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

function getDefaultDoctors() {
  if (typeof CONFIG === 'undefined' || !CONFIG.doctors) return [];
  return CONFIG.doctors.map(d => ({
    ...d,
    availability: d.availability ? JSON.parse(JSON.stringify(d.availability)) : Object.fromEntries(
      ['lun','mar','mer','gio','ven'].map(k => [k, { mat: true, pom: true }])
    ),
    unavailPeriods: d.unavailPeriods ? JSON.parse(JSON.stringify(d.unavailPeriods)) : [],
  }));
}

// ====================================================
// UTILITY FUNCTIONS
// ====================================================
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function cleanDoctorName(name) { return name.replace('Dott. ', ''); }

function excelDateToDate(excelDate) {
  if (!excelDate) return null;
  if (excelDate instanceof Date) return excelDate;
  if (typeof excelDate === 'number') {
    return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  }
  if (typeof excelDate === 'string') {
    const d = new Date(excelDate);
    if (!isNaN(d.getTime())) return d;
    const parts = excelDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (parts) {
      return new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
    }
  }
  return null;
}

function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getEasterMondayDate(year) {
  const easter = getEasterDate(year);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  return easterMonday;
}

function isItalianHoliday(date) {
  const d = date.getDate();
  const m = date.getMonth();
  const y = date.getFullYear();

  if (d === 1 && m === 0) return true;
  if (d === 6 && m === 0) return true;
  if (d === 25 && m === 3) return true;
  if (d === 1 && m === 4) return true;
  if (d === 2 && m === 5) return true;
  if (d === 15 && m === 7) return true;
  if (d === 1 && m === 10) return true;
  if (d === 8 && m === 11) return true;
  if (d === 25 && m === 11) return true;
  if (d === 26 && m === 11) return true;

  const pasquetta = getEasterMondayDate(y);
  if (d === pasquetta.getDate() && m === pasquetta.getMonth()) return true;

  return false;
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
  updateUndoRedoButtons();
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    const snapshot = JSON.parse(historyStack[historyIndex]);
    state.assignments = snapshot.assignments;
    saveToStorage();
    renderAll();
    updateUndoRedoButtons();
    updateConflictsHeaderBadge();
    toast('Annullato', 'info');
  }
}

function redo() {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    const snapshot = JSON.parse(historyStack[historyIndex]);
    state.assignments = snapshot.assignments;
    saveToStorage();
    renderAll();
    updateUndoRedoButtons();
    updateConflictsHeaderBadge();
    toast('Ripristinato', 'info');
  }
}

function updateUndoRedoButtons() {
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  if (btnUndo) {
    btnUndo.style.opacity = historyIndex > 0 ? '1' : '0';
    btnUndo.style.pointerEvents = historyIndex > 0 ? 'auto' : 'none';
  }
  if (btnRedo) {
    btnRedo.style.opacity = historyIndex < historyStack.length - 1 ? '1' : '0';
    btnRedo.style.pointerEvents = historyIndex < historyStack.length - 1 ? 'auto' : 'none';
  }
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateShort(date) { return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }); }

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

// ====================================================
// DARK MODE TOGGLE
// ====================================================
function toggleDarkMode() {
  const html = document.documentElement;
  const isDark = html.classList.contains('dark');
  if (isDark) {
    html.classList.remove('dark');
    localStorage.setItem('ruap-dark-mode', 'false');
  } else {
    html.classList.add('dark');
    localStorage.setItem('ruap-dark-mode', 'true');
  }
}

// Load dark mode preference on page load
function initDarkMode() {
  const isDarkPref = localStorage.getItem('ruap-dark-mode') === 'true';
  if (isDarkPref) {
    document.documentElement.classList.add('dark');
  }
}

// ====================================================
// TOAST NOTIFICATIONS
// ====================================================
function toast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colors = {
    success: 'bg-green-600 text-white',
    warning: 'bg-amber-500 text-white',
    error:   'bg-red-600 text-white',
    info:    'bg-brand-700 text-white',
  };
  const icons = {
    success: 'fa-circle-check',
    warning: 'fa-triangle-exclamation',
    error:   'fa-circle-xmark',
    info:    'fa-circle-info',
  };

  const el = document.createElement('div');
  el.className = `toast-item pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${colors[type] || colors.info} opacity-0 translate-y-2`;
  el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  el.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span>${message}</span>`;
  container.appendChild(el);

  requestAnimationFrame(() => {
    el.classList.remove('opacity-0', 'translate-y-2');
  });

  setTimeout(() => {
    el.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

function isDoctorUnavailable(doctor, dateKey) {
  if (!doctor.unavailPeriods) return false;
  return doctor.unavailPeriods.some(p => dateKey >= p.from && dateKey <= p.to);
}

function isDoctorAvailableForSlot(doctor, dateKey, slotKey) {
  if (isDoctorUnavailable(doctor, dateKey)) return false;
  const date = new Date(dateKey + 'T00:00:00');
  if (isItalianHoliday(date)) return false;
  const jsDay = date.getDay();
  if (jsDay === 0 || jsDay === 6) return false;
  const dayKeyMap = { 1:'lun', 2:'mar', 3:'mer', 4:'gio', 5:'ven' };
  const dayKey = dayKeyMap[jsDay];
  if (!doctor.availability || !doctor.availability[dayKey]) return false;
  return !!doctor.availability[dayKey][slotKey];
}

function getWeeklyAssignedHours(doctorId, weekStart) {
  let hours = 0;
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dk = toDateKey(d);
    SLOTS.forEach(slot => {
      PLACES.forEach(place => {
         const key = `${dk}_${slot.key}_${place}`;
         if (state.assignments[key] === doctorId) hours += slot.hours;
      });
    });
  }
  return hours;
}

function getDoctorById(id) { return state.doctors.find(d => d.id === id); }
function calculateDebtByPatients(patients) {
  if (!patients || patients < 0) return 38;
  if (patients <= 400) return 38;
  if (patients <= 1000) return 24;
  if (patients <= 1200) return 12;
  if (patients <= 1500) return 6;
  return 0;
}
function getDoctorColor(doctor) { return COLOR_PALETTE[doctor.colorIndex ?? 0] || COLOR_PALETTE[0]; }
function isPlaceCovered(dateKey, place) { return !!state.assignments[`${dateKey}_mat_${place}`] && !!state.assignments[`${dateKey}_pom_${place}`]; }
function getDayPlacesCoverage(dateKey) {
  const covered = PLACES.filter(p => isPlaceCovered(dateKey, p)).length;
  return { covered, total: PLACES.length };
}

// ─── Monthly budget helpers ───────────────────────────────
function getMonthlyBudget(doctor) {
  if (doctor.monthlyBudget != null) return doctor.monthlyBudget;
  return (doctor.weeklyHours || 38) * MONTHLY_WEEKS;
}

function getAssignedHoursInMonth(docId, month, year) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  let hours = 0;
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dk = toDateKey(d);
    SLOTS.forEach(slot => {
      PLACES.forEach(place => {
        if (state.assignments[`${dk}_${slot.key}_${place}`] === docId) {
          hours += slot.hours;
        }
      });
    });
  }
  return hours;
}

function getRemainingMonthlyHours(doctor, month, year) {
  return Math.max(0, getMonthlyBudget(doctor) - getAssignedHoursInMonth(doctor.id, month, year));
}

// ====================================================
// PERSISTENCE & EXPORT
// ====================================================
function saveToStorage() {
  localStorage.setItem(STORAGE_DOCTORS, JSON.stringify(state.doctors));
  localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(state.assignments));
}

function loadFromStorage() {
  try {
    const docs = localStorage.getItem(STORAGE_DOCTORS);
    const asgn = localStorage.getItem(STORAGE_ASSIGNMENTS);
    if (docs) state.doctors = JSON.parse(docs);
    if (asgn) state.assignments = JSON.parse(asgn);
  } catch (e) { console.error(e); }
}

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

// ====================================================
// EXCEL IMPORT / EXPORT
// ====================================================
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
  let currentPlace = null;
  let inDebtSection = false;
  let inPoolSection = false;
  const newAssignments = {};
  const debtDoctors = {};
  const poolDoctors = {};

  // Trova il mese e l'anno di riferimento del file Excel importato
  let importMonth = null;
  let importYear = null;
  for (const row of rows) {
    if (!row) continue;
    const c1 = row[1];
    if (c1) {
      const parsedDate = excelDateToDate(c1);
      if (parsedDate) {
        importMonth = parsedDate.getMonth();
        importYear = parsedDate.getFullYear();
        break;
      }
    }
  }

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue; // Salva la stabilità in caso di righe vuote

    const c0 = row[0] !== undefined ? String(row[0]).trim() : '';
    const c1 = row[1];
    const c3 = row[3] !== undefined ? String(row[3]).trim() : '';
    const c4 = row[4] !== undefined ? String(row[4]).trim() : '';

    // Rileva il titolo della sezione → estrae la sede
    if (c0 === 'Struttura') {
      const prev = rows[r - 1];
      if (prev && prev[1]) {
        const t = String(prev[1]);
        if (t.includes('Monte') || t.includes('Savino')) currentPlace = 'M.S.Savino';
        else if (t.includes('Subbiano')) currentPlace = 'Subbiano';
      }
      continue;
    }

    // Sezione Debito (colonna A)
    if (c0.includes('debito orario')) { inDebtSection = true; inPoolSection = false; continue; }
    // Sezione Pool (colonna D)
    if (c3.includes('disponibilità') || c3.includes('disponibili')) { inDebtSection = false; inPoolSection = true; continue; }

    // Analizza righe dei turni: "CdC ..." + data
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

    // Tabella Debito: col A = nome, col B = ore
    if (inDebtSection && c0 && c0 !== 'Medico' && !isNaN(parseFloat(row[1]))) {
      debtDoctors[c0] = parseFloat(row[1]);
    }
    // Tabella Pool: col D = nome, col E = ore
    if (inPoolSection && c3 && c3 !== 'Medico ' && row[4] !== undefined && !isNaN(parseFloat(row[4]))) {
      poolDoctors[c3] = parseFloat(row[4]);
    }
  }

  // Associa i nomi dei medici nel file Excel con quelli esistenti
  function matchDoctor(excelName) {
    if (!excelName) return null;
    const cleanExcel = excelName.replace('Dott. ', '').trim().toLowerCase();
    
    // 1. Cerca corrispondenza esatta per nome pulito
    let found = state.doctors.find(d => cleanDoctorName(d.name).toLowerCase() === cleanExcel);
    if (found) return found;

    // 2. Cerca corrispondenza per cognome (ultimo termine)
    const excelLast = cleanExcel.split(' ').slice(-1)[0];
    return state.doctors.find(d => {
      const docLast = cleanDoctorName(d.name).split(' ').slice(-1)[0].toLowerCase();
      return docLast === excelLast;
    });
  }

  // Cancella le assegnazioni esistenti per il mese/anno importati, per riflettere lo stato dell'Excel
  if (importMonth !== null && importYear !== null) {
    for (const key of Object.keys(state.assignments)) {
      const parts = key.split('_');
      const dateParts = parts[0].split('-');
      if (dateParts.length === 3) {
        const y = parseInt(dateParts[0]);
        const m = parseInt(dateParts[1]) - 1; // 0-indexed
        if (y === importYear && m === importMonth) {
          delete state.assignments[key];
        }
      }
    }
  }

  // Applica le nuove assegnazioni dall'Excel
  let assigned = 0;
  for (const [key, excelName] of Object.entries(newAssignments)) {
    const doc = matchDoctor(excelName);
    if (doc) {
      state.assignments[key] = doc.id;
      assigned++;
    }
  }

  // Sovrascrivi il budget mensile
  let debtCount = 0;
  for (const [excelName, hours] of Object.entries(debtDoctors)) {
    const doc = matchDoctor(excelName);
    if (doc) { doc.monthlyBudget = hours; debtCount++; }
  }
  for (const [excelName, hours] of Object.entries(poolDoctors)) {
    const doc = matchDoctor(excelName);
    if (doc) { doc.monthlyBudget = hours; doc.isPool = true; debtCount++; }
  }

  saveToStorage();
  renderAll();
  toast(`Importate ${assigned} assegnazioni, aggiornati ${debtCount} medici`, 'success');
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

  // Helper: find doctor name for a slot
  function getDocName(dateKey, slotKey, place) {
    const id = state.assignments[`${dateKey}_${slotKey}_${place}`];
    if (!id) return 'SCOPERTO!';
    const doc = getDoctorById(id);
    return doc ? doc.name.replace('Dott. ', '') : 'SCOPERTO!';
  }

  PLACES.forEach((place, pi) => {
    const title = pi === 0 ? 'CdC Spoke Civitella in Valdichiana/Monte San Savino'
                          : 'CdC Spoke Capolona/Castiglion Fibocchi/Subbiano';
    rows.push([title]);
    rows.push(['Struttura', 'Data', 'Giorno', 'Turno', 'Medico Assegnato']);

    // Use full place name for the first column
    const placeLabel = pi === 0 ? 'CdC Monte San Savino' : 'CdC Subbiano';

    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(year, month, day);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const dk = toDateKey(d);
      const dayName = DAY_SHORT[d.getDay()];

      rows.push([placeLabel, d, dayName, 'Mattina', getDocName(dk, 'mat', place)]);
      rows.push([placeLabel, d, dayName, 'Pomeriggio', getDocName(dk, 'pom', place)]);
    }
    rows.push([]);
  });

  // Debt / pool summary tables
  const primaries = state.doctors.filter(d => !d.isPool);
  const pools = state.doctors.filter(d => d.isPool);

  rows.push(['Medici con debito orario residuo', '', '', 'Medici in disponibilità aggiuntiva', '']);
  rows.push(['Medico', 'ORE*', '', 'Medico ', 'ORE*']);

  const maxRows = Math.max(primaries.length, pools.length);
  for (let i = 0; i < maxRows; i++) {
    const pd = i < primaries.length ? primaries[i] : null;
    const pp = i < pools.length ? pools[i] : null;
    rows.push([
      pd ? pd.name.replace('Dott. ', '') : '',
      pd ? Math.round(getRemainingMonthlyHours(pd, month, year)) : '',
      '',
      pp ? pp.name.replace('Dott. ', '') : '',
      pp ? Math.round(getRemainingMonthlyHours(pp, month, year)) : '',
    ]);
  }
  rows.push([]);
  rows.push(['*ore mensili']);

  // Build workbook and download
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Column widths
  ws['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws, monthName);
  XLSX.writeFile(wb, `turni-ruap-${monthName.toLowerCase()}-${year}.xlsx`);
  toast('Excel scaricato', 'success');
}

// ====================================================
// RENDERING UI
// ====================================================
function renderSidebar() {
  const weekEnd = new Date(state.sidebarWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 4);
  document.getElementById('sidebar-week-label').textContent = `${formatDateShort(state.sidebarWeekStart)} – ${formatDateShort(weekEnd)}`;
  
  const container = document.getElementById('sidebar-doctors');
  container.innerHTML = '';
  
  const filteredDocs = filterDoctors();
  
  if (filteredDocs.length === 0) {
    container.innerHTML = `<div class="text-center text-slate-400 py-6 text-sm">${searchQuery || filterAFT ? 'Nessun medico trovato' : 'Nessun medico registrato'}</div>`;
    return;
  }

  const docCardsSection = document.createElement('div');
  docCardsSection.className = 'space-y-3';

  filteredDocs.forEach(doc => {
    const color = getDoctorColor(doc);
    const assigned = getWeeklyAssignedHours(doc.id, state.sidebarWeekStart);
    const debt = doc.weeklyHours || 38;
    const pct = Math.min(100, Math.round((assigned / debt) * 100));
    const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';
    
    const card = document.createElement('div');
    card.className = `doctor-card rounded-xl border p-3 border-slate-200 bg-slate-50 cursor-pointer`;
    card.onclick = () => openDoctorModal(doc.id);
    card.innerHTML = `
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span class="w-3 h-3 rounded-full flex-shrink-0" style="background:${color.hex}"></span>
          <span class="font-semibold text-sm text-slate-800 truncate">${doc.name}</span>
          ${doc.preferredPlace ? '<span class="text-amber-500 text-xs ml-1">⭐</span>' : ''}
        </div>
        <div class="flex items-center gap-1">
          <button class="text-slate-400 hover:text-brand-600 text-xs" onclick="event.stopPropagation(); openDoctorModal('${doc.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="text-slate-400 hover:text-red-500 text-xs ml-1" onclick="event.stopPropagation(); deleteDoctor('${doc.id}')"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
      <div class="flex items-baseline justify-between mb-1.5">
        <span class="text-xs text-slate-500">${doc.patients ? doc.patients + ' paz.' : ''} ${doc.aft ? '• AFT ' + doc.aft : ''}</span>
        <span class="text-xs font-bold text-slate-700">${assigned}h / ${debt}h</span>
      </div>
      <div class="w-full bg-slate-200 rounded-full h-2">
        <div class="h-2 rounded-full transition-all" style="width: ${pct}%; background:${barColor}"></div>
      </div>
    `;
    docCardsSection.appendChild(card);
  });
  container.appendChild(docCardsSection);
}

function renderCalendar() {
  const year = state.calYear;
  const month = state.calMonth;
  document.getElementById('cal-title').textContent = `${MONTHS_IT[month]} ${year}`;
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = getWeekStart(firstDay);

  let currentWeekStart = new Date(startDate);
  const weeks = [];
  while (true) {
    if (currentWeekStart > lastDay) break;
    weeks.push(new Date(currentWeekStart));
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  weeks.forEach(weekStart => {
    const weekRow = document.createElement('div');
    weekRow.className = 'grid grid-cols-5 gap-2';
    for (let i = 0; i < 5; i++) {
      const cellDate = new Date(weekStart);
      cellDate.setDate(cellDate.getDate() + i);
      const dateKey = toDateKey(cellDate);
      const inMonth = cellDate.getMonth() === month;
      const isToday = toDateKey(new Date()) === dateKey;

      const cell = document.createElement('div');
      cell.className = `rounded-xl p-2 min-h-24 ${inMonth ? 'bg-white shadow-sm border border-slate-100' : 'bg-slate-50 opacity-40 border border-dashed border-slate-200'}`;
      
      cell.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold ${isToday ? 'bg-brand-700 text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-slate-500'}">${cellDate.getDate()}</span>
        </div>
      `;

      PLACES.forEach(place => {
        const placeSection = document.createElement('div');
        placeSection.className = 'mb-1.5 pb-1.5 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0';
        
        const matKey = `${dateKey}_mat_${place}`;
        const pomKey = `${dateKey}_pom_${place}`;
        const matAssigned = !!state.assignments[matKey];
        const pomAssigned = !!state.assignments[pomKey];
        const bothAssigned = matAssigned && pomAssigned;
        const coverageClass = bothAssigned ? 'bg-green-100 text-green-700' : (matAssigned || pomAssigned) ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
        const coverageIcon = bothAssigned ? '✓' : (matAssigned || pomAssigned) ? '◐' : '○';
        
        placeSection.innerHTML = `<div class="flex items-center justify-between mb-1">
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${place}</div>
          <span class="text-[10px] font-bold ${coverageClass} px-1.5 py-0.5 rounded-full">${coverageIcon}</span>
        </div>`;

        SLOTS.forEach(slot => {
          const slotKey = `${dateKey}_${slot.key}_${place}`;
          const assignedId = state.assignments[slotKey];
          const assignedDoc = assignedId ? getDoctorById(assignedId) : null;
          const color = assignedDoc ? getDoctorColor(assignedDoc) : null;

          const slotBtn = document.createElement('button');
          slotBtn.className = 'slot-btn w-full text-left rounded-lg px-2 py-1 mb-0.5 text-xs font-medium border transition-all ' +
            (assignedDoc ? 'border-transparent text-white shadow-sm' : inMonth ? 'border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-brand-400 hover:bg-blue-50 hover:text-brand-700' : 'border-transparent bg-transparent cursor-default');
          if (assignedDoc && color) slotBtn.style.backgroundColor = color.hex;

          slotBtn.innerHTML = assignedDoc
            ? `<div class="truncate font-semibold text-xs">${cleanDoctorName(assignedDoc.name)}</div><div class="text-[10px] opacity-80">${slot.icon} ${slot.label}</div>`
            : `<div class="text-slate-400 text-xs">${slot.icon} <span class="text-slate-400">Assegna</span></div>`;

          if (inMonth) slotBtn.addEventListener('click', (e) => openAssignDropdown(e, slotKey, slot, dateKey, place));
          placeSection.appendChild(slotBtn);
        });
        cell.appendChild(placeSection);
      });
      weekRow.appendChild(cell);
    }
    grid.appendChild(weekRow);
  });
}

// ====================================================
// DROPDOWN & MODALS
// ====================================================
function openAssignDropdown(e, slotKey, slot, dateKey, place) {
  e.stopPropagation();
  state.activeSlotKey = slotKey;
  const dropdown = document.getElementById('assign-dropdown');
  const list = document.getElementById('assign-list');
  const removeWrap = document.getElementById('assign-remove-wrap');
  
  const date = new Date(dateKey + 'T00:00:00');
  document.getElementById('assign-slot-label').textContent = `${place} — ${date.toLocaleDateString('it-IT', {weekday:'short', day:'numeric', month:'short'})} ${slot.label}`;

  const availDocs = state.doctors
    .filter(doc => isDoctorAvailableForSlot(doc, dateKey, slot.key))
    .filter(doc => {
      if (state.assignments[slotKey] === doc.id) return true;
      const prefix = `${dateKey}_${slot.key}_`;
      return !Object.entries(state.assignments)
        .some(([k, v]) => v === doc.id && k.startsWith(prefix));
    })
    .sort((a, b) => {
      const aP = a.preferredPlace === place ? 0 : 1;
      const bP = b.preferredPlace === place ? 0 : 1;
      return aP - bP;
    });
  list.innerHTML = '';
  if (availDocs.length === 0) {
    list.innerHTML = '<p class="text-xs text-slate-400 italic py-2 px-1">Nessun medico disponibile</p>';
  } else {
    availDocs.forEach(doc => {
      const color = getDoctorColor(doc);
      const isPref = doc.preferredPlace === place;
      const weeklyH = getWeeklyAssignedHours(doc.id, getWeekStart(new Date(dateKey + 'T00:00:00')));
      const pct = Math.min(100, Math.round((weeklyH / (doc.weeklyHours || 24)) * 100));
      const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';
      const btn = document.createElement('button');
      btn.className = 'w-full text-left rounded-lg px-3 py-2 hover:bg-slate-100 flex items-start gap-2 transition';
      btn.innerHTML = `
        <span class="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style="background:${color.hex}"></span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <span class="font-medium text-sm">${doc.name}</span>
            ${isPref ? '<span class="text-amber-500 text-xs">⭐</span>' : ''}
          </div>
          <div class="flex items-center gap-1 mt-0.5">
            <div class="flex-1 h-1.5 bg-slate-100 rounded-full"><div style="width:${pct}%; background:${barColor}" class="h-1.5 rounded-full transition-all"></div></div>
            <span class="text-[10px] text-slate-400 flex-shrink-0">${weeklyH}/${doc.weeklyHours || 24}h</span>
          </div>
        </div>
      `;
      btn.addEventListener('click', () => { pushHistory(); state.assignments[slotKey] = doc.id; saveToStorage(); closeAssignDropdown(); renderAll(); renderStats(); });
      list.appendChild(btn);
    });
  }
  removeWrap.classList.toggle('hidden', !state.assignments[slotKey]);
  const rect = e.currentTarget.getBoundingClientRect();
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
  dropdown.classList.remove('hidden');
}

document.getElementById('assign-remove').addEventListener('click', () => {
  if (state.activeSlotKey) { pushHistory(); delete state.assignments[state.activeSlotKey]; saveToStorage(); closeAssignDropdown(); renderAll(); renderStats(); }
});

function closeAssignDropdown() {
  document.getElementById('assign-dropdown').classList.add('hidden');
  state.activeSlotKey = null;
}
document.addEventListener('click', (e) => { if (!document.getElementById('assign-dropdown').contains(e.target)) closeAssignDropdown(); });
document.getElementById('assign-close').addEventListener('click', closeAssignDropdown);

// Modale Medico Logic (Simplified for brevity but fully functional)
function openDoctorModal(doctorId = null) {
  state.editingDoctorId = doctorId;
  document.getElementById('doctor-modal').classList.remove('hidden');
  document.getElementById('modal-doctor-id').value = doctorId || '';
  if (doctorId) {
    const doc = getDoctorById(doctorId);
    document.getElementById('modal-name').value = doc.name;
    document.getElementById('modal-patients').value = doc.patients || '';
    document.getElementById('modal-hours').value = calculateDebtByPatients(doc.patients || 0);
    renderColorPicker(doc.colorIndex ?? 0);
    
    const ppSelect = document.getElementById('modal-preferred-place');
    if (ppSelect) {
      ppSelect.innerHTML = '<option value="">-- Nessuna preferenza --</option>';
      PLACES.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        if (doc.preferredPlace === p) opt.selected = true;
        ppSelect.appendChild(opt);
      });
    }
    
    document.getElementById('modal-monthly-budget').value = doc.monthlyBudget || '';
    document.getElementById('modal-is-pool').checked = doc.isPool || false;
    document.getElementById('modal-aft').value = doc.aft || '';
    document.getElementById('modal-seniority').value = doc.seniority || '';
    
    renderAvailabilityTable(doc.availability);

    // Popola i periodi di indisponibilità esistenti
    const container = document.getElementById('unavail-periods');
    if (container) {
      container.innerHTML = '';
      if (doc.unavailPeriods && doc.unavailPeriods.length > 0) {
        doc.unavailPeriods.forEach(p => {
          addUnavailPeriodRow(p.from, p.to);
        });
      }
    }
  } else {
    document.getElementById('modal-name').value = '';
    document.getElementById('modal-patients').value = '';
    document.getElementById('modal-hours').value = '38';
    renderColorPicker(0);
    
    const ppSelect = document.getElementById('modal-preferred-place');
    if (ppSelect) {
      ppSelect.innerHTML = '<option value="">-- Nessuna preferenza --</option>';
      PLACES.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        ppSelect.appendChild(opt);
      });
    }
    
    document.getElementById('modal-monthly-budget').value = '';
    document.getElementById('modal-is-pool').checked = false;
    document.getElementById('modal-aft').value = '';
    document.getElementById('modal-seniority').value = '';
    
    renderAvailabilityTable(null);

    // Pulisce i periodi di indisponibilità per un nuovo medico
    const container = document.getElementById('unavail-periods');
    if (container) {
      container.innerHTML = '';
    }
  }
}

function renderAvailabilityTable(availability) {
  const tbody = document.getElementById('avail-table');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const dayLabels = { lun: 'Lunedì', mar: 'Martedì', mer: 'Mercoledì', gio: 'Giovedì', ven: 'Venerdì' };
  
  DAY_KEYS.forEach(dayKey => {
    const dayAvail = availability?.[dayKey] || { mat: true, pom: true };
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100';
    tr.innerHTML = `
      <td class="px-3 py-2 font-medium text-slate-700">${dayLabels[dayKey]}</td>
      <td class="px-3 py-2 text-center">
        <input type="checkbox" class="w-5 h-5 rounded text-brand-600" id="avail-${dayKey}-mat" ${dayAvail.mat ? 'checked' : ''}>
      </td>
      <td class="px-3 py-2 text-center">
        <input type="checkbox" class="w-5 h-5 rounded text-brand-600" id="avail-${dayKey}-pom" ${dayAvail.pom ? 'checked' : ''}>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
function renderColorPicker(selectedIndex) {
  const container = document.getElementById('color-picker');
  container.innerHTML = '';
  COLOR_PALETTE.forEach((c, i) => {
    const btn = document.createElement('button'); btn.type = 'button';
    btn.className = `w-8 h-8 rounded-full border-2 ${i === selectedIndex ? 'border-slate-800' : 'border-transparent'}`;
    btn.style.backgroundColor = c.hex; btn.dataset.colorIndex = i;
    btn.addEventListener('click', () => {
      container.querySelectorAll('button').forEach(b => b.classList.add('border-transparent'));
      btn.classList.add('border-slate-800'); btn.classList.remove('border-transparent');
    });
    container.appendChild(btn);
  });
}
function closeDoctorModal() { document.getElementById('doctor-modal').classList.add('hidden'); }
document.getElementById('btn-add-doctor').addEventListener('click', () => openDoctorModal());
document.getElementById('modal-close').addEventListener('click', closeDoctorModal);
document.getElementById('modal-cancel').addEventListener('click', closeDoctorModal);
document.getElementById('modal-save').addEventListener('click', () => {
  const name = document.getElementById('modal-name').value;
  const patients = parseInt(document.getElementById('modal-patients').value) || 0;
  const weeklyHours = calculateDebtByPatients(patients);
  const colorBtn = document.querySelector('#color-picker button.border-slate-800');
  const colorIndex = colorBtn ? parseInt(colorBtn.dataset.colorIndex) : 0;
  
  const availability = {};
  DAY_KEYS.forEach(dk => {
    availability[dk] = {
      mat: document.getElementById(`avail-${dk}-mat`)?.checked ?? true,
      pom: document.getElementById(`avail-${dk}-pom`)?.checked ?? true
    };
  });

  const preferredPlace = document.getElementById('modal-preferred-place')?.value || null;
  const monthlyBudgetVal = document.getElementById('modal-monthly-budget')?.value;
  const monthlyBudget = monthlyBudgetVal ? parseInt(monthlyBudgetVal) : undefined;
  const isPool = document.getElementById('modal-is-pool')?.checked || false;
  const aft = document.getElementById('modal-aft')?.value || '';
  const seniority = parseInt(document.getElementById('modal-seniority')?.value) || 0;

  const unavailPeriods = [];
  document.querySelectorAll('#unavail-periods .unavail-period-row').forEach(row => {
    const fromVal = row.querySelector('.unavail-from').value;
    const toVal = row.querySelector('.unavail-to').value;
    if (fromVal && toVal) {
      unavailPeriods.push({ from: fromVal, to: toVal });
    }
  });

  if (state.editingDoctorId) {
    const doc = getDoctorById(state.editingDoctorId);
    Object.assign(doc, { name, patients, weeklyHours, colorIndex, availability, preferredPlace, monthlyBudget, isPool, aft, seniority, unavailPeriods });
  } else {
    state.doctors.push({ id: generateId(), name, patients, weeklyHours, colorIndex, preferredPlace, monthlyBudget, isPool, aft, seniority, availability, unavailPeriods });
  }
  pushHistory();
  saveToStorage(); closeDoctorModal(); renderAll();
  toast('Medico salvato', 'success');
});
function deleteDoctor(id) {
  const doc = getDoctorById(id);
  if (!doc) return;
  // Use a small inline confirm toast
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast-item pointer-events-auto bg-white border border-red-200 rounded-xl shadow-lg px-4 py-3 text-sm flex items-center gap-3';
  el.innerHTML = `
    <span class="text-slate-700 flex-1">Eliminare <strong>${doc.name}</strong>?</span>
    <button class="bg-red-600 hover:bg-red-500 text-white rounded-lg px-3 py-1 text-xs font-bold" id="confirm-delete-${id}">Sì, elimina</button>
    <button class="text-slate-400 hover:text-slate-600 text-xs font-bold" id="cancel-delete-${id}">Annulla</button>
  `;
  container.appendChild(el);
  document.getElementById(`confirm-delete-${id}`).onclick = () => {
    pushHistory();
    state.doctors = state.doctors.filter(d => d.id !== id);
    Object.keys(state.assignments).forEach(k => { if (state.assignments[k] === id) delete state.assignments[k]; });
    saveToStorage(); renderAll(); el.remove();
    toast(`${doc.name} rimosso`, 'info');
  };
  document.getElementById(`cancel-delete-${id}`).onclick = () => el.remove();
  setTimeout(() => { if (el.parentNode) el.remove(); }, 5000);
}

function resetAssignments() {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast-item pointer-events-auto bg-white border border-orange-200 rounded-xl shadow-lg px-4 py-3 text-sm flex items-center gap-3';
  el.innerHTML = `
    <span class="text-slate-700 flex-1">Sei sicuro di voler resettare <strong>tutti i turni</strong>? I medici e le preferenze rimarranno.</span>
    <button class="bg-orange-600 hover:bg-orange-500 text-white rounded-lg px-3 py-1 text-xs font-bold" id="confirm-reset-all">Sì, resetta</button>
    <button class="text-slate-400 hover:text-slate-600 text-xs font-bold" id="cancel-reset-all">Annulla</button>
  `;
  container.appendChild(el);
  document.getElementById('confirm-reset-all').onclick = () => {
    pushHistory();
    state.assignments = {};
    saveToStorage(); renderAll(); el.remove(); updateConflictsHeaderBadge();
    toast('Tutti i turni resettati', 'success');
  };
  document.getElementById('cancel-reset-all').onclick = () => el.remove();
  setTimeout(() => { if (el.parentNode) el.remove(); }, 5000);
}

// Navigazione
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

function renderAll() {
  updateGeneraButtonLabel();
  renderCalendar();
  renderSidebar();
  renderMonthlyStats();
  updateConflictsHeaderBadge();
}

function toggleCalendarView() {
  state.calendarView = state.calendarView === 'monthly' ? 'weekly' : 'monthly';
  const icon = document.getElementById('view-toggle-icon');
  const label = document.getElementById('view-toggle-label');
  if (state.calendarView === 'weekly') {
    icon.className = 'fa-solid fa-calendar-day';
    label.textContent = 'Settimanale';
  } else {
    icon.className = 'fa-solid fa-calendar-week';
    label.textContent = 'Mensile';
  }
  renderCalendar();
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
  
  document.getElementById('cal-title').textContent = `${formatDateShort(weekStart)} – ${formatDateShort(weekEnd)}`;
  document.getElementById('cal-grid').innerHTML = '';
  
  const weekRow = document.createElement('div');
  weekRow.className = 'grid grid-cols-5 gap-2';
  
  for (let i = 0; i < 5; i++) {
    const cellDate = new Date(weekStart);
    cellDate.setDate(cellDate.getDate() + i);
    const dateKey = toDateKey(cellDate);
    const isToday = toDateKey(new Date()) === dateKey;
    const isHoliday = isItalianHoliday(cellDate);
    
    const cell = document.createElement('div');
    if (isHoliday) {
      cell.className = 'rounded-xl p-3 min-h-48 holiday-cell border border-slate-200 flex flex-col justify-between';
      cell.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-bold ${isToday ? 'bg-brand-700 text-white rounded-full w-7 h-7 flex items-center justify-center' : 'text-slate-500'}">${cellDate.getDate()}</span>
          <span class="text-[9px] font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded uppercase tracking-wider">Festivo</span>
        </div>
        <div class="flex-1 flex items-center justify-center py-12 text-xs font-bold text-red-500 uppercase tracking-widest">
          Chiuso
        </div>
      `;
    } else {
      cell.className = 'rounded-xl p-3 min-h-48 bg-white shadow-sm border border-slate-200';
      cell.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-bold ${isToday ? 'bg-brand-700 text-white rounded-full w-7 h-7 flex items-center justify-center' : 'text-slate-500'}">${cellDate.getDate()}</span>
          <span class="text-xs text-slate-400">${cellDate.toLocaleDateString('it-IT', { weekday: 'short' })}</span>
        </div>
      `;
      
      PLACES.forEach(place => {
        const placeSection = document.createElement('div');
        placeSection.className = 'mb-2 pb-2 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0';
        
        const matKey = `${dateKey}_mat_${place}`;
        const pomKey = `${dateKey}_pom_${place}`;
        const matAssigned = !!state.assignments[matKey];
        const pomAssigned = !!state.assignments[pomKey];
        const bothAssigned = matAssigned && pomAssigned;
        const coverageClass = bothAssigned ? 'bg-green-100 text-green-700' : (matAssigned || pomAssigned) ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
        const coverageIcon = bothAssigned ? '✓' : (matAssigned || pomAssigned) ? '◐' : '○';
        
        placeSection.innerHTML = `<div class="flex items-center justify-between mb-1">
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${place}</div>
          <button onclick="copyWeek('${dateKey}')" class="text-[10px] text-brand-500 hover:text-brand-700 font-bold ml-1" title="Copia giorno"><i class="fa-solid fa-copy"></i></button>
          <span class="text-[10px] font-bold ${coverageClass} px-1.5 py-0.5 rounded-full">${coverageIcon}</span>
        </div>`;
        
        SLOTS.forEach(slot => {
          const slotKey = `${dateKey}_${slot.key}_${place}`;
          const assignedId = state.assignments[slotKey];
          const assignedDoc = assignedId ? getDoctorById(assignedId) : null;
          const color = assignedDoc ? getDoctorColor(assignedDoc) : null;
          
          const slotBtn = document.createElement('button');
          slotBtn.className = 'slot-btn w-full text-left rounded-lg px-2 py-1.5 mb-1 text-xs font-medium border transition-all ' +
            (assignedDoc ? 'border-transparent text-white shadow-sm' : 'border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-brand-400 hover:bg-blue-50 hover:text-brand-700');
          if (assignedDoc && color) slotBtn.style.backgroundColor = color.hex;
          
          slotBtn.innerHTML = assignedDoc
            ? `<div class="truncate font-semibold text-xs">${cleanDoctorName(assignedDoc.name)}</div><div class="text-[10px] opacity-80">${slot.icon} ${slot.label}</div>`
            : `<div class="text-slate-400 text-xs">${slot.icon} <span class="text-slate-400">Assegna</span></div>`;
          
          slotBtn.addEventListener('click', (e) => openAssignDropdown(e, slotKey, slot, dateKey, place));
          placeSection.appendChild(slotBtn);
        });
        
        cell.appendChild(placeSection);
      });
    }
    weekRow.appendChild(cell);
  }
  
  document.getElementById('cal-grid').appendChild(weekRow);
}

function renderCalendarMonth() {
  const year = state.calYear;
  const month = state.calMonth;
  document.getElementById('cal-title').textContent = `${MONTHS_IT[month]} ${year}`;
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = getWeekStart(firstDay);

  let currentWeekStart = new Date(startDate);
  const weeks = [];
  while (true) {
    if (currentWeekStart > lastDay) break;
    weeks.push(new Date(currentWeekStart));
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  weeks.forEach(weekStart => {
    const weekRow = document.createElement('div');
    weekRow.className = 'grid grid-cols-5 gap-2';
    for (let i = 0; i < 5; i++) {
      const cellDate = new Date(weekStart);
      cellDate.setDate(cellDate.getDate() + i);
      const dateKey = toDateKey(cellDate);
      const inMonth = cellDate.getMonth() === month;
      const isToday = toDateKey(new Date()) === dateKey;
      const isHoliday = isItalianHoliday(cellDate);

      const cell = document.createElement('div');
      if (isHoliday) {
        cell.className = `rounded-xl p-2 min-h-24 holiday-cell border border-slate-100 flex flex-col justify-between ${inMonth ? '' : 'opacity-40'}`;
        cell.innerHTML = `
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold ${isToday ? 'bg-brand-700 text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-slate-500'}">${cellDate.getDate()}</span>
            <span class="text-[9px] font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded uppercase tracking-wider">Festivo</span>
          </div>
          <div class="flex-1 flex items-center justify-center py-4 text-[11px] font-bold text-red-500 uppercase tracking-widest">
            Chiuso
          </div>
        `;
      } else {
        cell.className = `rounded-xl p-2 min-h-24 ${inMonth ? 'bg-white shadow-sm border border-slate-100' : 'bg-slate-50 opacity-40 border border-dashed border-slate-200'}`;
        cell.innerHTML = `
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold ${isToday ? 'bg-brand-700 text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-slate-500'}">${cellDate.getDate()}</span>
          </div>
        `;

        PLACES.forEach(place => {
          const placeSection = document.createElement('div');
          placeSection.className = 'mb-1.5 pb-1.5 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0';
          
          const matKey = `${dateKey}_mat_${place}`;
          const pomKey = `${dateKey}_pom_${place}`;
          const matAssigned = !!state.assignments[matKey];
          const pomAssigned = !!state.assignments[pomKey];
          const bothAssigned = matAssigned && pomAssigned;
          const coverageClass = bothAssigned ? 'bg-green-100 text-green-700' : (matAssigned || pomAssigned) ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
          const coverageIcon = bothAssigned ? '✓' : (matAssigned || pomAssigned) ? '◐' : '○';
          
          placeSection.innerHTML = `<div class="flex items-center justify-between mb-1">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${place}</div>
            <span class="text-[10px] font-bold ${coverageClass} px-1.5 py-0.5 rounded-full">${coverageIcon}</span>
          </div>`;

          SLOTS.forEach(slot => {
            const slotKey = `${dateKey}_${slot.key}_${place}`;
            const assignedId = state.assignments[slotKey];
            const assignedDoc = assignedId ? getDoctorById(assignedId) : null;
            const color = assignedDoc ? getDoctorColor(assignedDoc) : null;

            const slotBtn = document.createElement('button');
            slotBtn.className = 'slot-btn w-full text-left rounded-lg px-2 py-1 mb-0.5 text-xs font-medium border transition-all ' +
              (assignedDoc ? 'border-transparent text-white shadow-sm' : inMonth ? 'border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-brand-400 hover:bg-blue-50 hover:text-brand-700' : 'border-transparent bg-transparent cursor-default');
            if (assignedDoc && color) slotBtn.style.backgroundColor = color.hex;

            slotBtn.innerHTML = assignedDoc
              ? `<div class="truncate font-semibold text-xs">${cleanDoctorName(assignedDoc.name)}</div><div class="text-[10px] opacity-80">${slot.icon} ${slot.label}</div>`
              : `<div class="text-slate-400 text-xs">${slot.icon} <span class="text-slate-400">Assegna</span></div>`;

            if (inMonth) slotBtn.addEventListener('click', (e) => openAssignDropdown(e, slotKey, slot, dateKey, place));
            placeSection.appendChild(slotBtn);
          });
          cell.appendChild(placeSection);
        });
      }
      weekRow.appendChild(cell);
    }
    grid.appendChild(weekRow);
  });
}

// ====================================================
// AUTO-ASSIGN LOCALE (no API required)
// ====================================================
function runAutoAssignForMonth(year, month) {
  if (state.doctors.length === 0) {
    toast('Aggiungi prima dei medici', 'warning');
    return;
  }

  pushHistory();
  const monthName = MONTHS_IT[month];
  const lastDay = new Date(year, month + 1, 0).getDate();

  const slotsToProcess = [];
  for (let day = 1; day <= lastDay; day++) {
    const cellDate = new Date(year, month, day);
    // Salta fine settimana e festività nazionali
    if (cellDate.getDay() === 0 || cellDate.getDay() === 6 || isItalianHoliday(cellDate)) continue;
    const dateKey = toDateKey(cellDate);
    SLOTS.forEach(slot => {
      PLACES.forEach(place => {
        const slotKey = `${dateKey}_${slot.key}_${place}`;
        if (!state.assignments[slotKey]) slotsToProcess.push({ dateKey, slotKey, cellDate });
      });
    });
  }

  if (slotsToProcess.length === 0) {
    toast(`Nessun turno vuoto in ${monthName}`, 'info');
    return;
  }

  // Track hours assigned in target month per doctor
  const assignedInTarget = {};
  state.doctors.forEach(d => {
    assignedInTarget[d.id] = getAssignedHoursInMonth(d.id, month, year);
  });
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
      const place = parts.slice(2).join('_');

      // Constraint: not already assigned to same date+slot at another place
      const notBusy = (doc) => {
        const prefix = `${dateKey}_${slotKeyOnly}_`;
        return !Object.entries(state.assignments).some(([k, v]) => v === doc.id && k.startsWith(prefix));
      };

      // Available = not busy, available for slot, has remaining hours
      const availablePrimary = primaryDocs.filter(doc =>
        isDoctorAvailableForSlot(doc, dateKey, slotKeyOnly)
        && notBusy(doc)
        && getEffectiveRemaining(doc) > 0
      );
      const availablePool = poolDocs.filter(doc =>
        isDoctorAvailableForSlot(doc, dateKey, slotKeyOnly)
        && notBusy(doc)
        && getEffectiveRemaining(doc) > 0
      );

      // Tier 1: preferred place (among primary)
      const prefPrimary = availablePrimary.filter(d => d.preferredPlace === place);
      // Tier 2: no preference (among primary)
      const neutralPrimary = availablePrimary.filter(d => !d.preferredPlace);
      // Tier 3: non-preferred place (among primary)
      const nonPrefPrimary = availablePrimary.filter(d => d.preferredPlace && d.preferredPlace !== place);

      // Tier 4-6: same for pool
      const prefPool = availablePool.filter(d => d.preferredPlace === place);
      const neutralPool = availablePool.filter(d => !d.preferredPlace);
      const nonPrefPool = availablePool.filter(d => d.preferredPlace && d.preferredPlace !== place);

      // Build priority cascade
      const priorityGroups = [
        prefPrimary, neutralPrimary, nonPrefPrimary,
        prefPool, neutralPool, nonPrefPool,
      ];

      let chosen = null;
      for (const group of priorityGroups) {
        if (group.length > 0) {
          group.sort((a, b) => getEffectiveRemaining(b) - getEffectiveRemaining(a));
          chosen = group[0];
          break;
        }
      }

      if (!chosen) continue;

      state.assignments[slotKey] = chosen.id;
      assignedInTarget[chosen.id] = (assignedInTarget[chosen.id] || 0) + 6;
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

// ====================================================
// GENERA MESE SUCCESSIVO
// ====================================================
function generateNextMonth() {
  const nextMonth = state.calMonth === 11 ? 0 : state.calMonth + 1;
  const nextYear = state.calMonth === 11 ? state.calYear + 1 : state.calYear;
  runAutoAssignForMonth(nextYear, nextMonth);
}

function updateGeneraButtonLabel() {
  const btn = document.getElementById('btn-genera-label');
  if (!btn) return;
  const nextMonth = state.calMonth === 11 ? 0 : state.calMonth + 1;
  btn.textContent = 'Genera ' + MONTHS_IT[nextMonth];
}

function buildPdfContent() {
  const year = state.calYear;
  const month = state.calMonth;
  const monthName = MONTHS_IT[month];

  document.getElementById('pdf-subtitle').textContent = `${monthName} ${year} — Sedi: ${PLACES.join(', ')}`;
  document.getElementById('pdf-footer').textContent = `Generato il ${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} — RUAP Attività Diurne`;

  const table = document.getElementById('pdf-table');
  table.innerHTML = '';
  const doctorMap = Object.fromEntries(state.doctors.map(d => [d.id, d]));

  PLACES.forEach(place => {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 24px;';

    const placeTitle = document.createElement('h2');
    placeTitle.style.cssText = 'font-size: 15px; font-weight: bold; color: #1e40af; margin: 0 0 8px; padding: 6px 10px; background: #eff6ff; border-radius: 6px;';
    placeTitle.textContent = place;
    section.appendChild(placeTitle);

    const t = document.createElement('table');
    t.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 13px;';

    // Header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.cssText = 'background: #1e40af; color: white;';
    ['Data', 'Giorno', ...SLOTS.map(s => s.label)].forEach(h => {
      const th = document.createElement('th');
      th.style.cssText = 'padding: 8px 12px; text-align: left; font-weight: bold;';
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    t.appendChild(thead);

    // Data rows (weekdays only)
    const tbody = document.createElement('tbody');
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(year, month, day);
      const jsDay = d.getDay();
      if (jsDay === 0 || jsDay === 6) continue;

      const dateKey = toDateKey(d);
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
      const isToday = dateKey === toDateKey(new Date());

      const tr = document.createElement('tr');
      tr.style.cssText = `border-bottom: 1px solid #e2e8f0; ${isToday ? 'background: #eff6ff;' : day % 2 === 0 ? 'background: #f8fafc;' : ''}`;

      const tdDate = document.createElement('td');
      tdDate.style.cssText = 'padding: 5px 8px; font-weight: bold; color: #1e40af;';
      tdDate.textContent = `${day}/${month + 1}`;
      tr.appendChild(tdDate);

      const tdDay = document.createElement('td');
      tdDay.style.cssText = 'padding: 5px 8px; color: #64748b;';
      tdDay.textContent = dayNames[jsDay];
      tr.appendChild(tdDay);

      SLOTS.forEach(slot => {
        const key = `${dateKey}_${slot.key}_${place}`;
        const doc = state.assignments[key] ? doctorMap[state.assignments[key]] : null;
        const td = document.createElement('td');
        td.style.cssText = 'padding: 8px 12px; overflow-wrap: break-word; word-break: break-word;';
        if (doc) {
          const color = getDoctorColor(doc);
          td.innerHTML = `<span style="background:${color.hex}; color:white; padding: 4px 12px; border-radius: 4px; font-weight:bold; display: inline-block; white-space: normal;">${cleanDoctorName(doc.name)}</span>`;
        } else {
          td.innerHTML = '<span style="color: #cbd5e1;">—</span>';
        }
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    }
    t.appendChild(tbody);
    section.appendChild(t);
    table.appendChild(section);
  });
}

async function exportPDF() {
  buildPdfContent();
  const el = document.getElementById('pdf-content');
  el.classList.remove('hidden');

  try {
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableW = pageW - 2 * margin;
    const usableH = pageH - 2 * margin;
    const imgW = canvas.width;
    const imgH = canvas.height;
    const scaleRatio = usableW / imgW;
    const totalRenderH = imgH * scaleRatio;
    const pagesNeeded = Math.ceil(totalRenderH / usableH);

    for (let p = 0; p < pagesNeeded; p++) {
      const startY = p * usableH / scaleRatio;
      const pageRenderH = Math.min(usableH, totalRenderH - p * usableH);
      const chunkImgH = pageRenderH / scaleRatio;
      const chunkCanvas = document.createElement('canvas');
      chunkCanvas.width = imgW;
      chunkCanvas.height = Math.ceil(chunkImgH);
      const ctx = chunkCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, startY, imgW, chunkImgH, 0, 0, imgW, chunkImgH);
      if (p > 0) pdf.addPage('a4', 'landscape');
      pdf.addImage(chunkCanvas.toDataURL('image/png'), 'PNG', margin, margin, usableW, pageRenderH);
    }

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
// GEMINI AI INTEGRATION
// ====================================================

async function callGeminiToAssign() {
  if (state.doctors.length === 0) {
    toast('Aggiungi prima dei medici', 'warning');
    return;
  }

  pushHistory();
  const year = state.calYear;
  const month = state.calMonth;
  const lastDay = new Date(year, month + 1, 0).getDate();
  
  const emptySlots = [];
  for (let day = 1; day <= lastDay; day++) {
    const cellDate = new Date(year, month, day);
    const jsDay = cellDate.getDay();
    if (jsDay === 0 || jsDay === 6) continue;
    const dateKey = toDateKey(cellDate);
    
    PLACES.forEach(place => {
      SLOTS.forEach(slot => {
        const slotKey = `${dateKey}_${slot.key}_${place}`;
        if (!state.assignments[slotKey]) emptySlots.push(slotKey);
      });
    });
  }

  if (emptySlots.length === 0) {
    toast('Nessun turno vuoto da assegnare', 'info');
    return;
  }

  document.getElementById('gemini-loading').classList.remove('hidden');
  const loadingText = document.getElementById('gemini-loading-text');
  if (loadingText) loadingText.textContent = `Invio richiesta a Gemini AI...`;

  const promptData = {
    task: "Assign doctors to the empty hospital shifts.",
    rules: "Do not assign the same doctor to two different places on the same day and time slot. Respect the weeklyHours limit (6 hours per shift). Return a JSON object where the key is the shift string and the value is the doctor ID. Output ONLY valid JSON, no markdown formatting.",
    doctors: state.doctors.map(d => ({ id: d.id, name: d.name, maxWeeklyHours: d.weeklyHours })),
    emptyShiftsToFill: emptySlots,
    alreadyAssignedShifts: state.assignments
  };

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: JSON.stringify(promptData) }] }],
        generationConfig: { 
          response_mime_type: "application/json",
          temperature: 0.2
        } 
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const generatedJsonText = data.candidates[0].content.parts[0].text;
    if (loadingText) loadingText.textContent = `Elaborazione della risposta...`;
    const newAssignments = JSON.parse(generatedJsonText);

    let count = 0;
    for (const [key, doctorId] of Object.entries(newAssignments)) {
      if (emptySlots.includes(key)) {
        state.assignments[key] = doctorId;
        count++;
      }
    }

    if (loadingText) loadingText.textContent = `Applicazione delle assegnazioni...`;
    saveToStorage();
    renderAll();
    renderStats();
    updateConflictsHeaderBadge();
    toast(`Assegnati ${count} turni automaticamente`, 'success');

  } catch (err) {
    console.error(err);
    toast('Errore AI: ' + err.message, 'error');
  } finally {
    // Hide loading overlay
    document.getElementById('gemini-loading').classList.add('hidden');
  }
}

// Event listeners (defensive checks for optional buttons)
const btnGemini = document.getElementById('btn-gemini-assign');
if (btnGemini) btnGemini.addEventListener('click', callGeminiToAssign);
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
  if (e.target.id === 'instructions-modal') {
    e.target.classList.add('hidden');
  }
});
document.getElementById('close-instructions')?.addEventListener('click', closeInstructions);
document.getElementById('close-instructions-bottom')?.addEventListener('click', closeInstructions);
const btnResetAssignments = document.getElementById('btn-reset-assignments');
if (btnResetAssignments) {
  btnResetAssignments.addEventListener('click', resetAssignments);
}
const btnConflicts = document.getElementById('btn-conflicts');
if (btnConflicts) {
  btnConflicts.addEventListener('click', openConflictsModal);
}
document.getElementById('conflicts-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'conflicts-modal') closeConflictsModal();
});
const btnRestartWizard = document.getElementById('btn-restart-wizard');
if (btnRestartWizard) {
  btnRestartWizard.addEventListener('click', restartWizard);
}

// Undo/Redo buttons
const btnUndo = document.getElementById('btn-undo');
if (btnUndo) btnUndo.addEventListener('click', undo);
const btnRedo = document.getElementById('btn-redo');
if (btnRedo) btnRedo.addEventListener('click', redo);

// Oggi button - go to current date
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

// Close instructions modal function
function closeInstructions() {
  const modal = document.getElementById('instructions-modal');
  if (modal) modal.classList.add('hidden');
}

function closeSettingsModal() {
  // No settings modal in RUAP, just a placeholder
}

// Close conflict modal function
function closeConflictModal() {
  const modal = document.getElementById('conflict-modal');
  if (modal) modal.classList.add('hidden');
}

// ====================================================
// CONFLICTS RESOLUTION CENTER
// ====================================================
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

function closeConflictsModal() {
  document.getElementById('conflicts-modal').classList.add('hidden');
}

function removeAssignmentFromConflict(slotKey) {
  pushHistory();
  delete state.assignments[slotKey];
  saveToStorage();
  renderAll();
  renderStats();
  openConflictsModal();
}

function autoResolveAllConflicts() {
  const conflicts = getConflicts();
  if (conflicts.length === 0) return;
  pushHistory();
  for (const c of conflicts) {
    if (c.isUnavailable) {
      // For unavailability, remove all conflicting assignments
      for (const k of c.keys) {
        delete state.assignments[k];
      }
    } else {
      // For double-booking, keep the first assignment, remove duplicates
      const keysToRemove = c.keys.slice(1);
      for (const k of keysToRemove) {
        delete state.assignments[k];
      }
    }
  }
  saveToStorage();
  renderAll();
  renderStats();
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

// Auto-update weekly hours when patients change
document.getElementById('modal-patients')?.addEventListener('input', (e) => {
  const patients = parseInt(e.target.value) || 0;
  const hours = calculateDebtByPatients(patients);
  document.getElementById('modal-hours').value = hours;
});

// Unavailability periods functionality
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
    </button>
  `;
  container.appendChild(periodEl);
}

document.getElementById('btn-add-period')?.addEventListener('click', () => {
  addUnavailPeriodRow('', '');
});

// ====================================================
// KEYBOARD SHORTCUTS
// ====================================================
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
  if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
  if (e.key === 'ArrowLeft' && e.ctrlKey) { e.preventDefault(); state.calMonth--; if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; } renderAll(); }
  if (e.key === 'ArrowRight' && e.ctrlKey) { e.preventDefault(); state.calMonth++; if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; } renderAll(); }
  if (e.key === 'Escape') { closeAssignDropdown(); closeDoctorModal(); closeConflictModal(); closeInstructions(); }
});

// ====================================================
// KONAMI CODE EASTER EGG
// ====================================================
const konamiCode = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIndex = 0;
document.addEventListener('keydown', (e) => {
  if (e.key === konamiCode[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === konamiCode.length) {
      toast('🎉 Sei un vero utente RUAP!', 'success');
      document.body.style.animation = 'rainbow 2s';
      konamiIndex = 0;
    }
  } else {
    konamiIndex = 0;
  }
});

// ====================================================
// STATISTICHE E STATO COPERTURA
// ====================================================
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

function renderStats() {
  const stats = getMonthlyStats();
  document.getElementById('total-doctors').textContent = state.doctors.length;
  document.getElementById('total-hours').textContent = Object.values(stats.doctorHours).reduce((a, b) => a + b, 0);
  
  const coverageEl = document.getElementById('coverage-badge');
  if (coverageEl) {
    coverageEl.textContent = `${stats.coverage}%`;
    coverageEl.className = `text-xs font-bold px-2 py-0.5 rounded-full ${stats.coverage === 100 ? 'bg-green-100 text-green-700' : stats.coverage >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`;
  }
}

// ─── Monthly stats panel ────────────────────────────────
function renderMonthlyStats() {
  const panel = document.getElementById('monthly-stats-panel');
  if (!panel || panel.classList.contains('hidden')) return;

  const year = state.calYear;
  const month = state.calMonth;
  const ordered = [...state.doctors].sort((a, b) => (b.isPool ? 1 : 0) - (a.isPool ? 1 : 0));

  panel.innerHTML = ordered.map(doc => {
    const budget = getMonthlyBudget(doc);
    const used = getAssignedHoursInMonth(doc.id, month, year);
    const rem = Math.max(0, budget - used);
    const pct = budget > 0 ? Math.round((used / budget) * 100) : 0;
    const color = getDoctorColor(doc);
    const label = doc.isPool ? ' (pool)' : '';
    const barColor = rem === 0 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';
    return `<div class="flex items-center gap-1.5 py-0.5">
      <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${color.hex}"></span>
      <span class="flex-1 truncate text-slate-700" title="${doc.name}">${cleanDoctorName(doc.name)}${label}</span>
      <span class="text-slate-500 flex-shrink-0">${used}h/${budget}h</span>
      <div class="w-10 h-1.5 bg-slate-200 rounded-full flex-shrink-0">
        <div style="width:${Math.min(100, pct)}%; background:${barColor}" class="h-1.5 rounded-full"></div>
      </div>
    </div>`;
  }).join('');
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
// RICERCA E FILTRO MEDICI
// ====================================================
let searchQuery = '';
let filterAFT = '';

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

document.getElementById('doctor-search')?.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderSidebar();
});

document.getElementById('filter-aft')?.addEventListener('change', (e) => {
  filterAFT = e.target.value;
  renderSidebar();
});

// ====================================================
// COPIA SETTIMANA
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
  const offset = Math.floor((weekStart - copyWeekSource.weekStart) / (7 * 24 * 60 * 60 * 1000));
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
  renderStats();
  toast(`${count} turni incollati`, 'success');
}

// ====================================================
// SWAP MEDICI
// ====================================================
function swapDoctorsInSlot(slotKey1, slotKey2) {
  pushHistory();
  const temp = state.assignments[slotKey1];
  state.assignments[slotKey1] = state.assignments[slotKey2];
  state.assignments[slotKey2] = temp;
  saveToStorage();
  renderAll();
  toast('Turni scambiati', 'success');
}

// ====================================================
// CONFLICT DETECTION
// ====================================================
function hasConflict(docId, dateKey, slotKey) {
  const prefix = `${dateKey}_${slotKey}_`;
  return Object.entries(state.assignments).some(([k, v]) => v === docId && k.startsWith(prefix));
}

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
        conflictsMap[conflictKey] = {
          docId,
          dateKey,
          slotKey,
          keys: matches.map(m => m[0]),
          isUnavailable
        };
      }
    }
  }
  return Object.values(conflictsMap);
}

// ====================================================
// WIZARD SETUP
// ====================================================
let wizardStep = 1;
const WIZARD_TOTAL = 4;
let wPlaces = [];
let wSlots = [];
let wDoctors = [];

function startWizard() {
  wPlaces = [];
  wSlots = [{ key: 'mat', label: '08:00–14:00', hours: 6, icon: '🌅' }, { key: 'pom', label: '14:00–20:00', hours: 6, icon: '🌆' }];
  wDoctors = [];
  wizardStep = 1;
  document.getElementById('ruap-wizard').classList.remove('hidden');
  renderWizardStep();
}

function restartWizard() {
  if (!confirm('Vuoi ricominciare la configurazione?\n\nTutti i dati verranno cancellati.')) return;
  localStorage.removeItem(STORAGE_DOCTORS);
  localStorage.removeItem(STORAGE_ASSIGNMENTS);
  localStorage.removeItem(STORAGE_HISTORY);
  state.doctors = [];
  state.assignments = [];
  historyStack = [];
  historyIndex = -1;
  document.getElementById('demo-banner').classList.add('hidden');
  closeSettingsModal();
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
  
  ['wizard-back', 'wizard-next'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
  });

  const backBtn = document.getElementById('wizard-back');
  const nextBtn = document.getElementById('wizard-next');

  backBtn.classList.toggle('hidden', wizardStep === 1);
  nextBtn.classList.toggle('hidden', wizardStep === 1 || wizardStep === 4);

  const stepFns = [null, renderWizardStep1, renderWizardStep2, renderWizardStep3, renderWizardStep4];
  stepFns[wizardStep]();

  backBtn.addEventListener('click', () => { wizardStep--; renderWizardStep(); });

  if (wizardStep === 2 || wizardStep === 3) {
    updateWizardNextState();
    nextBtn.addEventListener('click', () => {
      if (wizardAdvance()) { wizardStep++; renderWizardStep(); }
    });
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
  historyStack = [];
  historyIndex = -1;
  document.getElementById('ruap-wizard').classList.add('hidden');
  saveToStorage();
  pushHistory();
  renderAll();
  renderStats();
  updateUndoRedoButtons();
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
    </div>
  `;
  document.getElementById('w-start').addEventListener('click', () => {
    wizardStep = 2;
    renderWizardStep();
  });
}

function renderWizardStep2() {
  const chipsHtml = wPlaces.map(p => `
    <span class="wizard-chip" style="background:#dbeafe; color:#1e40af">
      ${p}
      <button class="chip-remove w-remove-place" data-place="${p}">×</button>
    </span>
  `).join('');

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
    </div>
  `;

  document.getElementById('w-place-add').addEventListener('click', () => {
    const input = document.getElementById('w-place-input');
    const val = input.value.trim();
    if (val && !wPlaces.includes(val)) {
      wPlaces.push(val);
      renderWizardStep2();
    }
  });
  document.getElementById('w-place-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('w-place-add').click();
  });
  document.querySelectorAll('.w-remove-place').forEach(btn => {
    btn.addEventListener('click', () => {
      wPlaces = wPlaces.filter(p => p !== btn.dataset.place);
      renderWizardStep2();
    });
  });
  updateWizardNextState();
}

function renderWizardStep3() {
  const chipsHtml = wSlots.map(s => `
    <span class="wizard-chip" style="background:#fef3c7; color:#92400e">
      ${s.icon} ${s.label} (${s.hours}h)
      <button class="chip-remove w-remove-slot" data-key="${s.key}">×</button>
    </span>
  `).join('');

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
    <p class="text-xs text-slate-400 mt-2">Usa standard 08:00-14:00 (Mattina) e 14:00-20:00 (Pomeriggio)</p>
  `;

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
    btn.addEventListener('click', () => {
      wSlots = wSlots.filter(s => s.key !== btn.dataset.key);
      renderWizardStep3();
    });
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
        <span class="wizard-chip" style="background:${COLOR_PALETTE[i % 8].hex}; color:white">
          ${d.name}
          <button class="chip-remove w-remove-doctor" data-index="${i}">×</button>
        </span>
      `).join('')}
      ${wDoctors.length === 0 ? '<span class="text-slate-400 text-sm">Nessun medico aggiunto</span>' : ''}
    </div>
    <button id="w-finish" class="wizard-big-btn success w-full" style="text-align:center; margin-top:1rem; ${wDoctors.length < 1 ? 'opacity:0.4; pointer-events:none' : ''}">
      ✅ Configura e inizia
    </button>
  `;

  document.getElementById('w-doctor-add').addEventListener('click', () => {
    const name = document.getElementById('w-doctor-name').value.trim();
    const patients = parseInt(document.getElementById('w-doctor-patients').value) || 850;
    const preferredPlace = document.getElementById('w-doctor-place').value || null;
    if (name) {
      wDoctors.push({ name: name.startsWith('Dott. ') ? name : 'Dott. ' + name, patients, weeklyHours: calculateDebtByPatients(patients), colorIndex: wDoctors.length % 8, preferredPlace, availability: Object.fromEntries(['lun','mar','mer','gio','ven'].map(k => [k, { mat: true, pom: true }])), unavailPeriods: [] });
      document.getElementById('w-doctor-name').value = '';
      document.getElementById('w-doctor-patients').value = '';
      renderWizardStep4();
    }
  });
  document.querySelectorAll('.w-remove-doctor').forEach(btn => {
    btn.addEventListener('click', () => {
      wDoctors.splice(parseInt(btn.dataset.index), 1);
      renderWizardStep4();
    });
  });
  document.getElementById('w-finish').addEventListener('click', finishWizard);
}

// ====================================================
// INIT
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
  loadHistory();
  const isFirstRun = state.doctors.length === 0;
  if (isFirstRun) {
    const now = new Date();
    state.calYear = now.getFullYear();
    state.calMonth = now.getMonth();
    state.doctors = getDefaultDoctors();
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
  renderStats();
  renderMonthlyStats();
  updateUndoRedoButtons();
  updateConflictsHeaderBadge();
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
  localStorage.setItem(STORAGE_HISTORY, JSON.stringify({ stack: historyStack, index: historyIndex }));
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

init();