// ====================================================
// renderers.js — DOM layout writers, modals, wizard,
//                import/export, copy/paste
// ====================================================

import {
  state, PLACES, SLOTS,
  saveToStorage, pushHistory, clearHistory
} from './state.js';
import {
  generateId, cleanDoctorName, escapeHtml, excelDateToDate,
  toDateKey, formatDateShort, getWeekStart, calculateWeeklyHoursByPatients,
  getDoctorColor, getMonthlyBudget, getProgressBarData,
  el, toast, getDoctorById, isDoctorAvailableForSlot,
  isDoctorUnavailable, getWeeklyAssignedHours, getAssignedHoursInMonth,
  getRemainingMonthlyHours, matchDoctorBySurname
} from './core-utils.js';
import {
  COLOR_PALETTE, DAY_NAMES, DAY_KEYS, MONTHS_IT,
  DROPDOWN_HEIGHT, DROPDOWN_WIDTH, EXTERNAL_PREFIX, WIZARD_TOTAL
} from './config.js';
import { isItalianHoliday } from './holidays.js';

// ====================================================
// 7. RENDERING
// ====================================================

let searchQuery = '';
let filterAFT = '';
let hideZeroDocs = false;
let copyWeekSource = null;

export function setSearchQuery(q) { searchQuery = q; }
export function setFilterAFT(v) { filterAFT = v; }

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

function resolveShiftCell(id) {
  if (!id) return { display: '', bg: '', textColor: '' };
  if (typeof id === 'string' && id.startsWith(EXTERNAL_PREFIX)) {
    return { display: id.replace(EXTERNAL_PREFIX, ''), bg: '#d97706', textColor: '#ffffff' };
  }
  const doc = getDoctorById(state.doctors, id);
  if (doc) {
    return { display: cleanDoctorName(doc.name), bg: getDoctorColor(doc).hex, textColor: '#ffffff' };
  }
  return { display: '', bg: '', textColor: '' };
}

function createSlotButton(dateKey, place, slot, inMonth) {
  const slotKey = `${dateKey}_${slot.key}_${place}`;
  const assignedId = state.assignments[slotKey];
  const isExt = assignedId && assignedId.startsWith(EXTERNAL_PREFIX);
  const assignedDoc = !isExt && assignedId ? getDoctorById(state.doctors, assignedId) : null;
  const extName = isExt ? assignedId.replace(EXTERNAL_PREFIX, '') : null;
  const color = assignedDoc ? getDoctorColor(assignedDoc) : (extName ? { hex: '#d97706' } : null);
  const displayName = assignedDoc ? cleanDoctorName(assignedDoc.name) : extName;

  const slotBtn = document.createElement('button');
  slotBtn.className = 'slot-btn w-full text-left rounded-lg px-2 py-1.5 mb-1 text-xs font-medium border transition-all ' +
    (displayName ? 'border-transparent text-white shadow-sm' : inMonth ? 'border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-brand-400 hover:bg-blue-50 hover:text-brand-700' : 'border-transparent bg-transparent cursor-default');
  if (color && displayName) slotBtn.style.backgroundColor = color.hex;

  slotBtn.innerHTML = displayName
    ? `<div class="truncate font-semibold text-xs">${escapeHtml(displayName)}</div><div class="text-[10px] opacity-80">${slot.icon} ${slot.label}</div>`
    : `<div class="text-slate-400 text-xs">${slot.icon} <span class="text-slate-400">Assegna</span></div>`;
  slotBtn.setAttribute('aria-label', displayName ? `${displayName} · ${place} · ${slot.label}` : `Assegna turno · ${place} · ${slot.label}`);

  if (inMonth) {
    slotBtn.dataset.slotKey = slotKey;
    slotBtn.dataset.dateKey = dateKey;
    slotBtn.dataset.place = place;
    slotBtn.dataset.slotType = slot.key;
    slotBtn.addEventListener('click', (e) => openAssignDropdown(e, slotKey, slot, dateKey, place, e.currentTarget.getBoundingClientRect()));
  }
  return slotBtn;
}

export function renderCalendar() {
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
  const header = el('cal-title');
  if (header) header.textContent = `${formatDateShort(weekStart)} – ${formatDateShort(weekEnd)}`;
  const container = el('cal-grid');
  if (!container) return;
  container.className = 'grid grid-cols-5 gap-2';
  container.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateKey = toDateKey(d);
    const isHoliday = isItalianHoliday(d);
    const isToday = toDateKey(new Date()) === dateKey;
    const cell = document.createElement('div');
    cell.className = `rounded-xl p-2 border ${isHoliday ? 'holiday-cell border-slate-100' : 'bg-white shadow-sm border-slate-200'} ${isToday ? 'ring-2 ring-brand-400' : ''}`;
    const dayName = DAY_NAMES[i];
    const dayNum = d.getDate();

    if (isHoliday) {
      cell.innerHTML = `<div class="flex items-center justify-between mb-1">
        <span class="text-xs font-bold text-slate-500">${dayName} ${dayNum}</span>
        <span class="text-[9px] font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded uppercase">Festivo</span>
      </div>
      <div class="flex items-center justify-center py-3 text-[10px] font-bold text-red-500 uppercase tracking-widest">Chiuso</div>`;
    } else {
      cell.innerHTML = `<div class="text-xs font-bold text-slate-500 mb-1 pb-1 border-b border-slate-100 flex items-center justify-between">
        <span>${dayName} ${dayNum}</span>
      </div>`;
      PLACES.forEach(place => {
        const { coverageClass, coverageIcon } = getCoverageBadge(dateKey, place);
        const placeDiv = document.createElement('div');
        placeDiv.className = 'mb-1';
        placeDiv.innerHTML = `<div class="flex items-center gap-1 mb-0.5"><span class="text-[10px] font-semibold text-slate-500 flex-1 truncate">${escapeHtml(place)}</span><span class="text-[10px] font-bold px-1 rounded ${coverageClass}">${coverageIcon}</span></div>`;
        SLOTS.forEach(slot => {
          placeDiv.appendChild(createSlotButton(dateKey, place, slot, true));
        });
        cell.appendChild(placeDiv);
      });
    }
    container.appendChild(cell);
  }
}

