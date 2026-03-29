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

let wizardStep = 1;
const WIZARD_TOTAL = 6;
let wRoles = [];
let wShifts = [];
let wActivities = [];
let wStaff = [];

function startWizard() {
  wRoles = [{ id: generateId(), name: 'Medico', color: COLOR_PALETTE[0].hex }];
  wShifts = [];
  wActivities = [];
  wStaff = [];
  wizardStep = 1;
  document.getElementById('onboarding-wizard').classList.remove('hidden');
  renderWizardStep();
}

function renderWizardStep() {
  const pct = (wizardStep / WIZARD_TOTAL * 100).toFixed(2);
  document.getElementById('wizard-progress-bar').style.width = `${pct}%`;
  document.getElementById('wizard-step-label').textContent = `Passo ${wizardStep} di ${WIZARD_TOTAL}`;

  // Clone buttons to remove previous event listeners
  ['wizard-back', 'wizard-next'].forEach(id => {
    const el = document.getElementById(id);
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
  });

  const backBtn = document.getElementById('wizard-back');
  const nextBtn = document.getElementById('wizard-next');

  backBtn.classList.toggle('hidden', wizardStep === 1);
  nextBtn.classList.toggle('hidden', wizardStep === 6);

  const stepFns = [null, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];
  stepFns[wizardStep]();

  backBtn.addEventListener('click', () => { wizardStep--; renderWizardStep(); });

  if (wizardStep < 6) {
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
    (wizardStep === 3 && wShifts.length >= 1) ||
    (wizardStep === 4 && wActivities.length >= 1) ||
    (wizardStep === 1 || wizardStep === 5);
  nextBtn.disabled = !valid;
}

function wizardAdvance() {
  // Step 4: auto-add typed text if present
  if (wizardStep === 4) {
    const input = document.getElementById('w-activity-input');
    if (input && input.value.trim()) {
      wActivities.push({ id: generateId(), name: input.value.trim() });
    }
  }
  if (wizardStep === 2 && wRoles.length < 1) return false;
  if (wizardStep === 3 && wShifts.length < 1) return false;
  if (wizardStep === 4 && wActivities.length < 1) return false;
  return true;
}

function finishWizard() {
  state.config.roles = wRoles;
  state.config.shifts = wShifts;
  state.config.activities = wActivities.map(a => ({
    id: a.id,
    name: a.name,
    location: a.name,
    requirements: wRoles.length > 0 ? [{ roleId: wRoles[0].id, count: 1 }] : []
  }));
  state.staff = wStaff.map(s => ({
    id: s.id,
    name: s.name,
    roleId: s.roleId,
    color: s.color,
    maxWeeklyHours: 38,
    unavailability: []
  }));
  saveToStorage();
  document.getElementById('onboarding-wizard').classList.add('hidden');
  renderAll();
}

function renderStep1() {
  document.getElementById('wizard-step-content').innerHTML = `
    <div class="text-center py-4">
      <div class="text-6xl mb-6">📅</div>
      <h1 class="text-2xl font-bold text-slate-800 mb-4">Benvenuto nel tuo Gestore Turni!</h1>
      <p class="text-lg text-slate-500 leading-relaxed">
        Impostiamo tutto in pochi semplici passaggi.<br>Ci vorranno meno di 2 minuti.
      </p>
    </div>
  `;
}

function renderStep2() {
  const chipsHtml = wRoles.map(r => `
    <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-semibold text-base" style="background:${r.color}">
      ${r.name}
      ${wRoles.length > 1 ? `<button class="w-remove-role opacity-75 hover:opacity-100 ml-1" data-id="${r.id}" style="line-height:1">×</button>` : ''}
    </span>
  `).join('');

  document.getElementById('wizard-step-content').innerHTML = `
    <h1 class="text-2xl font-bold text-slate-800 mb-2">Chi lavorerà in questi turni?</h1>
    <p class="text-lg text-slate-500 mb-5">Il ruolo <strong>Medico</strong> è già aggiunto. Puoi aggiungerne altri o andare avanti.</p>
    <div id="w-roles-chips" class="flex flex-wrap gap-2 mb-5">${chipsHtml}</div>
    <div class="flex flex-wrap gap-3 mb-5">
      <button id="w-add-infermiere" class="py-3 px-5 rounded-xl border-2 border-brand-200 text-brand-700 font-bold text-base hover:bg-brand-50 transition-colors">+ Infermiere</button>
      <button id="w-add-oss" class="py-3 px-5 rounded-xl border-2 border-brand-200 text-brand-700 font-bold text-base hover:bg-brand-50 transition-colors">+ OSS</button>
    </div>
    <div class="flex gap-2">
      <input id="w-role-input" type="text" placeholder="Altro ruolo..."
        class="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-brand-400">
      <button id="w-role-add" class="py-3 px-5 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 transition-colors text-base">+ Aggiungi</button>
    </div>
  `;

  function addRole(name) {
    if (!name || wRoles.find(r => r.name.toLowerCase() === name.toLowerCase())) return;
    wRoles.push({ id: generateId(), name, color: COLOR_PALETTE[wRoles.length % COLOR_PALETTE.length].hex });
    renderStep2(); updateWizardNextState();
  }

  document.getElementById('w-add-infermiere').addEventListener('click', () => addRole('Infermiere'));
  document.getElementById('w-add-oss').addEventListener('click', () => addRole('OSS'));
  document.getElementById('w-role-add').addEventListener('click', () => {
    addRole(document.getElementById('w-role-input').value.trim());
  });
  document.getElementById('w-role-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addRole(e.target.value.trim());
  });
  document.querySelectorAll('.w-remove-role').forEach(btn => {
    btn.addEventListener('click', () => {
      wRoles = wRoles.filter(r => r.id !== btn.dataset.id);
      renderStep2(); updateWizardNextState();
    });
  });
}

