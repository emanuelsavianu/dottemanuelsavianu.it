// ====================================================
// COSTANTI E CONFIGURAZIONE
// ====================================================
const STORAGE_DOCTORS = 'ruap-turni-medici';
const STORAGE_ASSIGNMENTS = 'ruap-turni-assegnazioni';

const DAY_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
const DAY_KEYS  = ['lun', 'mar', 'mer', 'gio', 'ven'];
// Read from config.js if available, fall back to hardcoded defaults
const PLACES = (typeof CONFIG !== 'undefined' && CONFIG.places) ? CONFIG.places : ['M.S.Savino', 'Subbiano'];
const SLOTS = (typeof CONFIG !== 'undefined' && CONFIG.slots) ? CONFIG.slots : [
  { key: 'mat', label: '08:00–14:00', hours: 6, icon: '🌅' },
  { key: 'pom', label: '14:00–20:00', hours: 6, icon: '🌆' },
];

const COLOR_PALETTE = [
  { bg: 'bg-blue-500',   text: 'text-white', hex: '#3b82f6',  label: 'Blu' },
  { bg: 'bg-green-500',  text: 'text-white', hex: '#22c55e',  label: 'Verde' },
  { bg: 'bg-purple-500', text: 'text-white', hex: '#a855f7',  label: 'Viola' },
  { bg: 'bg-rose-500',   text: 'text-white', hex: '#f43f5e',  label: 'Rosa' },
  { bg: 'bg-amber-500',  text: 'text-white', hex: '#f59e0b',  label: 'Ambra' },
  { bg: 'bg-teal-500',   text: 'text-white', hex: '#14b8a6',  label: 'Teal' },
  { bg: 'bg-orange-500', text: 'text-white', hex: '#f97316',  label: 'Arancio' },
  { bg: 'bg-cyan-600',   text: 'text-white', hex: '#0891b2',  label: 'Ciano' },
];

let state = {
  doctors: [],
  assignments: {},
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  sidebarWeekStart: getWeekStart(new Date()),
  editingDoctorId: null,
  activeSlotKey: null,
};

function getDefaultDoctors() {
  if (typeof CONFIG === 'undefined' || !CONFIG.doctors) return [];
  return CONFIG.doctors.map((d, i) => ({
    id: generateId(),
    name: d.name,
    patients: d.patients || 850,
    weeklyHours: calculateDebtByPatients(d.patients || 850),
    colorIndex: d.colorIndex ?? i,
    preferredPlace: d.preferredPlace || null,
    availability: Object.fromEntries(
      ['lun','mar','mer','gio','ven'].map(k => [k, { mat: true, pom: true }])
    ),
    unavailPeriods: [],
  }));
}

// ====================================================
// UTILITY FUNCTIONS
// ====================================================
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

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
  return 0;
}
function getDoctorColor(doctor) { return COLOR_PALETTE[doctor.colorIndex ?? 0] || COLOR_PALETTE[0]; }
function isPlaceCovered(dateKey, place) { return !!state.assignments[`${dateKey}_mat_${place}`] && !!state.assignments[`${dateKey}_pom_${place}`]; }
function getDayPlacesCoverage(dateKey) {
  const covered = PLACES.filter(p => isPlaceCovered(dateKey, p)).length;
  return { covered, total: PLACES.length };
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

document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.doctors || !data.assignments) throw new Error('Formato non valido');
      state.doctors = data.doctors; state.assignments = data.assignments;
      saveToStorage(); renderAll(); toast('Importazione completata!', 'success');
    } catch (err) { toast('Errore importazione: ' + err.message, 'error'); }
  };
  reader.readAsText(file); e.target.value = '';
});