function renderCalendarMonth() {
  const year = state.calYear;
  const month = state.calMonth;
  const header = el('cal-title');
  if (header) header.textContent = `${MONTHS_IT[month]} ${year}`;
  const container = el('cal-grid');
  if (!container) return;
  container.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = getWeekStart(firstDay);

  let currentWeekStart = new Date(startDate);
  while (currentWeekStart <= lastDay) {
    const weekRow = document.createElement('div');
    weekRow.className = 'grid grid-cols-5 gap-2 mb-2';
    for (let i = 0; i < 5; i++) {
      const cellDate = new Date(currentWeekStart);
      cellDate.setDate(cellDate.getDate() + i);
      const dateKey = toDateKey(cellDate);
      const inMonth = cellDate.getMonth() === month;
      const isToday = toDateKey(new Date()) === dateKey;
      const isHoliday = isItalianHoliday(cellDate);

      const cell = document.createElement('div');
      cell.className = `rounded-xl p-2 border ${isHoliday && inMonth ? 'holiday-cell border-slate-100' : inMonth ? 'bg-white shadow-sm border-slate-100' : 'bg-transparent border-transparent'} ${isToday && inMonth ? 'ring-2 ring-brand-400' : ''}`;

      if (isHoliday && inMonth) {
        cell.innerHTML = `<div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-slate-500">${cellDate.getDate()}</span>
          <span class="text-[9px] font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded uppercase">Festivo</span>
        </div>
        <div class="flex items-center justify-center py-3 text-[10px] font-bold text-red-500 uppercase tracking-widest">Chiuso</div>`;
      } else if (inMonth) {
        cell.innerHTML = `<div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold ${isToday ? 'bg-brand-700 text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-slate-500'}">${cellDate.getDate()}</span>
        </div>`;
        PLACES.forEach(place => {
          const placeSection = document.createElement('div');
          placeSection.className = 'mb-1 pb-1 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0';
          const badge = getCoverageBadge(dateKey, place);
          placeSection.innerHTML = `<div class="flex items-center justify-between mb-1">
            <span class="text-[9px] font-bold text-slate-400 uppercase">${escapeHtml(place)}</span>
            <span class="text-[9px] font-bold ${badge.coverageClass} px-1 rounded">${badge.coverageIcon}</span>
          </div>`;
          SLOTS.forEach(slot => {
            placeSection.appendChild(createSlotButton(dateKey, place, slot, true));
          });
          cell.appendChild(placeSection);
        });
      }
      weekRow.appendChild(cell);
    }
    container.appendChild(weekRow);
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }
}

export function updateGeneraButtonLabel() {
  const label = el('btn-genera-label');
  if (label) {
    const nextMonth = (state.calMonth + 1) % 12;
    label.textContent = MONTHS_IT[nextMonth];
  }
}

export function renderSidebar() {
  const container = el('sidebar-doctors');
  if (!container) return;
  const weekEnd = new Date(state.sidebarWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 4);
  const label = el('sidebar-week-label');
  if (label) label.textContent = `${formatDateShort(state.sidebarWeekStart)} – ${formatDateShort(weekEnd)}`;
  const filtered = filterDoctors();
  container.innerHTML = filtered.map(doc => {
    const color = getDoctorColor(doc);
    const weeklyH = getWeeklyAssignedHours(doc.id, state.sidebarWeekStart, SLOTS, PLACES, state.assignments);
    const { pct, barColor } = getProgressBarData(weeklyH, doc.weeklyHours ?? 38);
    const monthH = getAssignedHoursInMonth(doc.id, state.calMonth, state.calYear, SLOTS, PLACES, state.assignments);
    const budget = getMonthlyBudget(doc);
    const remH = Math.max(0, budget - monthH);
    return `
      <div class="doctor-card bg-white rounded-xl shadow-sm border border-slate-200 p-3 cursor-pointer hover:shadow-md transition-shadow" onclick="window.openDoctorModal('${doc.id}')" title="Click per modificare">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="w-3 h-3 rounded-full flex-shrink-0" style="background:${color.hex}"></span>
          <span class="font-semibold text-sm text-slate-800 truncate">${escapeHtml(cleanDoctorName(doc.name))}</span>
          <span class="text-[10px] text-slate-400 ml-auto">${remH}h residue</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="flex-1 h-1.5 bg-slate-100 rounded-full">
            <div style="width:${pct}%; background:${barColor}" class="h-1.5 rounded-full transition-all"></div>
          </div>
          <span class="text-[10px] text-slate-400 flex-shrink-0">${weeklyH}/${doc.weeklyHours ?? 38}h</span>
        </div>
      </div>`;
  }).join('');
  updateConflictsHeaderBadge();
}

export function renderAll() {
  updateGeneraButtonLabel();
  renderCalendar();
  renderSidebar();
  renderMonthlyStats();
}

export function toggleCalendarView() {
  state.calendarView = state.calendarView === 'monthly' ? 'weekly' : 'monthly';
  const icon = el('view-toggle-icon');
  const label = el('view-toggle-label');
  if (icon) icon.className = state.calendarView === 'monthly' ? 'fa-solid fa-calendar-week' : 'fa-solid fa-calendar-days';
  if (label) label.textContent = state.calendarView === 'monthly' ? 'Settimana' : 'Mese';
  renderAll();
}

// ====================================================
// 8. MODALI — Assign dropdown
// ====================================================

function positionDropdown(rect) {
  const dropdown = el('assign-dropdown');
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
  const list = el('assign-list');
  const place = slotKey.split('_').slice(2).join('_');
  const availDocs = state.doctors.filter(doc => {
    if (!isDoctorAvailableForSlot(doc, dateKey, slot.key)) return false;
    const isBusyElsewhere = PLACES.some(p =>
      p !== place && state.assignments[`${dateKey}_${slot.key}_${p}`] === doc.id
    );
    return !isBusyElsewhere;
  });
  availDocs.sort((a, b) => {
    const aPref = a.preferredPlace === place ? 0 : 1;
    const bPref = b.preferredPlace === place ? 0 : 1;
    if (aPref !== bPref) return aPref - bPref;
    return (b.weeklyHours || 0) - (a.weeklyHours || 0);
  });
  list.innerHTML = '';
  availDocs.forEach(doc => {
    const color = getDoctorColor(doc);
    const weeklyH = getWeeklyAssignedHours(doc.id, getWeekStart(new Date(dateKey + 'T00:00:00')), SLOTS, PLACES, state.assignments);
    const pct = (doc.weeklyHours ?? 38) > 0 ? Math.round((weeklyH / (doc.weeklyHours ?? 38)) * 100) : 0;
    const btn = document.createElement('button');
    btn.className = 'w-full text-left rounded-lg px-3 py-2 hover:bg-slate-100 flex items-center gap-2 transition';
    btn.innerHTML = `
      <span class="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style="background:${color.hex}"></span>
      <span class="flex-1 font-medium text-xs">${escapeHtml(doc.name)}</span>
      <div class="flex flex-col items-end gap-0.5">
        <span class="text-[10px] text-slate-400">${weeklyH}/${doc.weeklyHours ?? 38}h</span>
        <div class="w-12 h-1 bg-slate-100 rounded-full"><div style="width:${Math.min(100, pct)}%; background:${pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e'}" class="h-1 rounded-full"></div></div>
      </div>`;
    btn.addEventListener('click', () => assignDoctor(slotKey, doc.id));
    list.appendChild(btn);
  });
}

