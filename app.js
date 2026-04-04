// =================================================================
// STUDIO MEDICO DOTT. SAVIANU - JAVASCRIPT
// =================================================================

// --- AUTOMATIC YEAR ---
const yearEl = document.getElementById('current-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// --- DARK MODE TOGGLE ---
function toggleDarkMode() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-mode');
    const darkBtn = document.getElementById('btn-dark');
    
    if (darkBtn) {
        const icon = darkBtn.querySelector('i');
        if (icon) {
            if (isDark) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }
    }
    
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
        themeMeta.setAttribute('content', isDark ? '#0a1628' : '#1a2f4c');
    }
    
    try {
        localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    } catch (e) {
        console.log('LocalStorage not available');
    }
}

function initDarkMode() {
    try {
        const saved = localStorage.getItem('darkMode');
        const prefersD = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const shouldBeDark = saved === 'enabled' || (saved === null && prefersD);

        if (shouldBeDark) {
            document.body.classList.add('dark-mode');
            const darkBtn = document.getElementById('btn-dark');
            if (darkBtn) {
                const icon = darkBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                }
            }
            const themeMeta = document.querySelector('meta[name="theme-color"]');
            if (themeMeta) themeMeta.setAttribute('content', '#0a1628');
        }

        // React to OS-level changes at runtime
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (localStorage.getItem('darkMode') === null) {
                if (e.matches) {
                    document.body.classList.add('dark-mode');
                    const icon = document.querySelector('#btn-dark i');
                    if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
                    const m = document.querySelector('meta[name="theme-color"]');
                    if (m) m.setAttribute('content', '#0a1628');
                } else {
                    document.body.classList.remove('dark-mode');
                    const icon = document.querySelector('#btn-dark i');
                    if (icon) { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
                    const m = document.querySelector('meta[name="theme-color"]');
                    if (m) m.setAttribute('content', '#1a2f4c');
                }
            }
        });
    } catch (e) {}
}

initDarkMode();


// --- LARGE TEXT ACCESSIBILITY MODE ---
function updateLargeTextBanner(isActive) {
    var banner = document.getElementById('large-text-banner');
    var label  = document.getElementById('large-text-banner-label');
    var btn    = document.getElementById('large-text-toggle-btn');
    if (!banner || !label || !btn) return;
    if (isActive) {
        banner.classList.add('active');
        banner.classList.remove('hidden');
        label.textContent = '✓ Testo grande attivo';
        btn.textContent   = 'A− Normale';
    } else {
        banner.classList.remove('active');
        label.textContent = '🔤 Difficoltà a leggere?';
        btn.textContent   = 'A+ Testo Grande';
    }
}

function toggleLargeText() {
    var isActive = document.body.classList.toggle('large-text');
    try { localStorage.setItem('largeText', isActive ? 'enabled' : 'disabled'); } catch(e) {}
    updateLargeTextBanner(isActive);
}

function initLargeText() {
    try {
        if (localStorage.getItem('largeText') === 'enabled') {
            document.body.classList.add('large-text');
            updateLargeTextBanner(true);
        }
    } catch(e) {}
    // Hide banner on first scroll only if large text is NOT active
    window.addEventListener('scroll', function() {
        if (!document.body.classList.contains('large-text')) {
            var banner = document.getElementById('large-text-banner');
            if (banner) banner.classList.add('hidden');
        }
    }, { once: true });
}

initLargeText();


