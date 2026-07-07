// ====================================================
// config.js — Constants, color palettes, defaults
// ====================================================

export const STORAGE_DOCTORS = 'ruap-turni-medici';
export const STORAGE_ASSIGNMENTS = 'ruap-turni-assegnazioni';
export const STORAGE_HISTORY = 'ruap-turni-history';
export const STORAGE_VERSION_KEY = 'ruap-storage-version';
export const STORAGE_PLACES = 'ruap-places';
export const STORAGE_SLOTS = 'ruap-slots';
export const STORAGE_DARK_MODE = 'ruap-dark-mode';
export const STORAGE_VERSION = 2;
export const CONFIG_DATA_KEY = 'ruap-config-data-version';
export const HISTORY_MAX = 50;

export const DAY_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
export const DAY_KEYS  = ['lun', 'mar', 'mer', 'gio', 'ven'];

export const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

export const DROPDOWN_HEIGHT = 350;
export const DROPDOWN_WIDTH  = 320;
export const MONTHLY_WEEKS = 4;
export const EXTERNAL_PREFIX = '__ext__::';
export const MS_PER_DAY = 86400 * 1000;
export const EXCEL_EPOCH_OFFSET = 25569;
export const WIZARD_TOTAL = 4;

export const COLOR_PALETTE = [
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