export function openAssignDropdown(e, slotKey, slot, dateKey, place, rect) {
  closeAssignDropdown();
  e.stopPropagation();
  state.activeSlotKey = slotKey;
  const dropdown = el('assign-dropdown');
  const header = el('assign-slot-label');
  header.textContent = `${slot.icon} ${slot.label} · ${place} · ${dateKey}`;
  el('assign-remove-wrap').classList.toggle('hidden', !state.assignments[slotKey]);
  renderAvailableList(slotKey, slot, dateKey);
  const unavailSection = el('assign-unavail-section');
  const unavailList = el('assign-unavail-list');
  unavailSection.classList.add('hidden');
  el('assign-custom-section').classList.add('hidden');
  const availIds = new Set(state.doctors.filter(doc =>
    isDoctorAvailableForSlot(doc, dateKey, slot.key)
  ).map(d => d.id));
  const busyIds = new Set(state.doctors.filter(doc =>
    PLACES.some(p => p !== place && state.assignments[`${dateKey}_${slot.key}_${p}`] === doc.id)
  ).map(d => d.id));
  const unavailDocs = state.doctors.filter(doc => !availIds.has(doc.id) || busyIds.has(doc.id));
  unavailList.innerHTML = '';
  unavailDocs.forEach(doc => {
    const color = getDoctorColor(doc);
    const btn = document.createElement('button');
    btn.className = 'w-full text-left rounded-lg px-3 py-2 hover:bg-slate-100 flex items-center gap-2 transition';
    const isUnavailReason = !busyIds.has(doc.id);
    btn.innerHTML = `
      <span class="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style="background:${color.hex}"></span>
      <span class="flex-1 font-medium text-xs">${escapeHtml(doc.name)}</span>
      ${isUnavailReason ? '<i class="fa-solid fa-ban text-red-400 text-xs" title="Non disponibile questo giorno"></i>' : ''}
      <span class="text-[10px] text-slate-400 italic">${busyIds.has(doc.id) ? 'stessa fascia oraria' : 'eccezione'}</span>`;
    btn.addEventListener('click', () => assignDoctor(slotKey, doc.id));
    unavailList.appendChild(btn);
  });
  el('assign-exception-btn').classList.remove('hidden');
  el('assign-custom-input').value = '';
  positionDropdown(rect || e.currentTarget.getBoundingClientRect());
  dropdown.classList.remove('hidden');
}

export function closeAssignDropdown() {
  el('assign-dropdown').classList.add('hidden');
  el('assign-unavail-section').classList.add('hidden');
  el('assign-custom-section').classList.add('hidden');
  el('assign-custom-input').value = '';
  el('assign-exception-btn').classList.add('hidden');
  state.activeSlotKey = null;
}

export function assignDoctor(slotKey, docId) {
  pushHistory();
  state.assignments[slotKey] = docId;
  saveToStorage();
  closeAssignDropdown();
  renderAll();
}

export function removeAssignment(slotKey) {
  pushHistory();
  delete state.assignments[slotKey];
  saveToStorage();
  closeAssignDropdown();
  renderAll();
}

// --- Doctor modal ---

let modalUnavail = [];
let unavailCalView = { year: new Date().getFullYear(), month: new Date().getMonth() };

