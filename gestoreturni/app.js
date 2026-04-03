// ====================================================
// CONSTANTS
// ====================================================
const STORAGE_CONFIG = 'ruap-config-v2';
const STORAGE_STAFF = 'ruap-staff-v2';
const STORAGE_ASSIGNMENTS = 'ruap-assignments-v2';

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

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

// ====================================================
// STATE
// ====================================================
let state = {
  // Configuration (persisted)
  config: {
    roles: [],
    shifts: [],
    activities: [],
    defaultWeekView: false,
    showWeekends: false
  },

  // Staff & Assignments (persisted)
  staff: [],
  assignments: {},

  // UI State (not persisted)
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  viewMode: 'month',
  editingEntityId: null,
  editingEntityType: null,
  sidebarWeekStart: getWeekStart(new Date()),
  activeSlotKey: null,
};

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

// ====================================================
// PERSISTENCE & MIGRATION
// ====================================================

function migrateV1ToV2(v1Data) {
  // v1Data has { doctors, assignments }
  // Create a default role and activity for migration
  const defaultRole = {
    id: 'role-doctor',
    name: 'Medico',
    color: '#3b82f6'
  };

  const defaultActivity = {
    id: 'activity-default',
    name: 'Attività Predefinita',
    location: 'Sede',
    requirements: [{ roleId: 'role-doctor', count: 1 }]
  };

  const defaultShift = {
    id: 'shift-mat',
    label: 'Mattina',
    startTime: '08:00',
    endTime: '14:00',
    hours: 6,
    icon: '🌅'
  };

  // Convert doctors to staff
  const staff = (v1Data.doctors || []).map(doc => ({
    id: doc.id,
    name: doc.name,
    roleId: 'role-doctor',
    maxWeeklyHours: doc.weeklyHours || 38,
    color: COLOR_PALETTE[doc.colorIndex ?? 0]?.hex || '#3b82f6',
    unavailability: (doc.unavailPeriods || []).map(p => ({
      id: p.id,
      type: 'ferie',
      from: p.from,
      to: p.to,
      note: p.note || ''
    }))
  }));

  return {
    config: {
      roles: [defaultRole],
      shifts: [defaultShift],
      activities: [defaultActivity],
      defaultWeekView: false,
      showWeekends: false
    },
    staff,
    assignments: v1Data.assignments || {}
  };
}

function saveToStorage() {
  localStorage.setItem(STORAGE_CONFIG, JSON.stringify(state.config));
  localStorage.setItem(STORAGE_STAFF, JSON.stringify(state.staff));
  localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(state.assignments));
}

function loadFromStorage() {
  try {
    const cfg = localStorage.getItem(STORAGE_CONFIG);
    const stf = localStorage.getItem(STORAGE_STAFF);
    const asgn = localStorage.getItem(STORAGE_ASSIGNMENTS);

    if (cfg) state.config = JSON.parse(cfg);
    if (stf) state.staff = JSON.parse(stf);
    if (asgn) state.assignments = JSON.parse(asgn);
  } catch (e) {
    console.error('Storage load error:', e);
  }
}

function exportJSON() {
  const data = {
    version: 2,
    exportDate: new Date().toISOString(),
    config: state.config,
    staff: state.staff,
    assignments: state.assignments
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ruap-turni-${toDateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);

      if (data.version === 1) {
        const migrated = migrateV1ToV2(data);
        state.config = migrated.config;
        state.staff = migrated.staff;
        state.assignments = migrated.assignments;
      } else if (data.version === 2) {
        state.config = data.config;
        state.staff = data.staff;
        state.assignments = data.assignments;
      } else {
        throw new Error('Formato sconosciuto');
      }

      saveToStorage();
      renderAll();
      alert('Importazione completata!');
    } catch (err) {
      alert('Errore importazione: ' + err.message);
    }
  };
  reader.readAsText(file);
}

document.getElementById('import-file').addEventListener('change', (e) => {
  if (e.target.files[0]) importJSON(e.target.files[0]);
  e.target.value = '';
});

document.getElementById('btn-export').addEventListener('click', exportJSON);

// ====================================================
// LOOKUPS & VALIDATION
// ====================================================

function getRoleById(roleId) { return state.config.roles.find(r => r.id === roleId); }
function getShiftById(shiftId) { return state.config.shifts.find(s => s.id === shiftId); }
function getActivityById(activityId) { return state.config.activities.find(a => a.id === activityId); }
function getStaffById(staffId) { return state.staff.find(s => s.id === staffId); }
function getStaffByRole(roleId) { return state.staff.filter(s => s.roleId === roleId); }

function getActivityRequirements(activityId) {
  const activity = getActivityById(activityId);
  return activity ? activity.requirements : [];
}

function isStaffAvailable(staffId, dateKey) {
  const staff = getStaffById(staffId);
  if (!staff) return false;
  return !staff.unavailability.some(u => dateKey >= u.from && dateKey <= u.to);
}

function getWeeklyAssignedHours(staffId, weekStart) {
  let hours = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateKey = toDateKey(d);
    state.config.activities.forEach(activity => {
      state.config.shifts.forEach((shift, shiftIdx) => {
        const key = `${dateKey}_${shift.id}_${activity.id}_${shiftIdx}`;
        if (state.assignments[key] === staffId) {
          hours += shift.hours;
        }
      });
    });
  }
  return hours;
}

function getMonthlyAssignedHours(staffId, year, month) {
  let hours = 0;
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day);
    const dateKey = toDateKey(d);
    state.config.activities.forEach(activity => {
      state.config.shifts.forEach((shift, shiftIdx) => {
        const key = `${dateKey}_${shift.id}_${activity.id}_${shiftIdx}`;
        if (state.assignments[key] === staffId) {
          hours += shift.hours;
        }
      });
    });
  }
  return hours;
}