// --- LANGUAGE MANAGEMENT ---
const translations = {
    it: {
        // Mobile banner
        mobile_app_banner: "Apri la versione App",

        // Header
        header_subtitle: "Medico di Medicina Generale - Arezzo",

        // Alert box (index.html)
        alert_notice: "<i class='fas fa-info-circle' aria-hidden='true' style='margin-right: 8px;'></i><strong>Trasferimento:</strong> Dal 27 Aprile 2026, il dottor Savianu visiterà in <strong>Piazza Saione 3</strong>.",

        // Services section
        services_title: "Servizi Online",
        btn_faq_main: "Hai dubbi? Leggi prima le FAQ",
        btn_book: "Prenota una visita",
        btn_book_sub: "Scegli giorno e orario",
        millebook_btn: "Richiedi farmaci o ricette",
        millebook_sub: "Accedi a Millebook — il canale preferenziale",

        // Booking section
        booking_title: "Seleziona il tipo di visita",
        booking_guide_title: "Come prenotare:",
        booking_guide_steps: "<li>Clicca il pulsante del tipo di visita qui sotto.</li><li>Scegli il giorno e l'orario disponibile sul calendario.</li><li>Inserisci Nome, Cognome e un indirizzo Email.</li><li>Clicca <strong>Conferma</strong> (riceverai un'email di riepilogo).</li>",
        cal_prima_title: "Prima Visita (Nuovi Pazienti)",
        cal_prima_desc: "Solo per la prima visita. Portare documentazione, esami, referti ed esenzioni. (30 min)",
        cal_ord_title: "Visita Ordinaria",
        cal_ord_desc: "Controlli e problemi non urgenti. (20 min)",
        cal_breve_title: "Sintomi Recenti",
        cal_breve_desc: "Visite non rimandabili, malattie acute, certificati INPS malattia. (10 min)",
        privacy_notice_text: "Leggi l'informativa privacy.",
        privacy_notice_link: "Informativa Trattamento Dati",

        // Visit info section
        visit_info_title: "Cosa portare alla visita &amp; Link Utili",
        visit_info_desc: "Per la visita in ambulatorio, ricordarsi di portare:",
        visit_info_items: "<li>Lista aggiornata e dettagliata dei farmaci assunti regolarmente</li><li>Eventuali esami, referti specialistici o lettere di dimissioni precedenti</li>",
        btn_cup: "Accedi al CUP Toscana",
        btn_fse: "Fascicolo Sanitario",

        // Emergency & out-of-hours
        emergency_112: "Per urgenze ed emergenze mediche, contattare sempre il Numero Unico 112.",
        guard_title: "Continuità Assistenziale (ex-Guardia Medica)",
        guard_desc: "Per assistenza medica non urgente durante la notte, i festivi e prefestivi.",

        // Contacts
        contacts_title: "Contatti Studio",
        label_secretary: "Segreteria e Appuntamenti",
        label_doctor: "Tel. Personale (Solo Urgenze)",
        label_address: "Studio Medico Ippocrate",
        label_email: "Email",

        // Hours
        hours_title: "Orari di Studio",
        appt_only: "Solo su appuntamento",
        hours_day1: "Lun · Mer · Ven",
        hours_day2: "Mar · Gio",
        day_sat_sun: "Sab - Dom",
        closed: "Chiuso",
        hours_secretary_title: "Orari Segreteria",
        hours_secretary_desc: "Per appuntamenti telefonici e info.",

        // Footer
        link_privacy: "Privacy Policy",

        // Welcome modal
        welcome_transfer_title: "Nuova Sede Studio",
        welcome_transfer_desc: "Dal 27 Aprile 2026, il Dott. Savianu si trasferirà in <strong>Piazza Saione 3</strong>. Attualmente: <strong>Via Ubaldo Pasqui 38</strong>.",
        welcome_intro: "Benvenuti. Ho organizzato questo sito per semplificare la vostra vita. Utilizzando gli strumenti digitali, mi permettete di dedicare la massima attenzione alle visite mediche vere e proprie.",
        welcome_step0_title: "0. Prima di tutto: Leggi le FAQ",
        welcome_step0_desc: "La maggior parte delle risposte a dubbi su certificati, ricette ed esenzioni si trova nelle <strong><a href='faq.html' style='text-decoration:underline; font-weight:bold;'>Domande Frequenti</a></strong>. Consultale prima di chiamare!",
        welcome_step1_title: "1. Canale Preferenziale: Millebook",
        welcome_step1_desc: "Usatelo per <strong>farmaci continuativi</strong>, messaggi brevi e visione ricette. È il metodo più veloce.",
        welcome_step2_title: "2. Prenotazione Appuntamenti",
        welcome_step2_desc: "L'agenda online vi permette di prenotare la visita senza attese al telefono.",
        welcome_step3_title: "3. Urgenze e Contatto Diretto",
        welcome_step3_p1: "Segreteria: <strong>0575 910 904</strong>",
        welcome_step3_p2: "<strong>Urgenze vere: chiamare 112 / 116 117.</strong>",
        welcome_step3_p3: "Il numero del Dottore (0575 171 3428) è riservato solo alle urgenze.",
        welcome_btn: "<span>Ho letto e accetto</span><i class='fas fa-arrow-right'></i>",

        // FAQ page
        faq_hero_title: "<i class='fas fa-question-circle' style='margin-right: 10px;'></i>FAQ per i Pazienti",
        faq_hero_desc: "Risposte alle domande più comuni sullo studio medico",
        faq_back: "<i class='fas fa-arrow-left'></i> Torna al sito principale",
        faq_nav_prenotazioni: "Prenotazioni",
        faq_nav_ricette: "Ricette",
        faq_nav_certificati: "Certificati",
        faq_nav_referti: "Referti",
        faq_nav_millebook: "MilleBook",
        faq_nav_nuovi: "Nuovi Pazienti",
        faq_nav_urgenze: "Urgenze",
        faq_nav_varie: "Servizi",
        faq_sec_prenotazioni: "<i class='fas fa-calendar-check'></i> Prenotazioni e Appuntamenti",
        faq_sec_ricette: "<i class='fas fa-pills'></i> Ricette e Farmaci",
        faq_q1: "Come prenoto una visita?",
        faq_a1: "Il modo più semplice e veloce è tramite il <strong>sito web</strong>:<ul><li>Vai su <a href='index.html'>savianu.it</a> e clicca \"Prenota Visita\"</li><li>Scegli il tipo: <strong>Prima Visita</strong>, <strong>Visita Ordinaria</strong> o <strong>Sintomi Recenti</strong></li><li>Seleziona giorno e orario dal calendario</li><li>Inserisci nome, cognome ed email per la conferma</li></ul><div class='highlight-box'>In alternativa, chiama la segreteria al <strong>0575 910 904</strong> durante gli orari di ambulatorio.</div>",
        faq_q2: "Posso venire senza appuntamento?",
        faq_a2: "Il Dottore riceve <strong>solo su appuntamento</strong> per garantire tempi di attesa ragionevoli e dedicare la giusta attenzione a ogni paziente.",
        faq_q3: "Quali sono gli orari dell'ambulatorio?",
        faq_a3: "<table style='width:100%; border-collapse: collapse;'><tr><td style='padding: 6px 0; font-weight: 600;'>Lunedì, Mercoledì, Venerdì</td><td style='text-align:right; color: var(--text-dark); font-weight: 700;'>16:00 - 19:00</td></tr><tr><td style='padding: 6px 0; font-weight: 600;'>Martedì, Giovedì</td><td style='text-align:right; color: var(--text-dark); font-weight: 700;'>10:00 - 13:00</td></tr><tr><td style='padding: 6px 0; font-weight: 600; color: var(--danger);'>Sabato - Domenica</td><td style='text-align:right; color: var(--danger);'>Chiuso</td></tr></table><div class='highlight-box'><strong>Indirizzo:</strong> Studio Medico Ippocrate, Via Ubaldo Pasqui 38, Arezzo (dal 27/04/2026: Piazza Saione 3)</div>",
        faq_q4: "Come annullo o sposto un appuntamento?",
        faq_a4: "Nell'email di conferma troverete un link per <strong>modificare o cancellare</strong> l'appuntamento direttamente dal calendario.<br><br>Se non trovate l'email, chiamate la segreteria al <strong>0575 910 904</strong> con ragionevole anticipo.",
        faq_q5: "Come richiedo la ricetta per i farmaci che prendo regolarmente?",
        faq_a5: "Il metodo preferenziale è <strong>MilleBook</strong>:<ul><li>Accedete a <a href='https://www.millebook.it/#/login' target='_blank'>millebook.it</a></li><li>Inviate un messaggio con il nome dei farmaci necessari</li><li>Le ricette saranno pronte <strong>entro due giorni lavorativi</strong> e visibili su MilleBook</li></ul><div class='highlight-box'><strong>Importante:</strong> Le ricette dematerializzate (NRE) vengono inviate direttamente al sistema, potete ritirarle in qualsiasi farmacia comunicando il codice fiscale.</div>",
        faq_sec_certificati: "<i class='fas fa-file-medical'></i> Certificati",
        faq_sec_referti: "<i class='fas fa-flask'></i> Referti ed Esami",
        faq_sec_millebook: "<i class='fas fa-laptop-medical'></i> MilleBook",
        faq_sec_nuovi: "<i class='fas fa-user-plus'></i> Nuovi Pazienti",
        faq_sec_urgenze: "<i class='fas fa-ambulance'></i> Urgenze e Fuori Orario",
        faq_sec_varie: "<i class='fas fa-stethoscope'></i> Altri Servizi",
        faq_q6: "Come richiedo un certificato medico?",
        faq_a6: "I certificati standard (per sport non agonistico, assenza scolastica, ecc.) si richiedono durante la visita in ambulatorio o tramite <strong>MilleBook</strong> per i casi più semplici.<br><br>Presentarsi con la documentazione necessaria: il certificato viene emesso direttamente in ambulatorio.<div class='highlight-box'><strong>Certificati INPS malattia:</strong> Richiedono una visita. Prenotare selezionando \"Sintomi Recenti\".</div>",
        faq_q7: "Come accedo ai miei referti?",
        faq_a7: "I referti degli esami sono disponibili sul <strong>Fascicolo Sanitario Elettronico (FSE)</strong> regionale, accessibile su salute.toscana.it con SPID o CIE.<br><br>Il medico può visionare i referti durante la visita e commentarli. Se avete dubbi su un referto, prenotate una visita ordinaria.",
        faq_q8: "Come mi iscrivo a MilleBook?",
        faq_a8: "Per registrarsi a MilleBook:<ul><li>Chiedete le credenziali in segreteria oppure alla prima visita</li><li>Riceverete email e password per accedere a <a href='https://www.millebook.it/#/login' target='_blank'>millebook.it</a></li></ul><div class='highlight-box'>MilleBook è il canale preferenziale per richiedere ricette, inviare messaggi al medico e visualizzare documenti.</div>",
        faq_q9: "Come mi iscrivo come nuovo paziente?",
        faq_a9: "Per iscriversi come nuovo paziente occorre:<ul><li>Avere residenza o domicilio nel territorio di Arezzo</li><li>Presentarsi in segreteria con <strong>tessera sanitaria</strong> e <strong>documento d'identità</strong></li></ul>Dopo la registrazione, prenotare la prima visita selezionando <strong>\"Prima Visita (Nuovi Pazienti)\"</strong> (30 min).<div class='highlight-box'>Portare alla prima visita: lista farmaci, esami precedenti, referti e codice esenzione se presente.</div>",
        faq_q10: "Cosa faccio in caso di emergenza?",
        faq_a10: "In caso di emergenza medica chiamare sempre il <strong>112</strong>.<br><br>Per situazioni urgenti ma non emergenziali fuori dagli orari di ambulatorio, contattare la <strong>Continuità Assistenziale</strong> (ex Guardia Medica) al numero <strong>116 117</strong>.<div class='highlight-box'>Il numero personale del Dottore (0575 171 3428) è riservato esclusivamente alle urgenze reali durante l'orario lavorativo.</div>",
        faq_q11: "Come richiedo un'impegnativa per esami o visite specialistiche?",
        faq_a11: "Le impegnative per esami del sangue, radiografie o visite specialistiche si richiedono durante la visita in ambulatorio.<br><br>Per esami di controllo già programmati (es. controllo annuale), potete farne richiesta tramite <strong>MilleBook</strong> senza bisogno di una visita.<div class='highlight-box'>Per prenotare esami tramite il SSN, utilizzate il <strong>CUP Toscana</strong> una volta ottenuta l'impegnativa.</div>",
        faq_cta_title: "Non hai trovato la risposta?",
        faq_cta_desc: "Contatta la segreteria o accedi a MilleBook per comunicare con il medico."
    },
};