export function renderUnavailCalendar() {
  const container = el('unavail-calendar');
  const title = el('unavail-cal-title');
  if (!container || !title) return;
  const { year, month } = unavailCalView;
  title.textContent = `${MONTHS_IT[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = getWeekStart(firstDay);

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-5 gap-1';

  const weekStart = new Date(startDate);
  while (weekStart <= lastDay) {
    for (let i = 0; i < 5; i++) {
      const cellDate = new Date(weekStart);
      cellDate.setDate(cellDate.getDate() + i);
      if (cellDate > lastDay) break;
      const dateKey = toDateKey(cellDate);
      const inMonth = cellDate.getMonth() === month;
      const isUnavail = modalUnavail.some(p => p && p.from && p.to && dateKey >= p.from && dateKey <= p.to);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.title = dateKey;
      btn.className = 'text-xs font-bold rounded-lg py-1.5 transition-all border ' +
        (isUnavail
          ? 'bg-red-500 text-white border-red-500'
          : inMonth
            ? 'bg-slate-50 text-slate-700 border-slate-200 hover:border-brand-400 hover:bg-blue-50'
            : 'bg-transparent text-slate-300 border-transparent cursor-default');
      btn.textContent = cellDate.getDate();
      if (inMonth) {
        btn.addEventListener('click', () => toggleModalUnavail(dateKey));
      } else {
        btn.disabled = true;
      }
      grid.appendChild(btn);
    }
    weekStart.setDate(weekStart.getDate() + 7);
  }
  container.innerHTML = '';
  container.appendChild(grid);
}

function toggleModalUnavail(dateKey) {
  const existing = modalUnavail.find(p => p.from === dateKey && p.to === dateKey);
  if (existing) {
    modalUnavail = modalUnavail.filter(p => p !== existing);
  } else {
    modalUnavail.push({ from: dateKey, to: dateKey });
  }
  renderUnavailCalendar();
}

export function unavailCalNav(dir) {
  unavailCalView.month += dir;
  if (unavailCalView.month < 0) { unavailCalView.month = 11; unavailCalView.year--; }
  if (unavailCalView.month > 11) { unavailCalView.month = 0; unavailCalView.year++; }
  renderUnavailCalendar();
}

export function unavailCalToday() {
  const now = new Date();
  unavailCalView = { year: now.getFullYear(), month: now.getMonth() };
  const todayKey = toDateKey(now);
  if (now.getDay() !== 0 && now.getDay() !== 6 && !modalUnavail.some(p => p.from === todayKey && p.to === todayKey)) {
    modalUnavail.push({ from: todayKey, to: todayKey });
  }
  renderUnavailCalendar();
}

function populatePlaceSelect(selectEl, selected) {
  selectEl.innerHTML = `<option value="">-- Nessuna preferenza --</option>
    ${PLACES.map(p => `<option value="${escapeHtml(p)}"${p === selected ? ' selected' : ''}>${escapeHtml(p)}</option>`).join('')}`;
}

function renderAvailabilityTable(availability) {
  const tbody = el('avail-table');
  const thead = el('avail-thead');
  if (!tbody) return;
  if (thead) {
    thead.innerHTML = `<tr class="bg-slate-50">
      <th class="px-3 py-2 text-left font-semibold text-slate-600 w-28">Giorno</th>
      ${SLOTS.map(s => `<th class="px-3 py-2 text-center font-semibold text-slate-600">${escapeHtml(s.icon)} ${escapeHtml(s.label)}<br><span class="text-xs font-normal text-slate-400">${s.hours}h</span></th>`).join('')}
    </tr>`;
  }
  tbody.innerHTML = DAY_KEYS.map(dk => `
    <tr>
      <td class="px-2 py-1 text-xs font-medium text-slate-600">${DAY_NAMES[DAY_KEYS.indexOf(dk)]}</td>
      ${SLOTS.map(s => `<td class="px-2 py-1"><input type="checkbox" ${(availability?.[dk]?.[s.key] ?? true) ? 'checked' : ''} class="avail-check" data-day="${dk}" data-slot="${s.key}"></td>`).join('')}
    </tr>`).join('');
}

function renderColorPicker(selectedIndex) {
  const container = el('color-picker');
  if (!container) return;
  container.innerHTML = COLOR_PALETTE.map((c, i) =>
    `<div class="w-6 h-6 rounded-full ${c.bg} cursor-pointer border-2 ${i === selectedIndex ? 'border-slate-800' : 'border-transparent'} color-swatch" data-index="${i}"></div>`
  ).join('');
}

export function openDoctorModal(doctorId = null) {
  state.editingDoctorId = doctorId;
  el('doctor-modal').classList.remove('hidden');
  el('modal-doctor-id').value = doctorId || '';
  el('modal-title').innerHTML = doctorId
    ? '<i class="fa-solid fa-user-pen"></i> Modifica Medico'
    : '<i class="fa-solid fa-user-doctor"></i> Aggiungi Medico';
  if (doctorId) {
    const doc = getDoctorById(state.doctors, doctorId);
    el('modal-name').value = doc.name;
    el('modal-patients').value = doc.patients || '';
    el('modal-hours').value = doc.weeklyHours ?? 38;
    el('modal-is-pool').checked = doc.isPool || false;
    el('modal-monthly-budget').value = doc.monthlyBudget ?? '';
    el('modal-aft').value = doc.aft || '';
    el('modal-seniority').value = doc.seniority || '';
    renderAvailabilityTable(doc.availability);
    renderColorPicker(doc.colorIndex || 0);
    populatePlaceSelect(el('modal-preferred-place'), doc.preferredPlace);
  } else {
    el('modal-name').value = '';
    el('modal-patients').value = '850';
    el('modal-hours').value = '38';
    el('modal-is-pool').checked = false;
    el('modal-monthly-budget').value = '';
    el('modal-aft').value = '';
    el('modal-seniority').value = '';
    renderAvailabilityTable(null);
    renderColorPicker(0);
    populatePlaceSelect(el('modal-preferred-place'), null);
  }
  const periodsContainer = el('unavail-periods');
  periodsContainer.innerHTML = '';
  modalUnavail = doctorId
    ? (getDoctorById(state.doctors, doctorId).unavailPeriods || []).map(p => ({ from: p.from, to: p.to }))
    : [];
  unavailCalView = { year: state.calYear, month: state.calMonth };
  renderUnavailCalendar();
  if (doctorId) {
    const doc = getDoctorById(state.doctors, doctorId);
    if (doc.unavailPeriods) doc.unavailPeriods.forEach(p => addUnavailPeriodRow(p.from, p.to));
  }
}

export function closeDoctorModal() {
  el('doctor-modal').classList.add('hidden');
}

export function deleteDoctor(id) {
  const doc = getDoctorById(state.doctors, id);
  if (!doc) return;
  const toastEl = document.createElement('div');
  toastEl.className = 'toast-item pointer-events-auto flex items-center gap-3 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm';
  toastEl.innerHTML = `
    <span>Eliminare <strong>${cleanDoctorName(doc.name)}</strong>?</span>
    <button class="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-600 confirm-yes">Sì</button>
    <button class="bg-slate-200 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-300 confirm-no">No</button>`;
  el('toast-container').appendChild(toastEl);
  toastEl.querySelector('.confirm-yes').addEventListener('click', () => {
    toastEl.remove();
    pushHistory();
    state.doctors = state.doctors.filter(d => d.id !== id);
    Object.keys(state.assignments).forEach(k => { if (state.assignments[k] === id) delete state.assignments[k]; });
    saveToStorage();
    closeDoctorModal();
    renderAll();
    toast('Medico eliminato', 'success');
  });
  toastEl.querySelector('.confirm-no').addEventListener('click', () => toastEl.remove());
}

export function resetAssignments() {
  const toastEl = document.createElement('div');
  toastEl.className = 'toast-item pointer-events-auto flex items-center gap-3 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm';
  toastEl.innerHTML = `
    <span>Eliminare <strong>tutte le assegnazioni</strong>?</span>
    <button class="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-600 confirm-yes">Sì</button>
    <button class="bg-slate-200 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-300 confirm-no">No</button>`;
  el('toast-container').appendChild(toastEl);
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

export function addUnavailPeriodRow(from = '', to = '') {
  const container = el('unavail-periods');
  if (!container) return;
  const periodEl = document.createElement('div');
  periodEl.className = 'flex gap-2 items-center bg-slate-50 rounded-lg p-2 unavail-period-row';
  periodEl.innerHTML = `
    <input type="date" value="${escapeHtml(from)}" class="border border-slate-300 rounded px-2 py-1 text-xs unavail-from" placeholder="Da">
    <span class="text-slate-400">—</span>
    <input type="date" value="${escapeHtml(to)}" class="border border-slate-300 rounded px-2 py-1 text-xs unavail-to" placeholder="A">
    <button type="button" onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700 text-xs">
      <i class="fa-solid fa-trash-can"></i>
    </button>`;
  container.appendChild(periodEl);
}

export function saveDoctorFromModal() {
  const doctorId = el('modal-doctor-id').value || generateId();
  const name = el('modal-name').value.trim();
  if (!name) { toast('Inserisci un nome', 'warning'); return; }
  const patients = parseInt(el('modal-patients').value) || 0;
  const rawHours = parseInt(el('modal-hours').value);
  const weeklyHours = isNaN(rawHours) ? 38 : rawHours;
  const isPool = el('modal-is-pool').checked;
  const budget = el('modal-monthly-budget').value ? parseFloat(el('modal-monthly-budget').value) : undefined;
  const aft = el('modal-aft').value || '';
  const seniority = parseInt(el('modal-seniority').value) || 0;
  const preferredPlace = el('modal-preferred-place').value || null;
  const selectedSwatch = document.querySelector('.color-swatch.border-slate-800');
  const colorIndex = selectedSwatch ? parseInt(selectedSwatch.dataset.index) : 0;
  const availability = {};
  document.querySelectorAll('.avail-check').forEach(cb => {
    const day = cb.dataset.day;
    const slot = cb.dataset.slot;
    if (!availability[day]) availability[day] = {};
    availability[day][slot] = cb.checked;
  });
  const unavailPeriods = modalUnavail.slice();
  document.querySelectorAll('.unavail-period-row').forEach(row => {
    const from = row.querySelector('.unavail-from').value;
    const to = row.querySelector('.unavail-to').value;
    if (from && to) unavailPeriods.push({ from, to });
  });

  if (state.editingDoctorId) {
    const doc = getDoctorById(state.doctors, state.editingDoctorId);
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
}

// --- Conflicts ---

function getConflicts() {
  const conflictsMap = {};
  for (const [key, docId] of Object.entries(state.assignments)) {
    const parts = key.split('_');
    const dateKey = parts[0];
    const slotKey = parts[1];
    const doc = getDoctorById(state.doctors, docId);
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

export function openConflictsModal() {
  const conflicts = getConflicts();
  const modal = el('conflicts-modal');
  const list = el('conflicts-list');
  const badge = el('conflicts-count-badge');
  const autoBtn = el('btn-auto-resolve-all');
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
    list.innerHTML = conflicts.map((c) => {
      const doc = getDoctorById(state.doctors, c.docId);
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
            <i class="fa-solid fa-location-dot text-slate-400"></i>${escapeHtml(place)}
          </span>
          <button class="conflict-remove-btn text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors" data-key="${k}">
            <i class="fa-solid fa-xmark mr-1"></i>Rimuovi
          </button>
        </div>`;
      }).join('');
      return `<div class="border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-50 px-4 py-3 flex items-center gap-3 border-b border-slate-200">
          <div class="w-3 h-3 rounded-full ${color.bg} flex-shrink-0"></div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-slate-800 text-sm truncate">${escapeHtml(doc?.name || 'Medico sconosciuto')}</p>
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
    // Attach conflict remove listeners
    document.querySelectorAll('.conflict-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        removeAssignment(btn.dataset.key);
        openConflictsModal();
      });
    });
  }
  modal.classList.remove('hidden');
  updateConflictsHeaderBadge();
}

export function closeConflictModal() {
  const modal = el('conflict-modal');
  if (modal) modal.classList.add('hidden');
}

export function closeConflictsModal() {
  el('conflicts-modal').classList.add('hidden');
}

export function autoResolveAllConflicts() {
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

export function updateConflictsHeaderBadge() {
  const conflicts = getConflicts();
  const badge = el('conflicts-header-badge');
  if (conflicts.length > 0) {
    badge.textContent = conflicts.length;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// --- Instructions ---

export function closeInstructions() {
  const modal = el('instructions-modal');
  if (modal) modal.classList.add('hidden');
}

// ====================================================
// 9. IMPORTA/ESPORTA
// ====================================================

export function exportJSON() {
  const data = { version: 1, exportDate: new Date().toISOString(), doctors: state.doctors, assignments: state.assignments };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `turni-${toDateKey(new Date())}.json`; a.click(); URL.revokeObjectURL(url);
}

export function importJSONFromFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data.doctors) || typeof data.assignments !== 'object' || data.assignments === null) throw new Error('Formato non valido');
      pushHistory();
      state.doctors = data.doctors; state.assignments = data.assignments;
      saveToStorage(); renderAll(); renderMonthlyStats(); toast('Importazione completata!', 'success');
    } catch (err) { toast('Errore importazione: ' + err.message, 'error'); }
  };
  reader.readAsText(file); e.target.value = '';
}

export function importExcelFromFile(e) {
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
  pushHistory();
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
    const doc = matchDoctorBySurname(state.doctors, excelName);
    if (doc) { state.assignments[key] = doc.id; assigned++; }
  }

  let debtCount = 0;
  for (const [excelName, hours] of Object.entries(parsed.debtDoctors)) {
    const doc = matchDoctorBySurname(state.doctors, excelName);
    if (doc) { doc.monthlyBudget = hours; debtCount++; }
  }
  for (const [excelName, hours] of Object.entries(parsed.poolDoctors)) {
    const doc = matchDoctorBySurname(state.doctors, excelName);
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

export function exportExcel() {
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
    const doc = getDoctorById(state.doctors, id);
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
    rows.push([cleanDoctorName(doc.name), Math.round(getRemainingMonthlyHours(doc, month, year, SLOTS, PLACES, state.assignments))]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 10 }, { wch: 8 }, ...PLACES.flatMap(() => SLOTS.map(() => ({ wch: 24 })))];
  XLSX.utils.book_append_sheet(wb, ws, monthName);
  XLSX.writeFile(wb, `turni-ruap-${monthName.toLowerCase()}-${year}.xlsx`);
  toast('Excel scaricato', 'success');
}

export function buildPdfContent() {
  const container = el('pdf-content');
  const table = el('pdf-table');
  if (!container || !table) return;
  const year = state.calYear;
  const month = state.calMonth;
  const monthName = MONTHS_IT[month];
  const lastDay = new Date(year, month + 1, 0).getDate();
  const DAY_SHORT = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  let html = '';

  PLACES.forEach(place => {
    html += `<h3 style="font-size:14px;font-weight:bold;margin:10px 0 4px;color:#1e3a5f">${escapeHtml(place)}</h3>`;
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
        const { display: name, bg: bgColor, textColor } = resolveShiftCell(id);
        const cellStyle = `padding:5px 6px;border:1px solid #ddd${bgColor ? `;background:${bgColor};color:${textColor};font-weight:600` : ''}`;
        html += `<td style="${cellStyle}">${name ? escapeHtml(name) : ''}</td>`;
      });
      html += `</tr>`;
    }
    html += `</tbody></table>`;
  });

  table.innerHTML = html;
}

