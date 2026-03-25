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
    en: {
        // Mobile banner
        mobile_app_banner: "Open the App version",

        // Header
        header_subtitle: "General Practitioner - Arezzo",

        // Alert box (index.html)
        alert_notice: "<i class='fas fa-info-circle' aria-hidden='true' style='margin-right: 8px;'></i><strong>Relocation:</strong> From 27 April 2026, Dr. Savianu will be visiting at <strong>Piazza Saione 3</strong>.",

        // Services section
        services_title: "Online Services",
        btn_faq_main: "Have questions? Read the FAQ first",
        btn_book: "Book a visit",
        btn_book_sub: "Choose date and time",
        millebook_btn: "Request prescriptions or medications",
        millebook_sub: "Access Millebook — the preferred channel",

        // Booking section
        booking_title: "Select visit type",
        booking_guide_title: "How to book:",
        booking_guide_steps: "<li>Click the button for the visit type below.</li><li>Choose an available day and time from the calendar.</li><li>Enter your first name, surname, and an email address.</li><li>Click <strong>Confirm</strong> (you will receive a confirmation email).</li>",
        cal_prima_title: "First Visit (New Patients)",
        cal_prima_desc: "For new patients only. Bring documents, tests, reports and exemptions. (30 min)",
        cal_ord_title: "Standard Visit",
        cal_ord_desc: "Check-ups and non-urgent issues. (20 min)",
        cal_breve_title: "Recent Symptoms",
        cal_breve_desc: "Urgent but non-emergency visits, acute illness, INPS sick leave certificates. (10 min)",
        privacy_notice_text: "Please read the privacy policy.",
        privacy_notice_link: "Data Processing Policy",

        // Visit info section
        visit_info_title: "What to Bring &amp; Useful Links",
        visit_info_desc: "For your in-office visit, please remember to bring:",
        visit_info_items: "<li>An up-to-date list of all medications you take regularly</li><li>Any previous tests, specialist reports, or hospital discharge letters</li>",
        btn_cup: "Book via CUP Toscana",
        btn_fse: "Health Record (FSE)",

        // Emergency & out-of-hours
        emergency_112: "For medical emergencies, always call the emergency number 112.",
        guard_title: "Out-of-Hours Service (ex-Guardia Medica)",
        guard_desc: "For non-urgent medical assistance during nights, public holidays and pre-holidays.",

        // Contacts
        contacts_title: "Office Contacts",
        label_secretary: "Reception &amp; Appointments",
        label_doctor: "Personal Phone (Emergencies only)",
        label_address: "Studio Medico Ippocrate",
        label_email: "Email",

        // Hours
        hours_title: "Clinic Hours",
        appt_only: "By appointment only",
        hours_day1: "Mon · Wed · Fri",
        hours_day2: "Tue · Thu",
        day_sat_sun: "Sat - Sun",
        closed: "Closed",
        hours_secretary_title: "Reception Hours",
        hours_secretary_desc: "For phone appointments and enquiries.",

        // Footer
        link_privacy: "Privacy Policy",

        // Welcome modal
        welcome_transfer_title: "New Office Location",
        welcome_transfer_desc: "From 27 April 2026, Dr. Savianu will move to <strong>Piazza Saione 3</strong>. Current address: <strong>Via Ubaldo Pasqui 38</strong>.",
        welcome_intro: "Welcome. This website is designed to make your life easier. By using the digital tools available, you allow me to focus my full attention on in-person medical consultations.",
        welcome_step0_title: "0. First of all: Read the FAQ",
        welcome_step0_desc: "Most answers about certificates, prescriptions and exemptions can be found in the <strong><a href='faq.html' style='text-decoration:underline; font-weight:bold;'>Frequently Asked Questions</a></strong>. Check there before calling!",
        welcome_step1_title: "1. Preferred Channel: Millebook",
        welcome_step1_desc: "Use it for <strong>repeat prescriptions</strong>, short messages and viewing your prescriptions. It's the fastest method.",
        welcome_step2_title: "2. Appointment Booking",
        welcome_step2_desc: "The online calendar lets you book a visit without waiting on the phone.",
        welcome_step3_title: "3. Urgent Matters &amp; Direct Contact",
        welcome_step3_p1: "Reception: <strong>0575 910 904</strong>",
        welcome_step3_p2: "<strong>True emergencies: call 112 / 116 117.</strong>",
        welcome_step3_p3: "The doctor's direct number (0575 171 3428) is reserved for genuine emergencies only.",
        welcome_btn: "<span>I have read and accept</span><i class='fas fa-arrow-right'></i>",

        // FAQ page
        faq_hero_title: "<i class='fas fa-question-circle' style='margin-right: 10px;'></i>FAQ for Patients",
        faq_hero_desc: "Answers to the most common questions about the practice",
        faq_back: "<i class='fas fa-arrow-left'></i> Back to main site",
        faq_nav_prenotazioni: "Appointments",
        faq_nav_ricette: "Prescriptions",
        faq_nav_certificati: "Certificates",
        faq_nav_referti: "Test Results",
        faq_nav_millebook: "MilleBook",
        faq_nav_nuovi: "New Patients",
        faq_nav_urgenze: "Emergencies",
        faq_nav_varie: "Services",
        faq_sec_prenotazioni: "<i class='fas fa-calendar-check'></i> Appointments &amp; Bookings",
        faq_sec_ricette: "<i class='fas fa-pills'></i> Prescriptions &amp; Medications",
        faq_q1: "How do I book a visit?",
        faq_a1: "The simplest and fastest way is through the <strong>website</strong>:<ul><li>Go to <a href='index.html'>savianu.it</a> and click \"Book Visit\"</li><li>Choose the type: <strong>First Visit</strong>, <strong>Standard Visit</strong>, or <strong>Recent Symptoms</strong></li><li>Select a day and time from the calendar</li><li>Enter your name, surname and email for confirmation</li></ul><div class='highlight-box'>Alternatively, call reception on <strong>0575 910 904</strong> during clinic hours.</div>",
        faq_q2: "Can I come without an appointment?",
        faq_a2: "The doctor sees patients <strong>by appointment only</strong> to ensure reasonable waiting times and give each patient the attention they deserve.<br><br>If you are unwell and cannot book online, come in anyway: the receptionist will let the doctor know, and he will contact you as soon as he is free.",
        faq_q3: "What are the clinic opening hours?",
        faq_a3: "<table style='width:100%; border-collapse: collapse;'><tr><td style='padding: 6px 0; font-weight: 600;'>Monday, Wednesday, Friday</td><td style='text-align:right; color: var(--text-dark); font-weight: 700;'>16:00 - 19:00</td></tr><tr><td style='padding: 6px 0; font-weight: 600;'>Tuesday, Thursday</td><td style='text-align:right; color: var(--text-dark); font-weight: 700;'>10:00 - 13:00</td></tr><tr><td style='padding: 6px 0; font-weight: 600; color: var(--danger);'>Saturday - Sunday</td><td style='text-align:right; color: var(--danger);'>Closed</td></tr></table><div class='highlight-box'><strong>Address:</strong> Studio Medico Ippocrate, Via Ubaldo Pasqui 38, Arezzo (dal 27/04/2026: Piazza Saione 3)</div>",
        faq_q4: "How do I cancel or reschedule an appointment?",
        faq_a4: "Your confirmation email contains a link to <strong>modify or cancel</strong> the appointment directly in the calendar.<br><br>If you cannot find the email, please call reception on <strong>0575 910 904</strong> with reasonable notice.",
        faq_q5: "How do I request a prescription for my regular medications?",
        faq_a5: "The preferred method is <strong>MilleBook</strong>:<ul><li>Log in at <a href='https://www.millebook.it/#/login' target='_blank'>millebook.it</a></li><li>Send a message listing the medications you need</li><li>Prescriptions will be ready <strong>within two working days</strong> and visible on MilleBook</li></ul><div class='highlight-box'><strong>Important:</strong> Electronic prescriptions (NRE) are sent directly to the system — you can collect them at any pharmacy by providing your tax ID (Codice Fiscale).</div>",
        faq_sec_certificati: "<i class='fas fa-file-medical'></i> Certificates",
        faq_sec_referti: "<i class='fas fa-flask'></i> Test Results &amp; Referrals",
        faq_sec_millebook: "<i class='fas fa-laptop-medical'></i> MilleBook",
        faq_sec_nuovi: "<i class='fas fa-user-plus'></i> New Patients",
        faq_sec_urgenze: "<i class='fas fa-ambulance'></i> Emergencies &amp; Out-of-Hours",
        faq_sec_varie: "<i class='fas fa-stethoscope'></i> Other Services",
        faq_q6: "How do I request a medical certificate?",
        faq_a6: "Standard certificates (for non-competitive sport, school absences, etc.) can be requested during a clinic visit or via <strong>MilleBook</strong> for straightforward cases.<br><br>Bring any relevant documents; the certificate is issued on the spot at the clinic.<div class='highlight-box'><strong>INPS sick leave certificates</strong> require an in-person visit. Book by selecting \"Recent Symptoms\".</div>",
        faq_q7: "How do I access my test results?",
        faq_a7: "Test results are available on the <strong>Electronic Health Record (FSE)</strong>, accessible at salute.toscana.it using SPID or CIE.<br><br>The doctor can review and discuss results during a visit. If you have questions about a result, book a standard appointment.",
        faq_q8: "How do I sign up for MilleBook?",
        faq_a8: "To register for MilleBook:<ul><li>Ask for your credentials at reception or during your first visit</li><li>You will receive an email and password to log in at <a href='https://www.millebook.it/#/login' target='_blank'>millebook.it</a></li></ul><div class='highlight-box'>MilleBook is the preferred channel for requesting prescriptions, sending messages to the doctor, and viewing documents.</div>",
        faq_q9: "How do I register as a new patient?",
        faq_a9: "To register as a new patient you must:<ul><li>Reside or be domiciled in the Arezzo area</li><li>Present yourself at reception with your <strong>health card (tessera sanitaria)</strong> and <strong>photo ID</strong></li></ul>After registration, book your first appointment by selecting <strong>\"First Visit (New Patients)\"</strong> (30 min).<div class='highlight-box'>Bring to your first visit: a list of your current medications, previous test results, specialist reports, and your exemption code if applicable.</div>",
        faq_q10: "What do I do in an emergency?",
        faq_a10: "In a medical emergency always call <strong>112</strong>.<br><br>For urgent but non-emergency situations outside clinic hours, contact the <strong>Out-of-Hours Service</strong> (Continuità Assistenziale) on <strong>116 117</strong>.<div class='highlight-box'>The doctor's personal number (0575 171 3428) is reserved for genuine emergencies during working hours only.</div>",
        faq_q11: "How do I get a referral for tests or specialist appointments?",
        faq_a11: "Referrals for blood tests, X-rays, or specialist visits must be requested during an in-person clinic visit.<br><br>For already-planned routine tests (e.g. annual check-up), you can request them via <strong>MilleBook</strong> without needing an appointment.<div class='highlight-box'>To book tests through the NHS, use <strong>CUP Toscana</strong> once you have your referral.</div>",
        faq_cta_title: "Didn't find the answer?",
        faq_cta_desc: "Contact reception or log in to MilleBook to send a message to the doctor."
    }
};

function setLanguage(lang) {
    const btnIt = document.getElementById('btn-it');
    const btnEn = document.getElementById('btn-en');
    if (btnIt) btnIt.classList.toggle('active', lang === 'it');
    if (btnEn) btnEn.classList.toggle('active', lang === 'en');
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang]?.[key]) el.innerHTML = translations[lang][key];
    });
    try { localStorage.setItem('preferredLanguage', lang); } catch (e) {}
}

try {
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang) setLanguage(savedLang);
} catch (e) {}

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
    const lang = (function() { try { return localStorage.getItem('preferredLanguage') || 'it'; } catch(e) { return 'it'; } })();
    const openLabel = lang === 'en' ? 'Open now' : 'Aperto ora';
    const closedLabel = lang === 'en' ? 'Closed' : 'Chiuso';
    badge.innerHTML = isOpen
        ? '<i class="fas fa-circle"></i> ' + openLabel
        : '<i class="fas fa-circle"></i> ' + closedLabel;
    anchor.parentNode.appendChild(badge);
})();

// --- FERIE BANNER LOGIC ---
(function() {
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
});