function validateActivityCoverage(dateKey, activityId, shiftId) {
  const activity = getActivityById(activityId);
  if (!activity) return { isCovered: false, needs: [] };

  const needs = activity.requirements.map(req => {
    const roleId = req.roleId;
    let assigned = 0;
    for (let slot = 0; slot < req.count; slot++) {
      const key = `${dateKey}_${shiftId}_${activityId}_${slot}`;
      if (state.assignments[key]) assigned++;
    }
    return { roleId, required: req.count, assigned };
  });

  const isCovered = needs.every(n => n.assigned >= n.required);
  return { isCovered, needs };
}

function canAssignStaff(staffId, dateKey, shiftId, activityId, slotIndex) {
  const staff = getStaffById(staffId);
  if (!staff) return { canAssign: false, reason: 'Personale non trovato' };

  if (!isStaffAvailable(staffId, dateKey)) {
    return { canAssign: false, reason: 'Personale non disponibile in questa data' };
  }

  const activity = getActivityById(activityId);
  const req = activity?.requirements.find(r => r.roleId === staff.roleId);
  if (!req) {
    return { canAssign: false, reason: 'Ruolo non richiesto per questa attività' };
  }

  const shift = getShiftById(shiftId);
  if (!shift) {
    return { canAssign: false, reason: 'Turno non trovato' };
  }

  const weekStart = getWeekStart(new Date(dateKey + 'T00:00:00'));
  const currentHours = getWeeklyAssignedHours(staffId, weekStart);
  if (currentHours + shift.hours > staff.maxWeeklyHours) {
    return { canAssign: false, reason: `Ore settimanali eccedute (${currentHours}/${staff.maxWeeklyHours})` };
  }

  return { canAssign: true };
}

// ====================================================
// CALENDAR RENDERING
// ====================================================

function renderCalendar() {
  if (state.config.activities.length === 0) {
    document.getElementById('cal-grid').innerHTML = '<p class="text-slate-400">Aggiungi attività dalle impostazioni</p>';
    return;
  }

  const year = state.calYear;
  const month = state.calMonth;
  document.getElementById('cal-title').textContent = `${MONTHS_IT[month]} ${year}`;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = getWeekStart(firstDay);

  let currentWeekStart = new Date(startDate);
  const todayKey = toDateKey(new Date());

  while (currentWeekStart <= lastDay) {
    const weekRow = document.createElement('div');
    weekRow.className = 'border rounded-lg overflow-hidden';

    const headerRow = document.createElement('div');
    headerRow.className = 'grid gap-0 bg-slate-100 border-b';
    headerRow.style.gridTemplateColumns = `repeat(${state.config.activities.length}, 1fr)`;

    state.config.activities.forEach((activity, ai) => {
      if (ai === 0) {
        const corner = document.createElement('div');
        corner.className = 'text-xs font-bold p-2 text-center';
        headerRow.appendChild(corner);
      }
      const actHeader = document.createElement('div');
      actHeader.className = 'text-xs font-bold p-2 text-center border-l border-slate-300';
      actHeader.textContent = activity.name;
      headerRow.appendChild(actHeader);
    });
    weekRow.appendChild(headerRow);

    for (let i = 0; i < 5; i++) {
      const cellDate = new Date(currentWeekStart);
      cellDate.setDate(cellDate.getDate() + i);
      const dateKey = toDateKey(cellDate);
      const inMonth = cellDate.getMonth() === month;
      const isToday = dateKey === todayKey;

      const dayContent = document.createElement('div');
      dayContent.className = 'grid gap-0 border-t border-slate-200';
      dayContent.style.gridTemplateColumns = `repeat(${state.config.activities.length}, 1fr)`;

      const dayLabel = document.createElement('div');
      dayLabel.className = `text-xs font-bold p-2 text-center bg-slate-50 border-r border-slate-200 ${isToday ? 'bg-blue-100 text-blue-700' : inMonth ? 'text-slate-700' : 'text-slate-400'}`;
      dayLabel.innerHTML = `<div>${cellDate.toLocaleDateString('it-IT', {weekday:'short'})}</div><div class="font-bold">${cellDate.getDate()}</div>`;
      dayContent.appendChild(dayLabel);

      state.config.activities.forEach(activity => {
        const actContent = document.createElement('div');
        actContent.className = 'border-l border-slate-200 p-0';

        const shiftsContainer = document.createElement('div');
        shiftsContainer.className = 'space-y-1 p-2';

        state.config.shifts.forEach((shift, shiftIdx) => {
          for (let slot = 0; slot < (activity.requirements[0]?.count || 1); slot++) {
            const key = `${dateKey}_${shift.id}_${activity.id}_${slot}`;
            const assignedStaffId = state.assignments[key];
            const assignedStaff = assignedStaffId ? getStaffById(assignedStaffId) : null;

            const btn = document.createElement('button');
            btn.className = `w-full text-left text-xs px-2 py-1 rounded border transition-all ${
              assignedStaff
                ? 'text-white border-transparent'
                : inMonth ? 'bg-slate-50 border-dashed border-slate-300 text-slate-400 hover:bg-blue-50' : 'bg-slate-50 border-slate-200 text-slate-400 cursor-default'
            }`;

            if (assignedStaff) {
              btn.style.backgroundColor = assignedStaff.color;
              btn.textContent = assignedStaff.name.split(' ').pop();
            } else {
              btn.textContent = `${shift.icon} ${shift.label}`;
            }

            if (inMonth) {
              btn.addEventListener('click', () => openAssignDropdown(key, shift, activity, dateKey, shiftIdx, slot));
            }

            shiftsContainer.appendChild(btn);
          }
        });

        actContent.appendChild(shiftsContainer);
        dayContent.appendChild(actContent);
      });

      weekRow.appendChild(dayContent);
    }

    grid.appendChild(weekRow);
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }
}

document.getElementById('cal-prev').addEventListener('click', () => {
  state.calMonth--;
  if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
  renderCalendar();
});

document.getElementById('cal-next').addEventListener('click', () => {
  state.calMonth++;
  if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
  renderCalendar();
});

document.getElementById('cal-today').addEventListener('click', () => {
  const today = new Date();
  state.calYear = today.getFullYear();
  state.calMonth = today.getMonth();
  renderCalendar();
});

