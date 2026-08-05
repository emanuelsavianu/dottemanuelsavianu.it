// ====================================================
// events.js — Event listener setup, hotkeys, init
// ====================================================

import {
  state, SLOTS,
  saveToStorage, loadFromStorage, pushHistory, loadHistory, clearHistory,
  reloadPlaces, reloadSlots,
  initDarkMode, toggleDarkMode, undo, redo,
  updateUndoRedoButtons
} from './state.js';

import {
  el, toast, getDefaultDoctors, toDateKey, getWeekStart,
  calculateWeeklyHoursByPatients
} from './core-utils.js';

import {
  updateGeneraButtonLabel, renderAll, renderCalendar,
  renderMonthlyStats, renderSidebar,
  updateConflictsHeaderBadge, updateHeaderSubtitle,
  toggleCalendarView, setSearchQuery, setFilterAFT,
  closeAssignDropdown, closeDoctorModal, closeConflictModal,
  closeConflictsModal, closeInstructions,
  openDoctorModal, deleteDoctor, resetAssignments,
  saveDoctorFromModal, addUnavailPeriodRow,
  openAssignDropdown, assignDoctor, removeAssignment,
  openConflictsModal, autoResolveAllConflicts,
  exportJSON, importJSONFromFile, importExcelFromFile,
  exportExcel, exportPDF, exportPNG,
  copyWeekFromCurrentView, pasteWeekToCurrentView,
  toggleMonthlyStats, toggleHideZeroDocs,
  startWizard, restartWizard, wizardGoBack, wizardGoNext,
  unavailCalNav, unavailCalToday
} from './renderers.js';

import { autoAssign, generateNextMonth } from './engine.js';
import {
  STORAGE_DOCTORS, STORAGE_ASSIGNMENTS, STORAGE_HISTORY,
  STORAGE_PLACES, STORAGE_SLOTS, STORAGE_VERSION, STORAGE_VERSION_KEY,
  CONFIG_DATA_KEY,
  EXTERNAL_PREFIX
} from './config.js';

// ====================================================
// 15. KEYBOARD SHORTCUTS
// ====================================================
document.addEventListener('keydown', (e) => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); redo(); }
  if (e.key === 'ArrowLeft' && mod) { e.preventDefault(); state.calMonth--; if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; } renderAll(); }
  if (e.key === 'ArrowRight' && mod) { e.preventDefault(); state.calMonth++; if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; } renderAll(); }
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
// 17. WIZARD NAV LISTENERS
// ====================================================
el('wizard-back')?.addEventListener('click', wizardGoBack);
el('wizard-next')?.addEventListener('click', wizardGoNext);

// ====================================================
// 18. TOP-LEVEL EVENT LISTENERS
// ====================================================

// --- Export ---
el('btn-export')?.addEventListener('click', exportJSON);
el('btn-export-excel')?.addEventListener('click', exportExcel);

// --- Import file triggers ---
el('import-file')?.addEventListener('change', importJSONFromFile);
el('import-excel-file')?.addEventListener('change', importExcelFromFile);

// --- Assign dropdown ---
el('assign-remove')?.addEventListener('click', () => {
  if (state.activeSlotKey) removeAssignment(state.activeSlotKey);
});
document.addEventListener('click', (e) => {
  const dropdown = el('assign-dropdown');
  if (dropdown && !dropdown.contains(e.target)) closeAssignDropdown();
});
el('assign-close')?.addEventListener('click', closeAssignDropdown);
el('assign-exception-btn')?.addEventListener('click', () => {
  el('assign-unavail-section')?.classList.toggle('hidden');
});
el('assign-custom-add')?.addEventListener('click', () => {
  const input = el('assign-custom-input');
  const name = input?.value.trim();
  if (!name || !state.activeSlotKey) return;
  assignDoctor(state.activeSlotKey, EXTERNAL_PREFIX + name);
});
el('assign-custom-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') el('assign-custom-add')?.click();
});

