// ====================================================
// core-utils.js — Pure helper functions (no state dep)
// ====================================================

import {
  EXCEL_EPOCH_OFFSET, MS_PER_DAY, DAY_KEYS, DAY_NAMES,
  COLOR_PALETTE, MONTHLY_WEEKS
} from './config.js';
import { isItalianHoliday } from './holidays.js';

// --- ID & Text ---

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function cleanDoctorName(name) {
  return name.replace(/^Dott\.\s*/i, '');
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- Date helpers ---

export function excelDateToDate(excelDate) {
  if (typeof excelDate === 'number') {
    const utcDays = excelDate - EXCEL_EPOCH_OFFSET;
    return new Date(utcDays * MS_PER_DAY);
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

export function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateShort(date) {
  return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
}

// --- Business logic helpers (pure, no direct state dependency) ---

export function calculateWeeklyHoursByPatients(patients) {
  if (patients === undefined || patients === null || patients < 0) return 38;
  if (patients <= 400) return 38;
  if (patients <= 1000) return 24;
  if (patients <= 1200) return 12;
  if (patients <= 1500) return 6;
  return 0;
}

export function getDoctorColor(doctor) {
  return COLOR_PALETTE[doctor.colorIndex ?? 0] || COLOR_PALETTE[0];
}

export function getMonthlyBudget(doctor) {
  if (doctor.monthlyBudget != null) return doctor.monthlyBudget;
  return (doctor.weeklyHours ?? 38) * MONTHLY_WEEKS;
}

export function getProgressBarData(assigned, debt) {
  const pct = debt > 0 ? Math.min(100, Math.round((assigned / debt) * 100)) : 0;
  const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';
  return { pct, barColor };
}

// --- DOM helpers ---

export function el(id) { return document.getElementById(id); }

export function toast(message, type = 'info', duration = 3000) {
  const container = el('toast-container');
  if (!container) return;
  const colors = { info: 'bg-slate-800', success: 'bg-green-600', warning: 'bg-amber-500', error: 'bg-red-500' };
  const toastEl = document.createElement('div');
  toastEl.className = `toast-item ${colors[type] || colors.info} text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all duration-300`;
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
  toastEl.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toastEl);
  requestAnimationFrame(() => { toastEl.style.opacity = '1'; toastEl.style.transform = 'translateY(0)'; });
  setTimeout(() => {
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateY(-10px)';
    setTimeout(() => toastEl.remove(), 300);
  }, duration);
}

// --- Domain queries that need state (passed as param) ---

export function getDoctorById(doctors, id) {
  return doctors.find(d => d.id === id);
}

export function isDoctorUnavailable(doctor, dateKey) {
  if (!doctor.unavailPeriods || doctor.unavailPeriods.length === 0) return false;
  const d = new Date(dateKey + 'T00:00:00');
  return doctor.unavailPeriods.some(p => {
    const from = new Date(p.from + 'T00:00:00');
    const to = new Date(p.to + 'T00:00:00');
    return d >= from && d <= to;
  });
}

export function isDoctorAvailableForSlot(doctor, dateKey, slotKey) {
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

export function sumSlotHours(SLOTS, PLACES, assignments, predicate) {
  let hours = 0;
  SLOTS.forEach(slot => {
    PLACES.forEach(place => {
      if (predicate(slot, place)) hours += slot.hours;
    });
  });
  return hours;
}

export function getWeeklyAssignedHours(doctorId, weekStart, SLOTS, PLACES, assignments) {
  let hours = 0;
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dk = toDateKey(d);
    hours += sumSlotHours(SLOTS, PLACES, assignments, (slot, place) =>
      assignments[`${dk}_${slot.key}_${place}`] === doctorId
    );
  }
  return hours;
}

export function getAssignedHoursInMonth(docId, month, year, SLOTS, PLACES, assignments) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  let hours = 0;
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dk = toDateKey(d);
    hours += sumSlotHours(SLOTS, PLACES, assignments, (slot, place) =>
      assignments[`${dk}_${slot.key}_${place}`] === docId
    );
  }
  return hours;
}

export function getRemainingMonthlyHours(doctor, month, year, SLOTS, PLACES, assignments) {
  return Math.max(0, getMonthlyBudget(doctor) - getAssignedHoursInMonth(doctor.id, month, year, SLOTS, PLACES, assignments));
}

export function getDefaultDoctors() {
  if (typeof CONFIG === 'undefined' || !CONFIG.doctors) return [];
  return CONFIG.doctors.map(d => ({
    ...d,
    availability: d.availability ? JSON.parse(JSON.stringify(d.availability)) : Object.fromEntries(
      DAY_KEYS.map(k => [k, { mat: true, pom: true }])
    ),
    unavailPeriods: d.unavailPeriods ? JSON.parse(JSON.stringify(d.unavailPeriods)) : [],
  }));
}

export function matchDoctorBySurname(doctors, excelName) {
  if (!excelName) return null;
  const cleanExcel = excelName.replace('Dott. ', '').trim().toLowerCase();
  let found = doctors.find(d => cleanDoctorName(d.name).toLowerCase() === cleanExcel);
  if (found) return found;
  const excelLast = cleanExcel.split(' ').slice(-1)[0];
  return doctors.find(d => {
    const docLast = cleanDoctorName(d.name).split(' ').slice(-1)[0].toLowerCase();
    return docLast === excelLast;
  });
}