function openAssignDropdown(key, shift, activity, dateKey, shiftIdx, slot) {
  state.activeSlotKey = key;

  const dropdown = document.getElementById('assign-dropdown');
  const list = document.getElementById('assign-list');
  const removeWrap = document.getElementById('assign-remove-wrap');

  const date = new Date(dateKey + 'T00:00:00');
  const dateDisplay = date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  document.getElementById('assign-slot-label').textContent = `${activity.name} — ${dateDisplay} ${shift.label}`;

  const reqs = activity.requirements.filter(r => r.count > slot);
  const requiredRoleId = reqs.length > 0 ? reqs[slot]?.roleId : null;

  const availStaff = state.staff.filter(s => {
    if (!isStaffAvailable(s.id, dateKey)) return false;
    if (requiredRoleId && s.roleId !== requiredRoleId) return false;
    return true;
  });

  list.innerHTML = '';
  if (availStaff.length === 0) {
    list.innerHTML = '<p class="text-xs text-slate-400 italic p-2">Nessun personale disponibile</p>';
  } else {
    availStaff.forEach(staff => {
      const btn = document.createElement('button');
      btn.className = 'w-full text-left rounded-lg px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-sm border-l-4';
      btn.style.borderColor = staff.color;
      btn.innerHTML = `<span class="font-medium flex-1">${staff.name}</span><span class="text-xs text-slate-500">${getWeeklyAssignedHours(staff.id, getWeekStart(new Date(dateKey + 'T00:00:00')))}/${staff.maxWeeklyHours}h</span>`;
      btn.addEventListener('click', () => {
        state.assignments[key] = staff.id;
        saveToStorage();
        closeAssignDropdown();
        renderAll();
      });
      list.appendChild(btn);
    });
  }

  removeWrap.classList.toggle('hidden', !state.assignments[key]);

  event.stopPropagation();
  const rect = event.target.getBoundingClientRect();
  dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
  dropdown.style.left = `${Math.max(10, Math.min(rect.left + window.scrollX, window.innerWidth - 280))}px`;
  dropdown.classList.remove('hidden');
}

function closeAssignDropdown() {
  document.getElementById('assign-dropdown').classList.add('hidden');
  state.activeSlotKey = null;
}

document.getElementById('assign-remove').addEventListener('click', () => {
  if (state.activeSlotKey) {
    delete state.assignments[state.activeSlotKey];
    saveToStorage();
    closeAssignDropdown();
    renderAll();
  }
});

document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('assign-dropdown');
  if (dropdown && !dropdown.contains(e.target)) closeAssignDropdown();
});

// ====================================================
// SIDEBAR RENDERING
// ====================================================

