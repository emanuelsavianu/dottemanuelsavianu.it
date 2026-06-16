const CONFIG = {
  places: ['M.S.Savino', 'Subbiano'],

  slots: [
    { key: 'mat', label: '08:00–14:00', hours: 6, icon: '🌅' },
    { key: 'pom', label: '14:00–20:00', hours: 6, icon: '🌆' },
  ],

  // Medici con debito orario: patients ~850 → 24h/settimana → 96h/mese
  // Medici in disponibilità aggiuntiva: monthlyBudget: 24, isPool: true
  // colorIndex: 0-15 mappa su COLOR_PALETTE (app.js)
  doctors: [
    // ── Primari ──
    { name: 'Dott. Savianu',    patients: 850, colorIndex: 0,  preferredPlace: 'M.S.Savino' },
    { name: 'Dott. Fiori',      patients: 850, colorIndex: 1,  preferredPlace: 'Subbiano' },
    { name: 'Dott. Cerofolini', patients: 850, colorIndex: 2,  preferredPlace: 'M.S.Savino' },
    { name: 'Dott. Gavetta',    patients: 850, colorIndex: 3,  preferredPlace: 'Subbiano' },
    { name: 'Dott. Sodo',       patients: 850, colorIndex: 4,  preferredPlace: 'Subbiano' },
    { name: 'Dott. Bensi',      patients: 850, colorIndex: 5,  preferredPlace: 'Subbiano' },
    { name: 'Dott. Gabrielli',  patients: 850, colorIndex: 6,  preferredPlace: 'M.S.Savino' },
    { name: 'Dott. Graziotti',  patients: 850, colorIndex: 7,  preferredPlace: 'M.S.Savino' },
    { name: 'Dott. Miroballo',  patients: 850, colorIndex: 8,  preferredPlace: 'M.S.Savino' },
    { name: 'Dott. Zuppardo',   patients: 850, colorIndex: 9,  preferredPlace: 'Subbiano' },
  ],

  demoAssignments: {},
};