export async function exportPDF() {
  if (typeof html2canvas === 'undefined') {
    toast('Libreria html2canvas non caricata — impossibile generare PDF', 'error');
    return;
  }
  if (typeof window.jspdf === 'undefined') {
    toast('Libreria jsPDF non caricata — impossibile generare PDF', 'error');
    return;
  }
  buildPdfContent();
  const pdfContentEl = el('pdf-content');
  pdfContentEl.classList.remove('hidden');
  await new Promise(r => setTimeout(r, 100));
  try {
    const canvas = await html2canvas(pdfContentEl, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const maxW = pageW - 2 * margin;
    const maxH = pageH - 2 * margin;
    const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, canvas.width * ratio, canvas.height * ratio);
    pdf.save(`turni-ruap-${MONTHS_IT[state.calMonth].toLowerCase()}-${state.calYear}.pdf`);
    toast('PDF scaricato', 'success');
  } catch (err) {
    toast('Errore PDF: ' + err.message, 'error');
    console.error(err);
  } finally {
    pdfContentEl.classList.add('hidden');
  }
}

// ====================================================
// 10b. EXPORT PNG
// ====================================================

export function buildPngContent() {
  const year = state.calYear;
  const month = state.calMonth;
  const monthName = MONTHS_IT[month];
  const lastDay = new Date(year, month + 1, 0).getDate();
  const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  // --- Calendar section ---
  let calHtml = `
    <div style="margin-bottom:20px;border-bottom:2px solid #1e3a5f;padding-bottom:10px;">
      <h1 style="font-size:22px;font-weight:bold;color:#1e40af;margin:0 0 2px;">Turni RUAP Attività Diurne</h1>
      <p style="font-size:14px;color:#64748b;margin:0;">${monthName} ${year}</p>
    </div>`;

  PLACES.forEach(place => {
    calHtml += `<div style="margin-bottom:18px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="background:#1e40af;color:white;font-size:10px;font-weight:bold;padding:2px 10px;border-radius:4px;letter-spacing:0.5px;">${escapeHtml(place)}</span>
        <span style="font-size:11px;color:#64748b;">Turni mensili</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead><tr style="background:#1e3a5f;color:white;">
          <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;">Data</th>
          <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;">Giorno</th>`;
    SLOTS.forEach(s => {
      calHtml += `<th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;">${s.icon} ${escapeHtml(s.label)}</th>`;
    });
    calHtml += `</tr></thead><tbody>`;

    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(year, month, day);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const dk = toDateKey(d);
      const isHoliday = isItalianHoliday(d);
      const rowBg = isHoliday ? 'background:#fef2f2;' : '';
      calHtml += `<tr style="${rowBg}">
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:600;color:#334155;">${day}/${month + 1}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;color:#475569;">${DAY_SHORT[d.getDay()]}</td>`;
      SLOTS.forEach(slot => {
        const id = state.assignments[`${dk}_${slot.key}_${place}`];
        const { display, bg, textColor } = resolveShiftCell(id);
        if (display) {
          calHtml += `<td style="padding:5px 8px;border:1px solid #e2e8f0;text-align:center;background:${bg};color:${textColor};font-weight:600;border-radius:3px;font-size:10px;">${escapeHtml(display)}</td>`;
        } else if (isHoliday) {
          calHtml += `<td style="padding:5px 8px;border:1px solid #e2e8f0;text-align:center;color:#ef4444;font-size:10px;font-weight:bold;">CHIUSO</td>`;
        } else {
          calHtml += `<td style="padding:5px 8px;border:1px solid #e2e8f0;text-align:center;color:#cbd5e1;font-size:10px;">—</td>`;
        }
      });
      calHtml += `</tr>`;
    }
    calHtml += `</tbody></table></div>`;
  });

  el('png-calendar').innerHTML = calHtml;

  // --- Budget section ---
  const stats = getMonthlyStats();
  const ordered = [...state.doctors].sort((a, b) => (b.isPool ? 1 : 0) - (a.isPool ? 1 : 0));

  const totalUsed = Object.values(stats.doctorHours).reduce((a, b) => a + b, 0);

  let budgetHtml = `
    <div style="margin-top:20px;padding-top:14px;border-top:2px solid #1e40af;">
      <h2 style="font-size:17px;font-weight:bold;color:#1e3a5f;margin:0 0 10px;">📊 Bilancio Mensile</h2>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="background:#1e3a5f;color:white;">
          <th style="padding:7px 10px;border:1px solid #cbd5e1;text-align:left;">Medico</th>
          <th style="padding:7px 10px;border:1px solid #cbd5e1;text-align:center;">Assegnate</th>
          <th style="padding:7px 10px;border:1px solid #cbd5e1;text-align:center;">Budget</th>
          <th style="padding:7px 10px;border:1px solid #cbd5e1;text-align:center;">%</th>
          <th style="padding:7px 10px;border:1px solid #cbd5e1;text-align:left;">Progresso</th>
        </tr></thead><tbody>`;

  ordered.forEach(doc => {
    const budget = getMonthlyBudget(doc);
    const used = stats.doctorHours[doc.id] || 0;
    const rem = Math.max(0, budget - used);
    const pct = budget > 0 ? Math.round((used / budget) * 100) : 0;
    const barColor = rem === 0 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';
    const colorHex = getDoctorColor(doc).hex;
    const label = doc.isPool ? ' (pool)' : '';
    budgetHtml += `<tr>
      <td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:500;color:#1e293b;">
        <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${colorHex};margin-right:6px;vertical-align:middle;"></span>
        ${escapeHtml(doc.name)}${label}
      </td>
      <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:700;color:#334155;">${used}h</td>
      <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;color:#64748b;">${budget}h</td>
      <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:600;color:${barColor};">${pct}%</td>
      <td style="padding:7px 10px;border:1px solid #e2e8f0;">
        <div style="width:120px;height:12px;background:#e2e8f0;border-radius:6px;">
          <div style="width:${Math.min(100, pct)}%;height:12px;background:${barColor};border-radius:6px;"></div>
        </div>
      </td>
    </tr>`;
  });

  budgetHtml += `</tbody></table>`;

  // Coverage summary footer
  budgetHtml += `
    <div style="margin-top:10px;font-size:12px;color:#64748b;display:flex;gap:20px;padding-top:8px;">
      <span><strong style="color:#334155;">Copertura:</strong> ${stats.filledSlots}/${stats.totalSlots} turni · <strong style="color:${stats.coverage === 100 ? '#16a34a' : stats.coverage >= 70 ? '#d97706' : '#dc2626'};">${stats.coverage}%</strong></span>
      <span><strong style="color:#334155;">Ore totali:</strong> ${totalUsed}h</span>
    </div>`;

  budgetHtml += `</div>`; // close border-top wrapper

  el('png-budget').innerHTML = budgetHtml;
}