// --- Doctor modal ---
el('modal-close')?.addEventListener('click', closeDoctorModal);
el('modal-cancel')?.addEventListener('click', closeDoctorModal);
el('modal-save')?.addEventListener('click', saveDoctorFromModal);
el('modal-patients')?.addEventListener('input', (e) => {
  const patients = parseInt(e.target.value) || 0;
  const hours = calculateWeeklyHoursByPatients(patients);
  el('modal-hours').value = hours;
});
el('btn-add-period')?.addEventListener('click', () => { addUnavailPeriodRow('', ''); });
el('unavail-cal-prev')?.addEventListener('click', () => unavailCalNav(-1));
el('unavail-cal-next')?.addEventListener('click', () => unavailCalNav(1));
el('btn-unavail-today')?.addEventListener('click', unavailCalToday);

// --- Color swatch selection ---
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('color-swatch')) {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('border-slate-800'));
    e.target.classList.add('border-slate-800');
  }
});

// --- Header and toolbar buttons ---
el('btn-add-doctor')?.addEventListener('click', () => openDoctorModal());
el('btn-auto-assign')?.addEventListener('click', autoAssign);
el('btn-genera-mese')?.addEventListener('click', generateNextMonth);
el('btn-pdf')?.addEventListener('click', exportPDF);
el('btn-export-png')?.addEventListener('click', exportPNG);
el('btn-darkmode')?.addEventListener('click', toggleDarkMode);
el('btn-instructions')?.addEventListener('click', () => {
  el('instructions-modal')?.classList.remove('hidden');
});
el('instructions-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'instructions-modal') e.target.classList.add('hidden');
});
el('close-instructions')?.addEventListener('click', closeInstructions);
el('close-instructions-bottom')?.addEventListener('click', closeInstructions);
el('btn-reset-assignments')?.addEventListener('click', resetAssignments);
el('btn-conflicts')?.addEventListener('click', openConflictsModal);
el('conflicts-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'conflicts-modal') closeConflictsModal();
});
el('btn-restart-wizard')?.addEventListener('click', restartWizard);
el('btn-undo')?.addEventListener('click', undo);
el('btn-redo')?.addEventListener('click', redo);
el('btn-oggi')?.addEventListener('click', () => {
  const now = new Date();
  state.calYear = now.getFullYear();
  state.calMonth = now.getMonth();
  state.sidebarWeekStart = getWeekStart(now);
  state.calendarWeekStart = getWeekStart(now);
  if (state.calendarView === 'weekly') toggleCalendarView();
  renderAll();
  toast('Tornato a oggi', 'info');
});

// --- Delegated click handler on cal-grid (fallback per slot-btn) ---
el('cal-grid')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-slot-key]');
  if (!btn) return;
  const slotKey = btn.dataset.slotKey;
  const dateKey = btn.dataset.dateKey;
  const place = btn.dataset.place;
  const slotType = btn.dataset.slotType;
  if (!slotKey || !dateKey || !place || !slotType) return;
  const slot = SLOTS.find(s => s.key === slotType);
  if (!slot) return;
  openAssignDropdown(e, slotKey, slot, dateKey, place, btn.getBoundingClientRect());
});

// --- Calendar navigation ---
el('cal-prev')?.addEventListener('click', () => {
  if (state.calendarView === 'weekly') {
    state.calendarWeekStart.setDate(state.calendarWeekStart.getDate() - 7);
    state.sidebarWeekStart = new Date(state.calendarWeekStart);
  } else {
    state.calMonth--;
    if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
  }
  renderAll();
});
el('cal-next')?.addEventListener('click', () => {
  if (state.calendarView === 'weekly') {
    state.calendarWeekStart.setDate(state.calendarWeekStart.getDate() + 7);
    state.sidebarWeekStart = new Date(state.calendarWeekStart);
  } else {
    state.calMonth++;
    if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
  }
  renderAll();
});
el('sidebar-week-prev')?.addEventListener('click', () => {
  state.sidebarWeekStart.setDate(state.sidebarWeekStart.getDate() - 7);
  state.calendarWeekStart = new Date(state.sidebarWeekStart);
  renderSidebar();
  if (state.calendarView === 'weekly') renderCalendar();
});
el('sidebar-week-next')?.addEventListener('click', () => {
  state.sidebarWeekStart.setDate(state.sidebarWeekStart.getDate() + 7);
  state.calendarWeekStart = new Date(state.sidebarWeekStart);
  renderSidebar();
  if (state.calendarView === 'weekly') renderCalendar();
});