function renderStep3() {
  const chipsHtml = wShifts.map(s => `
    <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-100 text-brand-800 font-semibold text-base">
      ${s.icon} ${s.label} (${s.startTime}–${s.endTime})
      ${wShifts.length > 1 ? `<button class="w-remove-shift opacity-75 hover:opacity-100 ml-1" data-id="${s.id}" style="line-height:1">×</button>` : ''}
    </span>
  `).join('');

  document.getElementById('wizard-step-content').innerHTML = `
    <h1 class="text-2xl font-bold text-slate-800 mb-2">Quali sono gli orari di lavoro?</h1>
    <p class="text-lg text-slate-500 mb-4">Usa i turni standard oppure crea i tuoi.</p>
    <button id="w-use-standard" class="w-full py-4 px-6 rounded-xl bg-green-50 border-2 border-green-300 text-green-800 font-bold text-lg hover:bg-green-100 transition-colors mb-5 text-left">
      ✅ Usa turni standard<br>
      <span class="text-base font-normal text-green-700">Mattina 08:00–14:00 · Pomeriggio 14:00–20:00</span>
    </button>
    ${wShifts.length > 0 ? `<div class="flex flex-wrap gap-2 mb-5">${chipsHtml}</div>` : ''}
    <p class="text-base font-semibold text-slate-400 mb-3">Oppure aggiungi un turno personalizzato:</p>
    <div class="flex flex-col gap-2">
      <input id="w-shift-label" type="text" placeholder="Nome turno (es. Notte)"
        class="border-2 border-slate-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-brand-400">
      <div class="flex gap-2 items-center">
        <input id="w-shift-start" type="time" value="08:00"
          class="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-brand-400">
        <span class="text-slate-400 font-bold">→</span>
        <input id="w-shift-end" type="time" value="14:00"
          class="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-brand-400">
      </div>
      <button id="w-shift-add" class="py-3 px-5 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 transition-colors text-base">+ Aggiungi turno</button>
    </div>
  `;

  document.getElementById('w-use-standard').addEventListener('click', () => {
    wShifts = [
      { id: generateId(), label: 'Mattina',    startTime: '08:00', endTime: '14:00', hours: 6, icon: '🌅' },
      { id: generateId(), label: 'Pomeriggio', startTime: '14:00', endTime: '20:00', hours: 6, icon: '🌇' }
    ];
    renderStep3(); updateWizardNextState();
  });

  document.getElementById('w-shift-add').addEventListener('click', () => {
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

  document.querySelectorAll('.w-remove-shift').forEach(btn => {
    btn.addEventListener('click', () => {
      wShifts = wShifts.filter(s => s.id !== btn.dataset.id);
      renderStep3(); updateWizardNextState();
    });
  });
}

function renderStep4() {
  const chipsHtml = wActivities.map(a => `
    <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 font-semibold text-base">
      🏥 ${a.name}
      <button class="w-remove-activity opacity-75 hover:opacity-100 ml-1" data-id="${a.id}" style="line-height:1">×</button>
    </span>
  `).join('');

  document.getElementById('wizard-step-content').innerHTML = `
    <h1 class="text-2xl font-bold text-slate-800 mb-2">Dove si svolgono i turni?</h1>
    <p class="text-lg text-slate-500 mb-5">Scrivi il nome della tua sede o reparto.</p>
    ${wActivities.length > 0 ? `<div class="flex flex-wrap gap-2 mb-5">${chipsHtml}</div>` : ''}
    <div class="flex gap-2">
      <input id="w-activity-input" type="text" placeholder="es. M.S. Savino, Guardia Medica..."
        class="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-brand-400">
      <button id="w-activity-add" class="py-3 px-5 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 transition-colors text-base">+ Aggiungi</button>
    </div>
    ${wActivities.length === 0 ? '<p class="text-sm text-rose-500 mt-3 font-medium">⚠️ Aggiungi almeno una sede per continuare.</p>' : ''}
  `;

  function addActivity() {
    const val = document.getElementById('w-activity-input').value.trim();
    if (!val) return;
    wActivities.push({ id: generateId(), name: val });
    renderStep4(); updateWizardNextState();
  }

  document.getElementById('w-activity-add').addEventListener('click', addActivity);
  document.getElementById('w-activity-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addActivity();
  });
  document.querySelectorAll('.w-remove-activity').forEach(btn => {
    btn.addEventListener('click', () => {
      wActivities = wActivities.filter(a => a.id !== btn.dataset.id);
      renderStep4(); updateWizardNextState();
    });
  });
}

function renderStep5() {
  const roleOptions = wRoles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  const staffHtml = wStaff.map(s => {
    const role = wRoles.find(r => r.id === s.roleId);
    return `
      <div class="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
        <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:${s.color}"></div>
        <span class="flex-1 font-semibold text-slate-700 text-base">${s.name}</span>
        <span class="text-sm px-3 py-1 rounded-full text-white" style="background:${role?.color || '#64748b'}">${role?.name || ''}</span>
        <button class="w-remove-staff text-slate-400 hover:text-rose-500 text-xl font-bold leading-none" data-id="${s.id}">×</button>
      </div>
    `;
  }).join('');

  document.getElementById('wizard-step-content').innerHTML = `
    <h1 class="text-2xl font-bold text-slate-800 mb-2">Aggiungiamo i tuoi colleghi</h1>
    <p class="text-lg text-slate-500 mb-5">Puoi saltare questo passaggio e aggiungere il personale in seguito dalle Impostazioni.</p>
    <div class="flex flex-col gap-2 mb-5">
      <input id="w-staff-name" type="text" placeholder="Nome e cognome..."
        class="border-2 border-slate-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-brand-400">
      <div class="flex gap-2">
        <select id="w-staff-role" class="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-brand-400">${roleOptions}</select>
        <button id="w-staff-add" class="py-3 px-5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-colors text-base">+ Aggiungi</button>
      </div>
    </div>
    ${wStaff.length > 0
      ? `<div class="divide-y divide-slate-100">${staffHtml}</div>`
      : '<p class="text-slate-400 text-base italic">Nessun collega aggiunto ancora.</p>'}
  `;

  function addStaff() {
    const name = document.getElementById('w-staff-name').value.trim();
    const roleId = document.getElementById('w-staff-role').value;
    if (!name) return;
    wStaff.push({ id: generateId(), name, roleId, color: COLOR_PALETTE[wStaff.length % COLOR_PALETTE.length].hex });
    renderStep5();
  }

  document.getElementById('w-staff-add').addEventListener('click', addStaff);
  document.getElementById('w-staff-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') addStaff();
  });
  document.querySelectorAll('.w-remove-staff').forEach(btn => {
    btn.addEventListener('click', () => {
      wStaff = wStaff.filter(s => s.id !== btn.dataset.id);
      renderStep5();
    });
  });
}