function renderSidebar() {
  const weekEnd = new Date(state.sidebarWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const container = document.getElementById('sidebar-staff');
  container.innerHTML = '';

  if (state.staff.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400">Nessun personale</p>';
    return;
  }

  const section = document.createElement('div');
  section.className = 'space-y-3';

  state.staff.forEach(staff => {
    const assigned = getWeeklyAssignedHours(staff.id, state.sidebarWeekStart);
    const monthlyAssigned = getMonthlyAssignedHours(staff.id, state.calYear, state.calMonth);
    const weeklyPct = Math.min(100, Math.round((assigned / staff.maxWeeklyHours) * 100));

    const card = document.createElement('div');
    card.className = 'rounded-lg border p-2.5 border-slate-200 bg-slate-50';
    card.innerHTML = `
      <div class="flex items-start justify-between mb-1.5">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-3 h-3 rounded-full flex-shrink-0" style="background:${staff.color}"></span>
          <span class="font-semibold text-xs text-slate-800 truncate">${staff.name}</span>
        </div>
        <button class="text-slate-400 hover:text-red-500 text-xs" onclick="deleteStaff('${staff.id}')"><i class="fa-solid fa-trash-can"></i></button>
      </div>
      <div class="flex items-baseline justify-between mb-1 text-xs">
        <span class="text-slate-500">${getRoleById(staff.roleId)?.name}</span>
        <span class="font-bold text-slate-700">${assigned}h / ${staff.maxWeeklyHours}h</span>
      </div>
      <div class="w-full bg-slate-200 rounded-full h-1.5 mb-2">
        <div class="h-1.5 rounded-full bg-blue-500" style="width: ${weeklyPct}%"></div>
      </div>
      <div class="text-xs text-slate-500 text-right">Mese: ${monthlyAssigned}h</div>
    `;
    section.appendChild(card);
  });

  container.appendChild(section);
}

// ====================================================
// AUTO-ASSIGN (algoritmo locale, nessuna API richiesta)
// ====================================================

function autoAssign() {
  if (state.staff.length === 0) {
    alert('Aggiungi prima del personale nelle Impostazioni');
    return;
  }

  const year = state.calYear;
  const month = state.calMonth;
  const lastDay = new Date(year, month + 1, 0).getDate();
  let count = 0;

  for (let day = 1; day <= lastDay; day++) {
    const cellDate = new Date(year, month, day);
    const jsDay = cellDate.getDay();
    if (jsDay === 0 || jsDay === 6) continue;
    const dateKey = toDateKey(cellDate);
    const weekStart = getWeekStart(cellDate);

    state.config.activities.forEach(activity => {
      state.config.shifts.forEach(shift => {
        const required = activity.requirements[0]?.count || 1;
        const requiredRoleId = activity.requirements[0]?.roleId;

        for (let slot = 0; slot < required; slot++) {
          const slotKey = `${dateKey}_${shift.id}_${activity.id}_${slot}`;
          if (state.assignments[slotKey]) continue;

          const candidates = state.staff.filter(s => {
            if (requiredRoleId && s.roleId !== requiredRoleId) return false;
            if (!isStaffAvailable(s.id, dateKey)) return false;
            // Non assegnare se già in turno in questo stesso shift (qualsiasi attività/slot)
            const prefix = `${dateKey}_${shift.id}_`;
            const alreadyBusy = Object.entries(state.assignments)
              .some(([k, v]) => v === s.id && k.startsWith(prefix));
            return !alreadyBusy;
          });

          if (candidates.length === 0) continue;

          // Scegli chi ha meno ore settimanali assegnate
          candidates.sort((a, b) =>
            getWeeklyAssignedHours(a.id, weekStart) - getWeeklyAssignedHours(b.id, weekStart)
          );

          state.assignments[slotKey] = candidates[0].id;
          count++;
        }
      });
    });
  }

  if (count === 0) {
    alert('Non ci sono turni vuoti da assegnare');
    return;
  }

  saveToStorage();
  renderAll();
  alert(`Assegnati ${count} turni automaticamente`);
}

document.getElementById('btn-auto-assign').addEventListener('click', autoAssign);

// ====================================================
// ONBOARDING WIZARD
// ====================================================
// Redesigned: 4-step conversational wizard for tech-averse users.
// Steps: 1-Benvenuto, 2-Chi lavora (roles), 3-Orari (shifts), 4-Dove (location) → auto-finish

let wizardStep = 1;
const WIZARD_TOTAL = 4;
let wRoles = [];
let wShifts = [];
let wActivities = [];

function startWizard() {
  wRoles = [{ id: generateId(), name: 'Medico', color: COLOR_PALETTE[0].hex }];
  wShifts = [];
  wActivities = [];
  wizardStep = 1;
  document.getElementById('onboarding-wizard').classList.remove('hidden');
  renderWizardStep();
}

function restartWizard() {
  if (!confirm('Vuoi ricominciare da capo?\n\nTutti i dati inseriti verranno cancellati.')) return;
  localStorage.removeItem(STORAGE_CONFIG);
  localStorage.removeItem(STORAGE_STAFF);
  localStorage.removeItem(STORAGE_ASSIGNMENTS);
  state.config = { roles: [], shifts: [], activities: [], defaultWeekView: false, showWeekends: false };
  state.staff = [];
  state.assignments = {};
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

  // Clone buttons to remove previous event listeners
  ['wizard-back', 'wizard-next'].forEach(id => {
    const el = document.getElementById(id);
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
  });

  const backBtn = document.getElementById('wizard-back');
  const nextBtn = document.getElementById('wizard-next');

  // Step 1 (welcome) and step 4 (location→finish) handle their own nav
  backBtn.classList.toggle('hidden', wizardStep === 1);
  // Show "Avanti" for steps 2 and 3 (roles, shifts have 1-click defaults but also manual entry)
  nextBtn.classList.toggle('hidden', wizardStep === 1 || wizardStep === 4);

  const stepFns = [null, renderStep1, renderStep2, renderStep3, renderStep4];
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
  const valid =
    (wizardStep === 2 && wRoles.length >= 1) ||
    (wizardStep === 3 && wShifts.length >= 1);
  nextBtn.disabled = !valid;
}

function wizardAdvance() {
  if (wizardStep === 2 && wRoles.length < 1) return false;
  if (wizardStep === 3 && wShifts.length < 1) return false;
  return true;
}

function finishWizard() {
  // Auto-add typed text in location field if present
  const input = document.getElementById('w-activity-input');
  if (input && input.value.trim() && !wActivities.find(a => a.name === input.value.trim())) {
    wActivities.push({ id: generateId(), name: input.value.trim() });
  }
  if (wActivities.length < 1) return;

  state.config.roles = wRoles;
  state.config.shifts = wShifts;
  state.config.activities = wActivities.map(a => ({
    id: a.id,
    name: a.name,
    location: a.name,
    requirements: wRoles.length > 0 ? [{ roleId: wRoles[0].id, count: 1 }] : []
  }));
  state.staff = [];
  saveToStorage();
  document.getElementById('onboarding-wizard').classList.add('hidden');
  renderAll();
}

// ---- Step 1: Welcome ----
function renderStep1() {
  document.getElementById('wizard-step-content').innerHTML = `
    <div class="text-center" style="padding: 1.5rem 0">
      <div style="font-size:4.5rem; margin-bottom:1.2rem">📅</div>
      <h1>Benvenuto!</h1>
      <p class="wizard-body-text" style="margin: 1rem 0 0.5rem">
        Questo programma ti aiuta a organizzare i turni di lavoro.
      </p>
      <p class="wizard-body-text" style="margin-bottom: 2rem">
        Ti farò <strong>3 semplici domande</strong> e sarai subito pronto.
      </p>
      <button id="w-start" class="wizard-big-btn primary" style="text-align:center">
        <span class="btn-icon">👉</span> Iniziamo!
      </button>
    </div>
  `;
  document.getElementById('w-start').addEventListener('click', () => {
    wizardStep = 2;
    renderWizardStep();
  });
}

// ---- Step 2: Roles ----
function renderStep2() {
  const hasOnlyMedico = wRoles.length === 1 && wRoles[0].name === 'Medico';
  const hasMultiple = wRoles.length > 1;

  const chipsHtml = wRoles.map(r => `
    <span class="wizard-chip text-white" style="background:${r.color}">
      ${r.name}
      ${wRoles.length > 1 ? `<button class="chip-remove w-remove-role" data-id="${r.id}">×</button>` : ''}
    </span>
  `).join('');

  document.getElementById('wizard-step-content').innerHTML = `
    <h1>Chi fa i turni?</h1>
    <p class="wizard-body-text" style="margin:0.75rem 0 1.5rem">
      Nella maggior parte dei casi sono solo medici. Se servono anche infermieri o altri, puoi aggiungerli.
    </p>

    <button id="w-only-doctors" class="wizard-big-btn ${hasOnlyMedico && !hasMultiple ? 'success' : 'outline'}" style="margin-bottom:0.75rem">
      <span class="btn-icon">👨‍⚕️</span> Solo Medici
      ${hasOnlyMedico && !hasMultiple ? '<span class="btn-sub">✓ Selezionato</span>' : '<span class="btn-sub">La scelta più comune</span>'}
    </button>

    ${hasMultiple ? `<div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin:1rem 0">${chipsHtml}</div>` : ''}

    <details id="w-more-roles" style="margin-top:1rem" ${hasMultiple ? 'open' : ''}>
      <summary style="cursor:pointer; color:#64748b; font-size:1rem; font-weight:600; padding:0.5rem 0">
        Servono anche altri ruoli? (opzionale)
      </summary>
      <div style="margin-top:0.75rem; display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem">
        <button class="w-quick-role wizard-big-btn outline" data-role="Infermiere" style="flex:1; min-width:140px; padding:0.75rem 1rem; font-size:1.05rem">
          <span class="btn-icon">👩‍⚕️</span> + Infermiere
        </button>
        <button class="w-quick-role wizard-big-btn outline" data-role="OSS" style="flex:1; min-width:140px; padding:0.75rem 1rem; font-size:1.05rem">
          <span class="btn-icon">🤝</span> + OSS
        </button>
      </div>
      <div style="display:flex; gap:0.5rem">
        <input id="w-role-input" type="text" placeholder="Altro ruolo..." style="flex:1">
        <button id="w-role-add" class="wizard-big-btn outline" style="width:auto; padding:0.75rem 1.25rem; font-size:1rem; flex-shrink:0">Aggiungi</button>
      </div>
    </details>
  `;

  function addRole(name) {
    if (!name || wRoles.find(r => r.name.toLowerCase() === name.toLowerCase())) return;
    wRoles.push({ id: generateId(), name, color: COLOR_PALETTE[wRoles.length % COLOR_PALETTE.length].hex });
    renderStep2(); updateWizardNextState();
  }

  document.getElementById('w-only-doctors').addEventListener('click', () => {
    wRoles = [{ id: generateId(), name: 'Medico', color: COLOR_PALETTE[0].hex }];
    renderStep2(); updateWizardNextState();
  });

  document.querySelectorAll('.w-quick-role').forEach(btn => {
    btn.addEventListener('click', () => addRole(btn.dataset.role));
  });

  const roleAddBtn = document.getElementById('w-role-add');
  if (roleAddBtn) {
    roleAddBtn.addEventListener('click', () => {
      addRole(document.getElementById('w-role-input').value.trim());
    });
  }
  const roleInput = document.getElementById('w-role-input');
  if (roleInput) {
    roleInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') addRole(e.target.value.trim());
    });
  }

  document.querySelectorAll('.w-remove-role').forEach(btn => {
    btn.addEventListener('click', () => {
      wRoles = wRoles.filter(r => r.id !== btn.dataset.id);
      if (wRoles.length === 0) wRoles = [{ id: generateId(), name: 'Medico', color: COLOR_PALETTE[0].hex }];
      renderStep2(); updateWizardNextState();
    });
  });
}

// ---- Step 3: Shifts ----
function renderStep3() {
  const hasStandard = wShifts.length === 2
    && wShifts.some(s => s.label === 'Mattina')
    && wShifts.some(s => s.label === 'Pomeriggio');

  const chipsHtml = wShifts.map(s => `
    <span class="wizard-chip" style="background:#dbeafe; color:#1e40af">
      ${s.icon} ${s.label} (${s.startTime}–${s.endTime})
      <button class="chip-remove w-remove-shift" data-id="${s.id}">×</button>
    </span>
  `).join('');

  document.getElementById('wizard-step-content').innerHTML = `
    <h1>Quali orari di lavoro?</h1>
    <p class="wizard-body-text" style="margin:0.75rem 0 1.5rem">
      Scegli gli orari dei turni. La maggior parte usa mattina e pomeriggio.
    </p>

    <button id="w-use-standard" class="wizard-big-btn ${hasStandard ? 'success' : 'primary'}" style="margin-bottom:0.75rem">
      <span class="btn-icon">☀️</span> Mattina e Pomeriggio
      <span class="btn-sub">${hasStandard ? '✓ Selezionato — Mattina 08–14 · Pomeriggio 14–20' : 'Mattina 08:00–14:00 · Pomeriggio 14:00–20:00'}</span>
    </button>

    ${!hasStandard && wShifts.length > 0 ? `<div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin:1rem 0">${chipsHtml}</div>` : ''}

    <details id="w-custom-shifts" style="margin-top:1rem" ${!hasStandard && wShifts.length > 0 ? 'open' : ''}>
      <summary style="cursor:pointer; color:#64748b; font-size:1rem; font-weight:600; padding:0.5rem 0">
        Orari diversi? Personalizza (opzionale)
      </summary>
      <div style="margin-top:0.75rem; display:flex; flex-direction:column; gap:0.5rem">
        <input id="w-shift-label" type="text" placeholder="Nome turno (es. Notte)">
        <div style="display:flex; gap:0.5rem; align-items:center">
          <input id="w-shift-start" type="time" value="08:00"
            style="flex:1; font-size:1.15rem; padding:0.75rem 1rem; border:2.5px solid #cbd5e1; border-radius:1rem;">
          <span style="color:#94a3b8; font-weight:bold; font-size:1.2rem">→</span>
          <input id="w-shift-end" type="time" value="14:00"
            style="flex:1; font-size:1.15rem; padding:0.75rem 1rem; border:2.5px solid #cbd5e1; border-radius:1rem;">
        </div>
        <button id="w-shift-add" class="wizard-big-btn outline" style="padding:0.75rem; font-size:1rem">+ Aggiungi turno</button>
      </div>
    </details>
  `;

  document.getElementById('w-use-standard').addEventListener('click', () => {
    wShifts = [
      { id: generateId(), label: 'Mattina',    startTime: '08:00', endTime: '14:00', hours: 6, icon: '🌅' },
      { id: generateId(), label: 'Pomeriggio', startTime: '14:00', endTime: '20:00', hours: 6, icon: '🌇' }
    ];
    renderStep3(); updateWizardNextState();
  });

  const shiftAddBtn = document.getElementById('w-shift-add');
  if (shiftAddBtn) {
    shiftAddBtn.addEventListener('click', () => {
      const label = document.getElementById('w-shift-label').value.trim();
      const start = document.getElementById('w-shift-start').value;
      const end   = document.getElementById('w-shift-end').value;
      if (!label || !start || !end) return;
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let hours = (eh * 60 + em - sh * 60 - sm) / 60;
      if (hours <= 0) hours += 24;
      const iconMap = { mattina: '🌅', pomeriggio: '🌇', notte: '🌙' };
      const icon = iconMap[label.toLowerCase()] || '⏰';
      wShifts.push({ id: generateId(), label, startTime: start, endTime: end, hours: parseFloat(hours.toFixed(1)), icon });
      renderStep3(); updateWizardNextState();
    });
  }

  document.querySelectorAll('.w-remove-shift').forEach(btn => {
    btn.addEventListener('click', () => {
      wShifts = wShifts.filter(s => s.id !== btn.dataset.id);
      renderStep3(); updateWizardNextState();
    });
  });
}

// ---- Step 4: Location + Finish ----
function renderStep4() {
  const chipsHtml = wActivities.map(a => `
    <span class="wizard-chip" style="background:#fef3c7; color:#92400e">
      🏥 ${a.name}
      <button class="chip-remove w-remove-activity" data-id="${a.id}">×</button>
    </span>
  `).join('');

  const canFinish = wActivities.length > 0;

  document.getElementById('wizard-step-content').innerHTML = `
    <h1>Dove si lavora?</h1>
    <p class="wizard-body-text" style="margin:0.75rem 0 1.5rem">
      Scrivi il nome della sede, del reparto o dell'ambulatorio.
    </p>

    ${wActivities.length > 0 ? `<div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1.25rem">${chipsHtml}</div>` : ''}

    <div style="display:flex; gap:0.5rem; margin-bottom:1.5rem">
      <input id="w-activity-input" type="text" placeholder="es. Ospedale San Donato, Ambulatorio..."
        style="flex:1" autofocus>
      <button id="w-activity-add" class="wizard-big-btn outline" style="width:auto; padding:0.75rem 1.25rem; font-size:1rem; flex-shrink:0">Aggiungi</button>
    </div>

    ${!canFinish ? '<p style="color:#dc2626; font-size:1rem; font-weight:600; margin-bottom:1rem">⚠️ Scrivi almeno una sede per finire.</p>' : ''}

    <button id="w-finish" class="wizard-big-btn success" style="text-align:center; margin-top:0.5rem; ${canFinish ? '' : 'opacity:0.4; pointer-events:none'}">
      <span class="btn-icon">🎉</span> Tutto pronto — Iniziamo!
      <span class="btn-sub">Potrai aggiungere colleghi e modificare tutto dalle Impostazioni</span>
    </button>
  `;

  function addActivity() {
    const val = document.getElementById('w-activity-input').value.trim();
    if (!val || wActivities.find(a => a.name === val)) return;
    wActivities.push({ id: generateId(), name: val });
    renderStep4();
  }

  document.getElementById('w-activity-add').addEventListener('click', addActivity);
  document.getElementById('w-activity-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addActivity();
  });

  if (canFinish) {
    document.getElementById('w-finish').addEventListener('click', finishWizard);
  }

  document.querySelectorAll('.w-remove-activity').forEach(btn => {
    btn.addEventListener('click', () => {
      wActivities = wActivities.filter(a => a.id !== btn.dataset.id);
      renderStep4();
    });
  });
}

function init() {
  loadFromStorage();
  if (state.staff.length === 0 && state.config.activities.length === 0) {
    startWizard();
  } else {
    renderAll();
  }
}

// ====================================================
// DARK MODE
// ====================================================

document.getElementById('btn-dark-mode').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('dark-mode', document.body.classList.contains('dark-mode'));
});

if (localStorage.getItem('dark-mode') === 'true') {
  document.body.classList.add('dark-mode');
}

document.addEventListener('DOMContentLoaded', init);

function renderAll() {
  renderCalendar();
  renderSidebar();
}

// ====================================================
// SETTINGS PANEL
// ====================================================

function openSettingsModal() {
  document.getElementById('settings-modal').classList.remove('hidden');
  renderRolesList();
  renderShiftsList();
  renderActivitiesList();
  renderStaffList();
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.add('hidden');
}

document.getElementById('settings-close').addEventListener('click', closeSettingsModal);
document.getElementById('btn-settings').addEventListener('click', openSettingsModal);
document.getElementById('btn-restart-wizard').addEventListener('click', restartWizard);

document.querySelectorAll('.settings-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;

    document.querySelectorAll('.settings-tab').forEach(b => {
      b.classList.remove('border-brand-600', 'text-brand-600');
      b.classList.add('border-transparent', 'text-slate-500');
    });
    btn.classList.add('border-brand-600', 'text-brand-600');
    btn.classList.remove('border-transparent', 'text-slate-500');

    document.querySelectorAll('.settings-tab-content').forEach(div => div.classList.add('hidden'));
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
  });
});

// ====================================================
// ROLES CRUD
// ====================================================
function renderRolesList() {
  const list = document.getElementById('roles-list');
  list.innerHTML = '';

  if (state.config.roles.length === 0) {
    list.innerHTML = '<p class="text-slate-400 text-sm">Nessun ruolo definito</p>';
    return;
  }

  state.config.roles.forEach(role => {
    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-3 border rounded-lg border-slate-200 bg-slate-50';
    div.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="w-4 h-4 rounded" style="background:${role.color}"></span>
        <div>
          <p class="font-medium text-slate-800">${role.name}</p>
        </div>
      </div>
      <div class="flex gap-1">
        <button class="text-slate-400 hover:text-brand-600 text-sm" onclick="editRole('${role.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="text-slate-400 hover:text-red-500 text-sm" onclick="deleteRole('${role.id}')"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `;
    list.appendChild(div);
  });
}