function setLanguage(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang]?.[key]) el.innerHTML = translations[lang][key];
    });
}

// --- SMOOTH SCROLL ---
function showSection(sectionId) {
    const section = document.getElementById(sectionId + '-section');
    if(section) {
        section.classList.remove('hidden');
        section.classList.add('fade-in');
        setTimeout(() => {
            const yOffset = -20;
            const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;
            const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: y, behavior: noMotion ? 'auto' : 'smooth' });
        }, 100);
    }
}

// --- WELCOME MODAL ---
function closeWelcome() {
    const overlay = document.getElementById('welcome-overlay');
    if (overlay) overlay.classList.remove('active');
    document.body.classList.remove('modal-open');
    try { sessionStorage.setItem('welcomeSeen', 'true'); } catch(e) {}
}

function openWelcome() {
    const overlay = document.getElementById('welcome-overlay');
    if (overlay) overlay.classList.add('active');
    document.body.classList.add('modal-open');
}

// --- FOCUS TRAP ---
function trapFocus(modal) {
    const focusable = modal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    modal.addEventListener('keydown', function handler(e) {
        if (e.key !== 'Tab') {
            if (e.key === 'Escape') { closeWelcome(); modal.removeEventListener('keydown', handler); }
            return;
        }
        if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });
}

