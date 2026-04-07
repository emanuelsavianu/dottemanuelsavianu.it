// config.js — Edit this file to change doctors, sedi, shifts.
// This file is loaded before app.js and seeds the app on first run.

const CONFIG = {
  // ─── SEDI (ambulatori) ───────────────────────────────────────
  places: ['M.S.Savino', 'Subbiano'],

  // ─── TURNI ──────────────────────────────────────────────────
  slots: [
    { key: 'mat', label: '08:00–14:00', hours: 6, icon: '🌅' },
    { key: 'pom', label: '14:00–20:00', hours: 6, icon: '🌆' },
  ],

  // ─── MEDICI ─────────────────────────────────────────────────
  // preferredPlace: nome della sede preferita (deve corrispondere esattamente a uno dei places sopra)
  // patients: numero assistiti (determina weeklyHours: ≤400→38h, ≤1000→24h, ≤1200→12h)
  // colorIndex: 0=Blu, 1=Verde, 2=Viola, 3=Rosa, 4=Ambra, 5=Teal, 6=Arancio, 7=Ciano
  doctors: [
    {
      name: 'Dott. Savianu',
      patients: 850,
      colorIndex: 0,
      preferredPlace: 'M.S.Savino',
    },
    {
      name: 'Dott. Cerofolini',
      patients: 850,
      colorIndex: 1,
      preferredPlace: 'M.S.Savino',
    },
    {
      name: 'Dott. Bensi',
      patients: 850,
      colorIndex: 2,
      preferredPlace: 'Subbiano',
    },
    {
      name: 'Dott. Gavetta',
      patients: 850,
      colorIndex: 3,
      preferredPlace: 'Subbiano',
    },
  ],
};