function editRole(roleId) {
  const role = getRoleById(roleId);
  if (!role) return;

  const newName = prompt('Nome del ruolo:', role.name);
  if (newName) {
    role.name = newName;
    saveToStorage();
    renderRolesList();
  }
}

function deleteRole(roleId) {
  if (!confirm('Eliminare il ruolo? Verificare che non sia usato nelle attività.')) return;
  state.config.roles = state.config.roles.filter(r => r.id !== roleId);
  saveToStorage();
  renderRolesList();
}

document.getElementById('btn-add-role').addEventListener('click', () => {
  const name = prompt('Nome del nuovo ruolo:');
  if (!name) return;

  const role = {
    id: generateId(),
    name,
    color: COLOR_PALETTE[state.config.roles.length % COLOR_PALETTE.length].hex
  };

  state.config.roles.push(role);
  saveToStorage();
  renderRolesList();
});

// ====================================================
// SHIFTS CRUD
// ====================================================
function renderShiftsList() {
  const list = document.getElementById('shifts-list');
  list.innerHTML = '';

  if (state.config.shifts.length === 0) {
    list.innerHTML = '<p class="text-slate-400 text-sm">Nessun turno definito</p>';
    return;
  }

  state.config.shifts.forEach(shift => {
    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-3 border rounded-lg border-slate-200 bg-slate-50';
    div.innerHTML = `
      <div>
        <p class="font-medium text-slate-800">${shift.icon} ${shift.label}</p>
        <p class="text-xs text-slate-500">${shift.startTime} - ${shift.endTime} (${shift.hours}h)</p>
      </div>
      <div class="flex gap-1">
        <button class="text-slate-400 hover:text-brand-600 text-sm" onclick="editShift('${shift.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="text-slate-400 hover:text-red-500 text-sm" onclick="deleteShift('${shift.id}')"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `;
    list.appendChild(div);
  });
}