// --- OPEN/CLOSED BADGE ---
(function() {
    if (typeof CONFIG === 'undefined') return;
    const SCHEDULE = CONFIG.SCHEDULE;
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours() + now.getMinutes() / 60;
    const slots = SCHEDULE[day] || [];
    const isOpen = slots.some(s => hour >= s.from && hour < s.to);

    const anchor = document.querySelector('[data-i18n="hours_title"]');
    if (!anchor) return;
    const badge = document.createElement('span');
    badge.className = isOpen ? 'badge-open' : 'badge-closed';
    badge.innerHTML = isOpen
        ? '<i class="fas fa-circle"></i> Aperto ora'
        : '<i class="fas fa-circle"></i> Chiuso';
    anchor.parentNode.appendChild(badge);
})();

// --- FERIE BANNER LOGIC ---
(function() {
    if (typeof CONFIG === 'undefined') return;
    const banner = document.getElementById('ferie-banner');
    const textEl = document.getElementById('ferie-banner-text');
    if (!banner || !textEl) return;

    const active = CONFIG.getActiveAbsence();

    if (!active) return;

    try {
        if (sessionStorage.getItem('ferie-dismissed-' + active.from)) return;
    } catch(e) {}

    textEl.textContent = active.note;
    banner.removeAttribute('hidden');
})();