// Search and filter
el('doctor-search')?.addEventListener('input', (e) => {
  setSearchQuery(e.target.value);
  renderSidebar();
});
el('filter-aft')?.addEventListener('change', (e) => {
  setFilterAFT(e.target.value);
  renderSidebar();
});

// ====================================================
// Expose critical functions globally for inline onclick
// ====================================================
window.openDoctorModal = openDoctorModal;
window.closeConflictModal = closeConflictModal;
window.closeConflictsModal = closeConflictsModal;
window.autoResolveAllConflicts = autoResolveAllConflicts;
window.copyWeekFromCurrentView = copyWeekFromCurrentView;
window.pasteWeekToCurrentView = pasteWeekToCurrentView;
window.toggleMonthlyStats = toggleMonthlyStats;
window.toggleCalendarView = toggleCalendarView;
window.toggleHideZeroDocs = toggleHideZeroDocs;

// ====================================================
// Update banner — shown when config.js data changes
// ====================================================

function acceptConfigUpdate(version) {
  state.doctors = getDefaultDoctors();
  if (typeof CONFIG !== 'undefined' && CONFIG.places) state.places = [...CONFIG.places];
  if (typeof CONFIG !== 'undefined' && CONFIG.slots) state.slots = CONFIG.slots.map(s => ({...s}));
  if (typeof CONFIG !== 'undefined' && CONFIG.assignments) {
    state.assignments = {};
    Object.entries(CONFIG.assignments).forEach(([key, docId]) => {
      if (state.doctors.some(d => d.id === docId)) state.assignments[key] = docId;
    });
  }
  saveToStorage();
  clearHistory();
  if (version) localStorage.setItem(CONFIG_DATA_KEY, version);
  el('update-banner')?.classList.add('hidden');
  window.location.reload();
}

function dismissConfigUpdate(version) {
  if (version) localStorage.setItem(CONFIG_DATA_KEY, version);
  el('update-banner')?.classList.add('hidden');
}

/**
 * @param {string} version — the CONFIG.configDataVersion that triggered the banner
 */
function showUpdateBanner(version) {
  const banner = el('update-banner');
  if (!banner) return;
  banner.classList.remove('hidden');
  // Attach one-time handlers (re-attach on each show to avoid stale closures)
  el('update-banner-accept').onclick = () => acceptConfigUpdate(version);
  el('update-banner-keep').onclick = () => dismissConfigUpdate(version);
  el('update-banner-close').onclick = () => el('update-banner')?.classList.add('hidden');
}

// ====================================================
// 19. INIT
// ====================================================
function init() {
  initDarkMode();

  // Schema version check — clearing on mismatch ensures compatibility
  const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
  const isVersionMismatch = storedVersion !== String(STORAGE_VERSION);
  if (isVersionMismatch) {
    localStorage.removeItem(STORAGE_DOCTORS);
    localStorage.removeItem(STORAGE_ASSIGNMENTS);
    localStorage.removeItem(STORAGE_HISTORY);
    localStorage.removeItem(CONFIG_DATA_KEY);
    localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
  }

  // Config data version check — detects changes to config.js content
  const configDataVersion = (typeof CONFIG !== 'undefined' && CONFIG.configDataVersion) || '';
  const seenConfigVersion = localStorage.getItem(CONFIG_DATA_KEY) || '';
  const hasConfigUpdate = configDataVersion && configDataVersion !== seenConfigVersion;

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
    if (configDataVersion) localStorage.setItem(CONFIG_DATA_KEY, configDataVersion);
    el('demo-banner')?.classList.remove('hidden');
  } else if (hasConfigUpdate) {
    showUpdateBanner(configDataVersion);
    pushHistory();
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
