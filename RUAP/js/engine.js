// ====================================================
// engine.js — Shift distribution algorithm
// ====================================================

import { state, PLACES, SLOTS, isProcessing, setProcessing, pushHistory, saveToStorage } from './state.js';
import { isItalianHoliday } from './holidays.js';
import { MONTHS_IT } from './config.js';
import {
  toDateKey, isDoctorAvailableForSlot, getMonthlyBudget,
  getAssignedHoursInMonth, el, toast
} from './core-utils.js';
import { renderAll, renderMonthlyStats, updateConflictsHeaderBadge } from './renderers.js';

// ====================================================
// 10. AUTO-ASSIGN & GENERATION
// ====================================================

export function enumerateEmptySlots(year, month) {
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

function pickDoctorForSlot(primaryDocs, poolDocs, place, dateKey, slotKeyOnly, assignedInTarget, getEffectiveRemaining) {
  const notBusy = (doc) => {
    const prefix = `${dateKey}_${slotKeyOnly}_`;
    return !Object.entries(state.assignments).some(([k, v]) => v === doc.id && k.startsWith(prefix));
  };

  // Prevent mat (08-14) after pom (14-20) on the previous calendar day
  const hasConsecutiveShiftConflict = (doc) => {
    if (slotKeyOnly !== 'mat') return false;
    const parts = dateKey.split('-');
    const prevDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateKey = toDateKey(prevDate);
    return Object.entries(state.assignments).some(([k, v]) =>
      v === doc.id && k.startsWith(prevDateKey + '_pom_')
    );
  };

  const filterAvailable = (docs) => docs.filter(doc =>
    isDoctorAvailableForSlot(doc, dateKey, slotKeyOnly)
    && notBusy(doc)
    && !hasConsecutiveShiftConflict(doc)
    && getEffectiveRemaining(doc) > 0
  );

  const availablePrimary = filterAvailable(primaryDocs);
  const availablePool = filterAvailable(poolDocs);

  // 2-tier allocation: flexible (prefer this place OR no preference) first, cross-site second
  const priorityGroups = [
    availablePrimary.filter(d => d.preferredPlace === place || !d.preferredPlace),
    availablePrimary.filter(d => d.preferredPlace && d.preferredPlace !== place),
    availablePool.filter(d => d.preferredPlace === place || !d.preferredPlace),
    availablePool.filter(d => d.preferredPlace && d.preferredPlace !== place),
  ];

  for (const group of priorityGroups) {
    if (group.length > 0) {
      group.sort((a, b) => (assignedInTarget[a.id] || 0) - (assignedInTarget[b.id] || 0));
      return group[0];
    }
  }
  return null;
}

export function runAutoAssignForMonth(year, month) {
  if (isProcessing) return;
  if (state.doctors.length === 0) {
    toast('Aggiungi prima dei medici', 'warning');
    return;
  }

  setProcessing(true);
  pushHistory();
  const monthName = MONTHS_IT[month];
  const slotsToProcess = enumerateEmptySlots(year, month);

  if (slotsToProcess.length === 0) {
    setProcessing(false);
    toast(`Nessun turno vuoto in ${monthName}`, 'info');
    return;
  }

  const assignedInTarget = {};
  state.doctors.forEach(d => { assignedInTarget[d.id] = getAssignedHoursInMonth(d.id, month, year, SLOTS, PLACES, state.assignments); });
  function getEffectiveRemaining(doc) {
    return Math.max(0, getMonthlyBudget(doc) - (assignedInTarget[doc.id] || 0));
  }

  const primaryDocs = state.doctors.filter(d => !d.isPool);
  const poolDocs = state.doctors.filter(d => d.isPool);

  const progressBar = el('autoassign-progress-bar');
  const progressLabel = el('autoassign-progress-label');
  const loadingEl = el('autoassign-loading');
  const loadingText = el('autoassign-loading-text');
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

      const chosen = pickDoctorForSlot(primaryDocs, poolDocs, place, dateKey, slotKeyOnly, assignedInTarget, getEffectiveRemaining);
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
      setProcessing(false);
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

export function autoAssign() {
  runAutoAssignForMonth(state.calYear, state.calMonth);
}

export function generateNextMonth() {
  const nextMonth = state.calMonth + 1;
  const year = nextMonth > 11 ? state.calYear + 1 : state.calYear;
  runAutoAssignForMonth(year, nextMonth % 12);
}