export async function exportPNG() {
  if (typeof html2canvas === 'undefined') {
    toast('Libreria html2canvas non caricata — impossibile generare PNG', 'error');
    return;
  }
  const container = el('png-content');
  if (!container) return;
  buildPngContent();
  container.classList.remove('hidden');
  await new Promise(r => setTimeout(r, 150));
  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: container.scrollWidth,
      height: container.scrollHeight,
    });
    const link = document.createElement('a');
    link.download = `turni-ruap-${MONTHS_IT[state.calMonth].toLowerCase()}-${state.calYear}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('PNG scaricato', 'success');
  } catch (err) {
    toast('Errore PNG: ' + err.message, 'error');
    console.error(err);
  } finally {
    container.classList.add('hidden');
  }
}

// ====================================================
// 11. MONTHLY STATS
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
          const id = state.assignments[key];
          if (doctorHours[id] !== undefined) doctorHours[id] += slot.hours;
        }
      });
    });
  }
  return { totalSlots, filledSlots, emptySlots: totalSlots - filledSlots, coverage: totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0, doctorHours };
}

export function renderMonthlyStats() {
  const panel = el('monthly-stats-panel');
  const stats = getMonthlyStats();

  const totalEl = el('total-doctors');
  if (hideZeroDocs) {
    const activeCount = state.doctors.filter(d => (stats.doctorHours[d.id] || 0) > 0).length;
    totalEl.innerHTML = `<span class="text-brand-600">${activeCount}</span>/${state.doctors.length}`;
  } else {
    totalEl.textContent = state.doctors.length;
  }
  el('total-hours').textContent = Object.values(stats.doctorHours).reduce((a, b) => a + b, 0);

  const coverageEl = el('coverage-badge');
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
    return `<div class="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-50 rounded px-1 -mx-1 transition-colors" onclick="window.openDoctorModal('${doc.id}')" title="Clicca per modificare ${escapeHtml(doc.name)}">
      <span class="w-3 h-3 rounded-full flex-shrink-0" style="background:${color.hex}"></span>
      <span class="flex-1 truncate text-slate-700">${escapeHtml(cleanDoctorName(doc.name))}${label}</span>
      <span class="text-slate-500 flex-shrink-0">${used}h/${budget}h</span>
      <div class="w-16 h-2.5 bg-slate-200 rounded-full flex-shrink-0">
        <div style="width:${Math.min(100, pct)}%; background:${barColor}" class="h-2.5 rounded-full"></div>
      </div>
    </div>`;
  }).join('');

  const printGrid = el('print-bilancio-grid');
  if (printGrid) {
    const titleEl = el('print-bilancio-title');
    if (titleEl) titleEl.textContent = `${MONTHS_IT[state.calMonth]} ${state.calYear}`;
    printGrid.innerHTML = visible.map(doc => {
      const budget = getMonthlyBudget(doc);
      const used = stats.doctorHours[doc.id] || 0;
      const pct = budget > 0 ? Math.round((used / budget) * 100) : 0;
      const barColor = (budget - used) <= 0 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';
      return `<div class="p-row cursor-pointer hover:bg-slate-50 transition-colors" onclick="window.openDoctorModal('${doc.id}')" title="Clicca per modificare ${escapeHtml(doc.name)}">
        <span class="p-dot" style="background:${getDoctorColor(doc).hex}"></span>
        <span class="p-name">${escapeHtml(doc.name)}${doc.isPool ? ' (pool)' : ''}</span>
        <span class="p-hours">${used}h / ${budget}h</span>
        <div class="p-bar"><div class="p-fill" style="width:${Math.min(100, pct)}%;background:${barColor}"></div></div>
      </div>`;
    }).join('');
  }
}

export function toggleMonthlyStats() {
  const panel = el('monthly-stats-panel');
  const chevron = el('monthly-stats-chevron');
  if (!panel) return;
  const open = panel.classList.toggle('hidden');
  chevron.style.transform = open ? '' : 'rotate(180deg)';
  if (!open) renderMonthlyStats();
}

// ====================================================
// 13. COPIA SETTIMANA
// ====================================================

export function copyWeekFromCurrentView() {
  const weekStart = state.calendarView === 'weekly' ? state.calendarWeekStart : state.sidebarWeekStart;
  copyWeek(weekStart);
}

export function pasteWeekToCurrentView() {
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
  const MS_PER_DAY = 86400 * 1000;
  const offset = Math.round((weekStart - copyWeekSource.weekStart) / (7 * MS_PER_DAY));
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
// WIZARD state (module-scoped, not imported from state.js)
// ====================================================

let wizardStep = 1;
let wPlaces = [];
let wSlots = [{ key: 'mat', label: '08:00–14:00', hours: 6, icon: '🌅' }, { key: 'pom', label: '14:00–20:00', hours: 6, icon: '🌆' }];
let wDoctors = [];

function renderWizardProgressDots() {
  const container = el('wizard-progress-dots');
  if (!container) return;
  let html = '';
  for (let i = 1; i <= WIZARD_TOTAL; i++) {
    const cls = i < wizardStep ? 'dot done' : i === wizardStep ? 'dot active' : 'dot';
    html += `<span class="${cls}"></span>`;
  }
  container.innerHTML = html;
  el('wizard-step-label').textContent = `Passo ${wizardStep} di ${WIZARD_TOTAL}`;
}

function renderWizardStep() {
  renderWizardProgressDots();
  const backBtn = el('wizard-back');
  const nextBtn = el('wizard-next');
  backBtn.classList.toggle('hidden', wizardStep === 1);
  nextBtn.classList.toggle('hidden', wizardStep === 1 || wizardStep === 4);

  const stepFns = [null, renderWizardStep1, renderWizardStep2, renderWizardStep3, renderWizardStep4];
  stepFns[wizardStep]();

  if (wizardStep === 2 || wizardStep === 3) {
    updateWizardNextState();
  }
}

function updateWizardNextState() {
  const nextBtn = el('wizard-next');
  if (!nextBtn) return;
  const valid = (wizardStep === 2 && wPlaces.length >= 1) || (wizardStep === 3 && wSlots.length >= 1);
  nextBtn.disabled = !valid;
}

function finishWizard() {
  state.doctors = [...wDoctors];
  state.assignments = {};
  state.places = [...wPlaces];
  state.slots = wSlots.map(s => ({ ...s }));
  clearHistory();
  el('ruap-wizard').classList.add('hidden');
  saveToStorage();
  pushHistory();
  renderAll();
  updateConflictsHeaderBadge();
  toast('Configurazione completata!', 'success');
}

function renderWizardStep1() {
  el('wizard-step-content').innerHTML = `
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
  el('w-start').addEventListener('click', () => { wizardStep = 2; renderWizardStep(); });
}

