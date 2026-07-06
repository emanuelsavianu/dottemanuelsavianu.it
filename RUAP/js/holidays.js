// ====================================================
// holidays.js — Italian calendar calculations
// ====================================================

/**
 * Compute Easter date using the computus algorithm.
 * @param {number} year
 * @returns {Date}
 */
export function getEasterDate(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Easter Monday (Pasquetta).
 * @param {number} year
 * @returns {Date}
 */
export function getEasterMondayDate(year) {
  const easter = getEasterDate(year);
  return new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 1);
}

/**
 * Check if a date is an official Italian public holiday.
 * @param {Date} date
 * @returns {boolean}
 */
export function isItalianHoliday(date) {
  const d = date.getDate(), m = date.getMonth(), y = date.getFullYear();
  if (m === 0 && d === 1) return true;   // Capodanno
  if (m === 0 && d === 6) return true;   // Epifania
  if (m === 3 && d === 25) return true;  // Liberazione
  if (m === 4 && d === 1) return true;   // Festa del Lavoro
  if (m === 5 && d === 2) return true;   // Festa della Repubblica
  if (m === 5 && d === 24) return true;  // San Giovanni (Firenze patrono)
  if (m === 7 && d === 15) return true;  // Ferragosto
  if (m === 10 && d === 1) return true;  // Ognissanti
  if (m === 11 && d === 8) return true;  // Immacolata
  if (m === 11 && d === 25) return true; // Natale
  if (m === 11 && d === 26) return true; // Santo Stefano
  const easter = getEasterDate(y);
  const easterMon = getEasterMondayDate(y);
  if (date.getTime() === easter.getTime()) return true;
  if (date.getTime() === easterMon.getTime()) return true;
  return false;
}