function editShift(shiftId) {
  const shift = getShiftById(shiftId);
  if (!shift) return;

  const label = prompt('Nome turno:', shift.label);
  const start = prompt('Ora inizio (HH:MM):', shift.startTime);
  const end = prompt('Ora fine (HH:MM):', shift.endTime);

  if (label && start && end) {
    shift.label = label;
    shift.startTime = start;
    shift.endTime = end;
    shift.hours = Math.round((new Date(`2000-01-01T${end}`) - new Date(`2000-01-01T${start}`)) / 3600000);
    saveToStorage();
    renderShiftsList();
  }
}

function deleteShift(shiftId) {
  if (!confirm('Eliminare il turno?')) return;
  state.config.shifts = state.config.shifts.filter(s => s.id !== shiftId);
  saveToStorage();
  renderShiftsList();
}

document.getElementById('btn-add-shift').addEventListener('click', () => {
  const label = prompt('Nome del turno (es. "Mattina"):');
  const start = prompt('Ora inizio (HH:MM, es. "08:00"):');
  const end = prompt('Ora fine (HH:MM, es. "14:00"):');

  if (!label || !start || !end) return;

  const hours = Math.round((new Date(`2000-01-01T${end}`) - new Date(`2000-01-01T${start}`)) / 3600000);

  const shift = {
    id: generateId(),
    label,
    startTime: start,
    endTime: end,
    hours,
    icon: '⏰'
  };

  state.config.shifts.push(shift);
  saveToStorage();
  renderShiftsList();
});