function renderStep6() {
  document.getElementById('wizard-step-content').innerHTML = `
    <div class="text-center py-4">
      <div class="text-6xl mb-6">✅</div>
      <h1 class="text-2xl font-bold text-slate-800 mb-4">Tutto pronto!</h1>
      <p class="text-lg text-slate-500 mb-8">
        ${wRoles.length} ruol${wRoles.length === 1 ? 'o' : 'i'} &middot;
        ${wShifts.length} turn${wShifts.length === 1 ? 'o' : 'i'} &middot;
        ${wActivities.length} sed${wActivities.length === 1 ? 'e' : 'i'} &middot;
        ${wStaff.length} collegh${wStaff.length === 1 ? 'i' : 'i'}
      </p>
      <button id="w-finish" class="w-full py-5 px-8 rounded-2xl bg-green-600 text-white font-bold text-xl hover:bg-green-700 transition-colors shadow-lg">
        Inizia a usare il programma →
      </button>
    </div>
  `;
  document.getElementById('w-finish').addEventListener('click', finishWizard);
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
      <div class="flex gap-1">
        <button class="text-slate-400 hover:text-brand-600 text-sm" onclick="editStaff('${staff.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="text-slate-400 hover:text-red-500 text-sm" onclick="deleteStaff('${staff.id}')"><i class="fa-solid fa-trash-can"></i></button>
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