function renderWizardStep2() {
  const chipsHtml = wPlaces.map(p => `
    <span class="wizard-chip" style="background:#dbeafe; color:#1e40af">
      ${escapeHtml(p)}
      <button class="chip-remove w-remove-place" data-place="${escapeHtml(p)}">×</button>
    </span>`).join('');

  el('wizard-step-content').innerHTML = `
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

  el('w-place-add').addEventListener('click', () => {
    const input = el('w-place-input');
    const val = input.value.trim();
    if (val && !wPlaces.includes(val)) { wPlaces.push(val); renderWizardStep2(); }
  });
  el('w-place-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') el('w-place-add').click();
  });
  document.querySelectorAll('.w-remove-place').forEach(btn => {
    btn.addEventListener('click', () => { wPlaces = wPlaces.filter(p => p !== btn.dataset.place); renderWizardStep2(); });
  });
  updateWizardNextState();
}

function renderWizardStep3() {
  const chipsHtml = wSlots.map(s => `
    <span class="wizard-chip" style="background:#fef3c7; color:#92400e">
      ${escapeHtml(s.icon)} ${escapeHtml(s.label)} (${s.hours}h)
      <button class="chip-remove w-remove-slot" data-key="${escapeHtml(s.key)}">×</button>
    </span>`).join('');

  el('wizard-step-content').innerHTML = `
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

  el('w-slot-add').addEventListener('click', () => {
    const start = el('w-slot-start').value;
    const end = el('w-slot-end').value;
    if (start && end) {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const hours = eh * 60 + em - (sh * 60 + sm);
      const key = 'slot-' + Date.now();
      wSlots.push({ key, label: `${start}–${end}`, hours: hours / 60, icon: selectedIcon });
      el('w-slot-start').value = '14:00';
      el('w-slot-end').value = '20:00';
      renderWizardStep3();
    }
  });
  document.querySelectorAll('.w-remove-slot').forEach(btn => {
    btn.addEventListener('click', () => { wSlots = wSlots.filter(s => s.key !== btn.dataset.key); renderWizardStep3(); });
  });
  updateWizardNextState();
}