// ====================================================
// ACTIVITIES CRUD
// ====================================================
function renderActivitiesList() {
  const list = document.getElementById('activities-list');
  list.innerHTML = '';

  if (state.config.activities.length === 0) {
    list.innerHTML = '<p class="text-slate-400 text-sm">Nessuna attività definita</p>';
    return;
  }

  state.config.activities.forEach(activity => {
    const reqs = activity.requirements.map(r => {
      const role = getRoleById(r.roleId);
      return `${role?.name || '?'} (${r.count})`;
    }).join(', ');

    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-3 border rounded-lg border-slate-200 bg-slate-50';
    div.innerHTML = `
      <div>
        <p class="font-medium text-slate-800">${activity.name}</p>
        <p class="text-xs text-slate-500">${activity.location} — Ruoli: ${reqs}</p>
      </div>
      <div class="flex gap-1">
        <button class="text-slate-400 hover:text-brand-600 text-sm" onclick="editActivity('${activity.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="text-slate-400 hover:text-red-500 text-sm" onclick="deleteActivity('${activity.id}')"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `;
    list.appendChild(div);
  });
}

function editActivity(activityId) {
  const activity = getActivityById(activityId);
  if (!activity) return;

  const name = prompt('Nome attività:', activity.name);
  if (name) {
    activity.name = name;
    saveToStorage();
    renderActivitiesList();
  }
}

function deleteActivity(activityId) {
  if (!confirm('Eliminare l\'attività?')) return;
  state.config.activities = state.config.activities.filter(a => a.id !== activityId);
  saveToStorage();
  renderActivitiesList();
  renderAll();
}

document.getElementById('btn-add-activity').addEventListener('click', () => {
  const name = prompt('Nome dell\'attività (es. "M.S.Savino"):');
  if (!name) return;

  const requirements = [];
  if (state.config.roles.length > 0) {
    const roleStr = prompt('Ruoli richiesti (es. "role-1:2,role-2:1" per 2 del ruolo 1 e 1 del ruolo 2):');
    if (roleStr) {
      roleStr.split(',').forEach(item => {
        const [roleId, count] = item.trim().split(':');
        if (roleId && count && getRoleById(roleId)) {
          requirements.push({ roleId, count: parseInt(count) });
        }
      });
    }
  }

  const activity = {
    id: generateId(),
    name,
    location: name,
    requirements: requirements.length > 0 ? requirements : [{ roleId: state.config.roles[0]?.id, count: 1 }]
  };

  state.config.activities.push(activity);
  saveToStorage();
  renderActivitiesList();
  renderAll();
});

// ====================================================
// UNAVAILABILITY MODAL
// ====================================================

let currentUnavailStaffId = null;