function dismissFerieBanner() {
    const banner = document.getElementById('ferie-banner');
    if (banner) banner.setAttribute('hidden', '');
    try {
        const active = CONFIG.getActiveAbsence();
        if (active) sessionStorage.setItem('ferie-dismissed-' + active.from, '1');
    } catch(e) {}
}

// --- DECISION FLOWCHART ---
const FLOWCHART = {
    root: {
        q: '',
        options: [
            { label: '<i class="fas fa-calendar-check"></i> Voglio prenotare una visita', next: 'end_prenota' },
            { label: '<i class="fas fa-pills"></i> Ho bisogno di farmaci o ricette', next: 'end_millebook' },
            { label: '<i class="fas fa-moon"></i> È sera, notte o weekend', next: 'end_116' },
            { label: '<i class="fas fa-question-circle"></i> Ho un\'altra domanda', next: 'end_faq' },
        ]
    },
    end_prenota: {
        end: true,
        icon: 'fas fa-calendar-check',
        color: 'var(--primary)',
        title: 'Prenota una visita',
        desc: 'Scegli il tipo di visita qui sotto e poi seleziona giorno e orario sul calendario.',
        action: { label: 'Scegli il tipo di visita', type: 'scroll_booking' }
    },
    end_millebook: {
        end: true,
        icon: 'fas fa-laptop-medical',
        color: 'var(--primary)',
        title: 'Usa Millebook',
        desc: 'Richiedi farmaci continuativi, ricette o impegnative direttamente da Millebook — senza bisogno di una visita.',
        action: { label: 'Apri Millebook', href: 'https://www.millebook.it/#/login', external: true }
    },
    end_116: {
        end: true,
        icon: 'fas fa-moon',
        color: '#6c757d',
        title: 'Chiama il 116 117',
        desc: 'Per assistenza medica non urgente fuori orario (sera, notte, weekend, festivi): Continuità Assistenziale.',
        action: { label: 'Chiama 116 117', href: 'tel:116117' }
    },
    end_faq: {
        end: true,
        icon: 'fas fa-question-circle',
        color: 'var(--primary-light)',
        title: 'Leggi le FAQ',
        desc: 'Trovi risposte immediate su certificati, esenzioni, referti e burocrazia nelle domande frequenti.',
        action: { label: 'Vai alle FAQ', href: 'faq.html' }
    }
};