function renderWizardStep4() {
  const placesHtml = wPlaces.map(p => `<li>📍 <strong>${escapeHtml(p)}</strong></li>`).join('');
  const slotsHtml = wSlots.map(s => `<li>${escapeHtml(s.icon)} <strong>${escapeHtml(s.label)}</strong> (${s.hours}h)</li>`).join('');

  el('wizard-step-content').innerHTML = `
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
        ${wPlaces.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('')}
      </select>
    </div>
    <button id="w-doctor-add" class="wizard-big-btn outline w-full mb-3" style="padding:0.75rem; font-size:1rem">+ Aggiungi medico</button>
    <div id="w-doctor-list" class="flex flex-wrap gap-2 mb-4">
      ${wDoctors.map((d, i) => `
        <span class="wizard-chip" style="background:${COLOR_PALETTE[i % COLOR_PALETTE.length].hex}; color:white">
          ${escapeHtml(d.name)}
          <button class="chip-remove w-remove-doctor" data-index="${i}">×</button>
        </span>`).join('')}
      ${wDoctors.length === 0 ? '<span class="text-slate-400 text-sm">Nessun medico aggiunto</span>' : ''}
    </div>
    <button id="w-finish" class="wizard-big-btn success w-full" style="text-align:center; margin-top:1rem; ${wDoctors.length < 1 ? 'opacity:0.4; pointer-events:none' : ''}">
      ✅ Configura e inizia
    </button>`;

  el('w-doctor-add').addEventListener('click', () => {
    const name = el('w-doctor-name').value.trim();
    const patients = parseInt(el('w-doctor-patients').value) || 850;
    const preferredPlace = el('w-doctor-place').value || null;
    if (name) {
      wDoctors.push({
        name: name.startsWith('Dott. ') ? name : 'Dott. ' + name,
        patients,
        weeklyHours: calculateWeeklyHoursByPatients(patients),
        colorIndex: wDoctors.length % COLOR_PALETTE.length,
        preferredPlace,
        availability: Object.fromEntries(DAY_KEYS.map(k => [k, { mat: true, pom: true }])),
        unavailPeriods: []
      });
      el('w-doctor-name').value = '';
      el('w-doctor-patients').value = '';
      renderWizardStep4();
    }
  });
  document.querySelectorAll('.w-remove-doctor').forEach(btn => {
    btn.addEventListener('click', () => { wDoctors.splice(parseInt(btn.dataset.index), 1); renderWizardStep4(); });
  });
  el('w-finish').addEventListener('click', finishWizard);
}

export function startWizard() {
  wizardStep = 1;
  wPlaces = [];
  wSlots = [{ key: 'mat', label: '08:00–14:00', hours: 6, icon: '🌅' }, { key: 'pom', label: '14:00–20:00', hours: 6, icon: '🌆' }];
  wDoctors = [];
  el('ruap-wizard').classList.remove('hidden');
  renderWizardStep();
}

export function restartWizard() {
  if (!confirm('Vuoi ricominciare la configurazione?\n\nTutti i dati verranno cancellati.')) return;
  localStorage.removeItem('ruap-turni-medici');
  localStorage.removeItem('ruap-turni-assegnazioni');
  localStorage.removeItem('ruap-turni-history');
  localStorage.removeItem('ruap-places');
  localStorage.removeItem('ruap-slots');
  localStorage.removeItem('ruap-storage-version');
  state.doctors = [];
  state.assignments = {};
  state.places = [];
  state.slots = [];
  clearHistory();
  el('demo-banner').classList.add('hidden');
  startWizard();
}

export function wizardGoBack() {
  if (wizardStep > 1) { wizardStep--; renderWizardStep(); }
}

export function wizardGoNext() {
  if (wizardStep === 2 && wPlaces.length < 1) return;
  if (wizardStep === 3 && wSlots.length < 1) return;
  if (wizardStep < 4) { wizardStep++; renderWizardStep(); }
}

// ====================================================
// Header subtitle
// ====================================================
export function updateHeaderSubtitle() {
  const elSubtitle = el('header-subtitle');
  if (elSubtitle) elSubtitle.textContent = 'Attività Diurne — ' + PLACES.join(' · ');
}

// ====================================================
// Toggle hide zero docs
// ====================================================
export function toggleHideZeroDocs() {
  hideZeroDocs = !hideZeroDocs;
  const icon = el('btn-hide-zero-docs');
  if (hideZeroDocs) {
    icon.className = 'fa-solid fa-eye-slash text-brand-500 text-[10px] cursor-pointer hover:text-brand-600';
    icon.title = 'Mostra tutti';
  } else {
    icon.className = 'fa-regular fa-eye text-slate-400 text-[10px] cursor-pointer hover:text-brand-600';
    icon.title = 'Nascondi inattivi';
  }
  renderMonthlyStats();
}