function openUnavailabilityModal(staffId) {
  currentUnavailStaffId = staffId;
  const staff = getStaffById(staffId);
  if (!staff) return;
  document.getElementById('unavail-modal-title').textContent = staff.name;
  document.getElementById('unavail-modal-subtitle').textContent = 'Ferie e periodi di indisponibilità';
  document.getElementById('unavail-from').value = '';
  document.getElementById('unavail-to').value = '';
  document.getElementById('unavail-note').value = '';
  renderUnavailabilityList();
  document.getElementById('unavailability-modal').classList.remove('hidden');
}

function closeUnavailabilityModal() {
  document.getElementById('unavailability-modal').classList.add('hidden');
  currentUnavailStaffId = null;
}

function renderUnavailabilityList() {
  const staff = getStaffById(currentUnavailStaffId);
  const container = document.getElementById('unavail-list');
  if (!staff || staff.unavailability.length === 0) {
    container.innerHTML = '<p class="text-slate-400 text-sm italic text-center py-4">Nessun periodo registrato.</p>';
    return;
  }
  const typeLabel = { ferie: '🏖️ Ferie', malattia: '🤒 Malattia', indisponibile: '🚫 Indisponibile' };
  container.innerHTML = [...staff.unavailability]
    .sort((a, b) => a.from.localeCompare(b.from))
    .map(u => `
      <div class="flex items-start justify-between p-3 border border-slate-200 rounded-lg mb-2 bg-white">
        <div>
          <p class="font-semibold text-sm text-slate-800">${typeLabel[u.type] || u.type}</p>
          <p class="text-sm text-slate-600">${formatDateIT(u.from)} → ${formatDateIT(u.to)}</p>
          ${u.note ? `<p class="text-xs text-slate-400 mt-0.5">${u.note}</p>` : ''}
        </div>
        <button class="text-slate-400 hover:text-red-500 text-sm ml-2 mt-0.5" onclick="deleteUnavailability('${u.id}')">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `).join('');
}

function formatDateIT(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function addUnavailability() {
  const staff = getStaffById(currentUnavailStaffId);
  if (!staff) return;
  const from = document.getElementById('unavail-from').value;
  const to = document.getElementById('unavail-to').value;
  const type = document.getElementById('unavail-type').value;
  const note = document.getElementById('unavail-note').value.trim();
  if (!from || !to) { alert('Seleziona data inizio e fine.'); return; }
  if (to < from) { alert('La data di fine deve essere uguale o successiva alla data di inizio.'); return; }
  staff.unavailability.push({ id: generateId(), type, from, to, note });
  saveToStorage();
  renderUnavailabilityList();
  renderStaffList();
  renderAll();
  document.getElementById('unavail-from').value = '';
  document.getElementById('unavail-to').value = '';
  document.getElementById('unavail-note').value = '';
}

function deleteUnavailability(periodId) {
  const staff = getStaffById(currentUnavailStaffId);
  if (!staff) return;
  staff.unavailability = staff.unavailability.filter(u => u.id !== periodId);
  saveToStorage();
  renderUnavailabilityList();
  renderStaffList();
  renderAll();
}

document.getElementById('unavail-close').addEventListener('click', closeUnavailabilityModal);
document.getElementById('unavail-add').addEventListener('click', addUnavailability);

// ====================================================
// STAFF CRUD
// ====================================================
function renderStaffList() {
  const list = document.getElementById('staff-list');
  list.innerHTML = '';

  if (state.staff.length === 0) {
    list.innerHTML = '<p class="text-slate-400 text-sm">Nessun membro del personale</p>';
    return;
  }

  state.staff.forEach(staff => {
    const role = getRoleById(staff.roleId);
    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-3 border rounded-lg border-slate-200 bg-slate-50';
    div.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="w-4 h-4 rounded" style="background:${staff.color}"></span>
        <div>
          <p class="font-medium text-slate-800">${staff.name}</p>
          <p class="text-xs text-slate-500">${role?.name} — ${staff.maxWeeklyHours}h/week</p>
        </div>
      </div>
      <div class="flex gap-1 items-center">
        <button class="text-slate-400 hover:text-amber-500 text-sm px-1" onclick="openUnavailabilityModal('${staff.id}')" title="Gestisci indisponibilità"><i class="fa-solid fa-calendar-xmark"></i>${staff.unavailability.length > 0 ? `<span class="ml-1 text-xs bg-amber-100 text-amber-700 rounded px-1">${staff.unavailability.length}</span>` : ''}</button>
        <button class="text-slate-400 hover:text-brand-600 text-sm px-1" onclick="editStaff('${staff.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="text-slate-400 hover:text-red-500 text-sm px-1" onclick="deleteStaff('${staff.id}')"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `;
    list.appendChild(div);
  });
}

function editStaff(staffId) {
  const staff = getStaffById(staffId);
  if (!staff) return;

  const name = prompt('Nome:', staff.name);
  const hours = prompt('Ore settimanali:', staff.maxWeeklyHours);

  if (name && hours) {
    staff.name = name;
    staff.maxWeeklyHours = parseInt(hours);
    saveToStorage();
    renderStaffList();
  }
}

function deleteStaff(staffId) {
  if (!confirm('Eliminare il membro del personale? Gli turni assegnati verranno mantenuti.')) return;
  state.staff = state.staff.filter(s => s.id !== staffId);
  saveToStorage();
  renderStaffList();
  renderAll();
}

document.getElementById('btn-add-staff').addEventListener('click', () => {
  if (state.config.roles.length === 0) {
    alert('Aggiungi prima un ruolo');
    return;
  }

  const name = prompt('Nome del membro:');
  if (!name) return;

  const staff = {
    id: generateId(),
    name,
    roleId: state.config.roles[0].id,
    maxWeeklyHours: 38,
    color: COLOR_PALETTE[state.staff.length % COLOR_PALETTE.length].hex,
    unavailability: []
  };

  state.staff.push(staff);
  saveToStorage();
  renderStaffList();
});