function renderFlowStep(stepKey) {
    const step = FLOWCHART[stepKey];
    if (!step) return;
    const container = document.getElementById('flow-step');
    if (!container) return;

    if (step.end) {
        let actionHTML = '';
        const a = step.action;
        if (a.type === 'scroll_booking') {
            actionHTML = `<button class="flow-action-btn" onclick="startBooking()">${a.label}</button>`;
        } else if (a.type === 'booking') {
            const url = a.visitType === 'ordinaria'
                ? 'https://calendar.app.google/qgWNNbUKJHLa2GnKA?hl=it&ctz=Europe/Rome'
                : 'https://calendar.app.google/C57sv4LCP9w3Cxe49?hl=it&ctz=Europe/Rome';
            actionHTML = `<button class="flow-action-btn" onclick="selectVisitType('${a.visitType}','${url}')">${a.label}</button>`;
        } else {
            const target = a.external ? ' target="_blank" rel="noopener noreferrer"' : '';
            actionHTML = `<a class="flow-action-btn" href="${a.href}"${target}>${a.label}</a>`;
        }
        container.innerHTML = `
            <div class="flow-end-card" style="border-color:${step.color}">
                <div class="flow-end-icon" style="color:${step.color}"><i class="${step.icon}"></i></div>
                <h3 class="flow-end-title" style="color:${step.color}">${step.title}</h3>
                <p class="flow-end-desc">${step.desc}</p>
                ${actionHTML}
                <button class="flow-restart-btn" onclick="renderFlowStep('root')">↩ Ricomincia</button>
            </div>`;
    } else {
        const warningHTML = step.warning
            ? `<div class="flow-warning">${step.warning}</div>`
            : '';
        const btns = step.options.map(o =>
            `<button class="flow-option-btn" onclick="renderFlowStep('${o.next}')">${o.label}</button>`
        ).join('');
        container.innerHTML = `
            <div class="flow-question-card">
                ${warningHTML}
                ${step.q ? `<p class="flow-question">${step.q}</p>` : ''}
                <div class="flow-options">${btns}</div>
                ${stepKey !== 'root' ? '<button class="flow-restart-btn" onclick="renderFlowStep(\'root\')">↩ Ricomincia</button>' : ''}
            </div>`;
    }
}

