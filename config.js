// =================================================================
// GLOBAL CONFIGURATION — edit these values to update all pages
// =================================================================

const CONFIG = {
    // Relocation / Holiday banner config
    // 'from' and 'to' should be in YYYY-MM-DD format
    ASSENZE: [
        { 
            from: "2026-03-24", 
            to: "2026-04-27", 
            note: "Trasferimento: Dal 27 Aprile 2026, il dottor Savianu visiterà in Piazza Saione 3." 
        },
    ],
    
    // Clinic hours (used for the badge logic)
    // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
    SCHEDULE: {
        1: [{ from: 16, to: 19 }],  // Mon
        2: [{ from: 10, to: 13 }],  // Tue
        3: [{ from: 16, to: 19 }],  // Wed
        4: [{ from: 10, to: 13 }],  // Thu
        5: [{ from: 16, to: 19 }],  // Fri
    }
};

CONFIG.getActiveAbsence = function() {
    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return CONFIG.ASSENZE.find(function(a) {
        const partsFrom = a.from.split('-').map(Number);
        const partsTo = a.to.split('-').map(Number);
        const fromUTC = Date.UTC(partsFrom[0], partsFrom[1] - 1, partsFrom[2]);
        const toUTC = Date.UTC(partsTo[0], partsTo[1] - 1, partsTo[2], 23, 59, 59, 999);
        return todayUTC >= fromUTC && todayUTC <= toUTC;
    }) || null;
};
