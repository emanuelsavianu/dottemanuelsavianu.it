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

  // ─── PRE-FILLED DEMO ASSIGNMENTS ──────────────────────────────
  // Key format: 'YYYY-MM-DD_slotKey_place'
  // slotKey: 'mat' (08:00-14:00) or 'pom' (14:00-20:00)
  // Doctors are matched by index: 0=Savianu, 1=Cerofolini, 2=Bensi, 3=Gavetta
  // Pre-fills ~70% of April 2026 weekdays (~22 out of 30 workdays)
  demoAssignments: {
    // Week 1: Apr 7-11
    '2026-04-07_mat_M.S.Savino': 0, '2026-04-07_pom_M.S.Savino': 1,
    '2026-04-07_mat_Subbiano': 2,   '2026-04-07_pom_Subbiano': 3,
    '2026-04-08_mat_M.S.Savino': 1, '2026-04-08_mat_Subbiano': 3,
    '2026-04-09_mat_M.S.Savino': 0, '2026-04-09_pom_Subbiano': 2,
    '2026-04-10_pom_M.S.Savino': 1, '2026-04-10_mat_Subbiano': 3,
    '2026-04-11_mat_M.S.Savino': 0, '2026-04-11_pom_Subbiano': 2,
    // Week 2: Apr 14-17 (Cerofolini ferie suggested Apr 14-18)
    '2026-04-14_mat_M.S.Savino': 0, '2026-04-14_mat_Subbiano': 2,
    '2026-04-14_pom_Subbiano': 3,
    '2026-04-15_pom_M.S.Savino': 0, '2026-04-15_mat_Subbiano': 3,
    '2026-04-16_mat_M.S.Savino': 0, '2026-04-16_pom_Subbiano': 2,
    '2026-04-17_pom_M.S.Savino': 0, '2026-04-17_mat_Subbiano': 3,
    // Week 3: Apr 22-25
    '2026-04-22_mat_M.S.Savino': 0, '2026-04-22_pom_M.S.Savino': 1,
    '2026-04-22_mat_Subbiano': 2,   '2026-04-22_pom_Subbiano': 3,
    '2026-04-23_mat_M.S.Savino': 1, '2026-04-23_mat_Subbiano': 2,
    '2026-04-24_pom_M.S.Savino': 0, '2026-04-24_pom_Subbiano': 3,
    '2026-04-25_mat_M.S.Savino': 1, '2026-04-25_mat_Subbiano': 2,
    // Week 4: Apr 28-30
    '2026-04-28_mat_M.S.Savino': 0, '2026-04-28_pom_Subbiano': 3,
    '2026-04-29_mat_Subbiano': 2,   '2026-04-29_pom_M.S.Savino': 1,
    '2026-04-30_mat_M.S.Savino': 0, '2026-04-30_pom_Subbiano': 2,
  },
};