function startBooking() {
    showSection('booking');
}

// Init flowchart on page load if the section exists
if (document.getElementById('flow-step')) {
    renderFlowStep('root');
}

function selectVisitType(type, url) {
    // Highlight selected button
    document.querySelectorAll('.btn-cal-service').forEach(function(btn) {
        btn.classList.remove('selected');
    });
    var activeBtn = document.querySelector('.btn-cal-service.' + type);
    if (activeBtn) activeBtn.classList.add('selected');

    // Open calendar directly
    window.open(url, '_blank', 'noopener,noreferrer');
}

window.addEventListener('load', function() {
    if (sessionStorage.getItem('welcomeSeen')) {
        closeWelcome();
    } else {
        const modal = document.querySelector('.welcome-card');
        if (modal) trapFocus(modal);
    }

    // Initialize new UX features
    initBackToTop();
    initGlobalFilters();
});

// --- UNIFIED ACCORDION LOGIC ---
function toggleAccordion(header) {
    const content = header.nextElementSibling;
    const activeClass = 'active';
    const openClass = 'open';

    const isActive = header.classList.contains(activeClass) || header.classList.contains(openClass);

    // Close all accordions on the page for exclusivity
    document.querySelectorAll('.accordion-header').forEach(h => {
        h.classList.remove(activeClass, openClass);
        h.setAttribute('aria-expanded', 'false');
        if (h.nextElementSibling) {
            h.nextElementSibling.classList.remove(activeClass, openClass);
            // Some old styles might use display: none/block
            if (h.nextElementSibling.style.display === 'block') {
                h.nextElementSibling.style.display = 'none';
            }
        }
    });

    if (!isActive) {
        header.classList.add(activeClass, openClass);
        header.setAttribute('aria-expanded', 'true');
        if (content) {
            content.classList.add(activeClass, openClass);
        }
    }
}

// Map toggleFaq to the same unified logic
const toggleFaq = toggleAccordion;

// --- BACK TO TOP ---
function initBackToTop() {
    // Avoid double injection
    if (document.querySelector('.back-to-top')) return;

    const btn = document.createElement('button');
    btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Torna all\'inizio');
    btn.setAttribute('title', 'Torna all\'inizio della pagina');
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// --- LIVE FILTERS ---
function initGlobalFilters() {
    // 1. Filter for index.html "Strumenti e Risorse"
    initLiveFilter('search-tools', '.tools-grid-auto a', 'span');

    // 2. Filter for faq.html
    initLiveFilter('search-faq', '.accordion-item', '.accordion-header span', '.faq-category');

    // 3. Filter for esenzioni.html
    initLiveFilter('search-esenzioni', '.exemption-table tr:not(:first-child)', '', '.section-block');

    // 4. Filter for impegnative.html
    initLiveFilter('search-impegnative', '.branch-table tr:not(:first-child)', '', '.section-block');
}

function initLiveFilter(inputId, itemsSelector, textSelector, parentToHideSelector) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', function() {
        const term = this.value.toLowerCase().trim();
        const items = document.querySelectorAll(itemsSelector);

        items.forEach(item => {
            const textElement = textSelector ? item.querySelector(textSelector) : item;
            const text = textElement ? textElement.textContent.toLowerCase() : '';

            if (text.includes(term)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });

        // Optional: show/hide sections/categories if all their items are hidden
        if (parentToHideSelector) {
            document.querySelectorAll(parentToHideSelector).forEach(parent => {
                const hasVisible = Array.from(parent.querySelectorAll(itemsSelector)).some(i => i.style.display !== 'none');
                parent.style.display = hasVisible ? '' : 'none';
            });
        }
    });
}