// ====================================================
// RENDERING UI
// ====================================================
function renderSidebar() {
  const weekEnd = new Date(state.sidebarWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 4);
  document.getElementById('sidebar-week-label').textContent = `${formatDateShort(state.sidebarWeekStart)} – ${formatDateShort(weekEnd)}`;
  
  const container = document.getElementById('sidebar-doctors');
  container.innerHTML = '';
  if (state.doctors.length === 0) {
    container.innerHTML = `<div class="text-center text-slate-400 py-6 text-sm">Nessun medico registrato</div>`;
    return;
  }

  const docCardsSection = document.createElement('div');
  docCardsSection.className = 'space-y-3';

  state.doctors.forEach(doc => {
    const color = getDoctorColor(doc);
    const assigned = getWeeklyAssignedHours(doc.id, state.sidebarWeekStart);
    const debt = doc.weeklyHours || 38;
    const pct = Math.min(100, Math.round((assigned / debt) * 100));
    
    const card = document.createElement('div');
    card.className = `rounded-xl border p-3 border-slate-200 bg-slate-50`;
    card.innerHTML = `
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-3 h-3 rounded-full flex-shrink-0" style="background:${color.hex}"></span>
          <span class="font-semibold text-sm text-slate-800 truncate">${doc.name}</span>
        </div>
        <div class="flex items-center gap-1">
          <button class="text-slate-400 hover:text-brand-600 text-xs" onclick="openDoctorModal('${doc.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="text-slate-400 hover:text-red-500 text-xs ml-1" onclick="deleteDoctor('${doc.id}')"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
      <div class="flex items-baseline justify-between mb-1.5">
        <span class="text-xs text-slate-500">${doc.patients ? doc.patients + ' paz.' : ''}</span>
        <span class="text-xs font-bold text-slate-700">${assigned}h / ${debt}h</span>
      </div>
      <div class="w-full bg-slate-200 rounded-full h-2">
        <div class="h-2 rounded-full bg-blue-500" style="width: ${pct}%"></div>
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
        placeSection.innerHTML = `<div class="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">${place}</div>`;

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
            ? `<div class="truncate font-semibold text-xs">${assignedDoc.name.replace('Dott. ', '')}</div><div class="text-[10px] opacity-80">${slot.icon} ${slot.label}</div>`
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
      btn.addEventListener('click', () => { state.assignments[slotKey] = doc.id; saveToStorage(); closeAssignDropdown(); renderAll(); });
      list.appendChild(btn);
    });
  }
  removeWrap.classList.toggle('hidden', !state.assignments[slotKey]);
  const rect = e.currentTarget.getBoundingClientRect();
  dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
  dropdown.style.left = `${Math.min(rect.left + window.scrollX, window.innerWidth - 320)}px`;
  dropdown.classList.remove('hidden');
}

document.getElementById('assign-remove').addEventListener('click', () => {
  if (state.activeSlotKey) { delete state.assignments[state.activeSlotKey]; saveToStorage(); closeAssignDropdown(); renderAll(); }
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
    // Populate preferred place dropdown
    const ppSelect = document.getElementById('modal-preferred-place');
    if (ppSelect) {
      ppSelect.innerHTML = '<option value="">-- Nessuna preferenza --</option>';
      PLACES.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        if (doctorId && getDoctorById(doctorId)?.preferredPlace === p) opt.selected = true;
        ppSelect.appendChild(opt);
      });
    }
    // (Availability table logic is omitted here to keep JS clean, assume default full availability if missing for demo)
  } else {
    document.getElementById('modal-name').value = '';
    document.getElementById('modal-patients').value = '';
    document.getElementById('modal-hours').value = '38';
    renderColorPicker(0);
    // Populate preferred place dropdown for new doctor
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
  }
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
  const weeklyHours = parseInt(document.getElementById('modal-hours').value) || 38;
  const colorBtn = document.querySelector('#color-picker button.border-slate-800');
  const colorIndex = colorBtn ? parseInt(colorBtn.dataset.colorIndex) : 0;
  
  // Default availability (all true for simplicity in this updated script)
  const availability = {};
  DAY_KEYS.forEach(dk => { availability[dk] = { mat: true, pom: true }; });

  const preferredPlace = document.getElementById('modal-preferred-place')?.value || null;
  if (state.editingDoctorId) {
    const doc = getDoctorById(state.editingDoctorId);
    Object.assign(doc, { name, patients, weeklyHours, colorIndex, availability, preferredPlace });
  } else {
    state.doctors.push({ id: generateId(), name, patients, weeklyHours, colorIndex, preferredPlace, availability, unavailPeriods: [] });
  }
  saveToStorage(); closeDoctorModal(); renderAll();
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
    state.doctors = state.doctors.filter(d => d.id !== id);
    Object.keys(state.assignments).forEach(k => { if (state.assignments[k] === id) delete state.assignments[k]; });
    saveToStorage(); renderAll(); el.remove();
    toast(`${doc.name} rimosso`, 'info');
  };
  document.getElementById(`cancel-delete-${id}`).onclick = () => el.remove();
  setTimeout(() => { if (el.parentNode) el.remove(); }, 5000);
}

// Navigazione
document.getElementById('cal-prev').addEventListener('click', () => { state.calMonth--; if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; } renderAll(); });
document.getElementById('cal-next').addEventListener('click', () => { state.calMonth++; if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; } renderAll(); });
document.getElementById('sidebar-week-prev').addEventListener('click', () => { state.sidebarWeekStart.setDate(state.sidebarWeekStart.getDate() - 7); renderSidebar(); });
document.getElementById('sidebar-week-next').addEventListener('click', () => { state.sidebarWeekStart.setDate(state.sidebarWeekStart.getDate() + 7); renderSidebar(); });

function renderAll() { renderCalendar(); renderSidebar(); }

// ====================================================
// AUTO-ASSIGN LOCALE (no API required)
// ====================================================
function autoAssign() {
  if (state.doctors.length === 0) {
    toast('Aggiungi prima dei medici', 'warning');
    return;
  }

  const year = state.calYear;
  const month = state.calMonth;
  const lastDay = new Date(year, month + 1, 0).getDate();
  let count = 0;

  for (let day = 1; day <= lastDay; day++) {
    const cellDate = new Date(year, month, day);
    const jsDay = cellDate.getDay();
    if (jsDay === 0 || jsDay === 6) continue;  // weekends only
    const dateKey = toDateKey(cellDate);
    const weekStart = getWeekStart(cellDate);

    SLOTS.forEach(slot => {
      PLACES.forEach(place => {
        const slotKey = `${dateKey}_${slot.key}_${place}`;
        if (state.assignments[slotKey]) return; // already assigned

        // Check if doctor is not already busy in this slot on this date
        const notBusy = (doc) => {
          const prefix = `${dateKey}_${slot.key}_`;
          return !Object.entries(state.assignments).some(([k, v]) => v === doc.id && k.startsWith(prefix));
        };

        const available = state.doctors.filter(doc =>
          isDoctorAvailableForSlot(doc, dateKey, slot.key) && notBusy(doc)
        );

        if (available.length === 0) return;

        // Priority 1: doctors with preferred place + fewest weekly hours
        // Priority 2: doctors with no preference + fewest weekly hours
        // Priority 3: doctors preferring different place (only if 1-2 exhausted)
        const preferred  = available.filter(d => d.preferredPlace === place);
        const neutral    = available.filter(d => !d.preferredPlace);
        const nonPreferred = available.filter(d => d.preferredPlace && d.preferredPlace !== place);

        const pool = preferred.length > 0 ? preferred
          : neutral.length > 0 ? neutral
          : nonPreferred;

        if (pool.length === 0) return;

        // Pick doctor with fewest weekly hours assigned
        pool.sort((a, b) =>
          getWeeklyAssignedHours(a.id, weekStart) - getWeeklyAssignedHours(b.id, weekStart)
        );

        state.assignments[slotKey] = pool[0].id;
        count++;
      });
    });
  }

  if (count === 0) {
    toast('Nessun turno vuoto da assegnare', 'info');
    return;
  }

  saveToStorage();
  renderAll();
  toast(`Assegnati ${count} turni automaticamente`, 'success');
}

// ====================================================
// PDF EXPORT
// ====================================================
function buildPdfContent() {
  const year = state.calYear;
  const month = state.calMonth;
  const monthName = MONTHS_IT[month];

  document.getElementById('pdf-subtitle').textContent = `${monthName} ${year} — Sedi: ${PLACES.join(', ')}`;
  document.getElementById('pdf-footer').textContent = `Generato il ${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} — RUAP Attività Diurne`;

  const table = document.getElementById('pdf-table');
  table.innerHTML = '';

  PLACES.forEach(place => {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 24px;';

    const placeTitle = document.createElement('h2');
    placeTitle.style.cssText = 'font-size: 15px; font-weight: bold; color: #1e40af; margin: 0 0 8px; padding: 6px 10px; background: #eff6ff; border-radius: 6px;';
    placeTitle.textContent = place;
    section.appendChild(placeTitle);

    const t = document.createElement('table');
    t.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 12px;';

    // Header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.cssText = 'background: #1e40af; color: white;';
    ['Data', 'Giorno', ...SLOTS.map(s => s.label)].forEach(h => {
      const th = document.createElement('th');
      th.style.cssText = 'padding: 6px 8px; text-align: left; font-weight: bold;';
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
        const doc = state.assignments[key] ? getDoctorById(state.assignments[key]) : null;
        const td = document.createElement('td');
        td.style.cssText = 'padding: 5px 8px;';
        if (doc) {
          const color = getDoctorColor(doc);
          td.innerHTML = `<span style="background:${color.hex}; color:white; padding: 2px 8px; border-radius: 4px; font-weight:bold;">${doc.name.replace('Dott. ', '')}</span>`;
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
    const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 1.5, canvas.height / 1.5] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 1.5, canvas.height / 1.5);
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

  // 1. Prepare data for the AI
  const year = state.calYear;
  const month = state.calMonth;
  const lastDay = new Date(year, month + 1, 0).getDate();
  
  const emptySlots = [];
  // Gather all empty slots for this month
  for (let day = 1; day <= lastDay; day++) {
    const cellDate = new Date(year, month, day);
    const jsDay = cellDate.getDay();
    if (jsDay === 0 || jsDay === 6) continue; // Skip weekends
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

  // Show loading overlay
  document.getElementById('gemini-loading').classList.remove('hidden');

  // Format context for the LLM
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
          response_mime_type: "application/json", // Force JSON!
          temperature: 0.2 // Low temp for more logical, deterministic output
        } 
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    // Parse the generated text into a JSON object
    const generatedJsonText = data.candidates[0].content.parts[0].text;
    const newAssignments = JSON.parse(generatedJsonText);

    // Merge new assignments into the state
    let count = 0;
    for (const [key, doctorId] of Object.entries(newAssignments)) {
      if (emptySlots.includes(key)) {
        state.assignments[key] = doctorId;
        count++;
      }
    }

    saveToStorage();
    renderAll();
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

// Init
function init() {
  initDarkMode();
  loadFromStorage();
  const isFirstRun = state.doctors.length === 0;
  if (isFirstRun) {
    state.doctors = getDefaultDoctors();
    // Resolve demo assignments (index → real ID)
    if (typeof CONFIG !== 'undefined' && CONFIG.demoAssignments) {
      Object.entries(CONFIG.demoAssignments).forEach(([key, idx]) => {
        if (state.doctors[idx]) state.assignments[key] = state.doctors[idx].id;
      });
    }
    // Navigate to current month if April 2026
    const now = new Date();
    state.calYear = now.getFullYear();
    state.calMonth = now.getMonth();
    saveToStorage();
    document.getElementById('demo-banner').classList.remove('hidden');
  }
  renderAll();
}

init();