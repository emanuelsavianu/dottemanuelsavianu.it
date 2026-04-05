# Project Context: Portale Medico Dr. Savianu
Sei un Web Designer e Developer esperto. Questo progetto è il portale web del Dr. Emanuel Savianu, Medico di Medicina Generale ad Arezzo.

## Architettura
Sito statico HTML/CSS/JS deployato su GitHub Pages (`emanuelsavianu.github.io`).
- `index.html` — **Triage landing page** (3 card: Assistito SSN → savianu.it, Colleghi → colleghi.html, Privati → visite-private.html)
- `colleghi.html` — Area riservata colleghi (era il vecchio index.html)
- `visite-private.html` — Consulenze medico-legali + iframe prenotazione Google Calendar
- `config.js` — **File chiave**: modifica qui le assenze/orari/banner di avviso
- `app.js` — Dark mode, logica calendario, badge orari
- `styles.css` — Tutto il CSS (variabili, dark mode, componenti)
- `sw.js` + `manifest.json` — PWA (service worker + installabilità)
- `privacy.html` — Informativa privacy
- `ferie.html`, `calcolatore-ferie.html` — Calcolatori ferie medici
- `cert-malattia.html` — Facsimile informativa certificati malattia
- `rsa.html` — Vademecum Operativo RSA (Continuità Assistenziale)
- `calcolatoreferiegemini.html` — Calcolatore ferie alternativo (AI-assisted, stack separato)
- `installazione.html` — Guida installazione PWA
- `xsegretarie.html` — Area segretarie

## Due Repository Distinti
- `dottemanuelsavianu.it` (questo repo) — portale professionale: triage, colleghi, visite private. Hosted su `dottemanuelsavianu.it`.
- `emanuelsavianu.github.io` — portale pazienti SSN. La card "Assistito SSN" in index.html punta a `https://savianu.it` che risolve su quel repo.

## Workflow
Sito statico: apri direttamente nel browser o usa `npx serve .` per un server locale.
Deploy: push su branch `main` → GitHub Pages pubblica automaticamente.

### Comandi con RTK (token-optimized)
Usa sempre il prefisso `rtk` per ridurre token output (60-90% savings):
```bash
rtk git status            # Stato compatto
rtk git diff              # Diff compatto (80% savings)
rtk git log               # Log compatto
rtk git add <files> && rtk git commit -m "msg" && rtk git push
rtk npx serve .           # Server locale con output compatto
```

## File Principale da Modificare
Per aggiornare assenze, trasferimenti o orari ambulatorio: modifica **`config.js`** (array `ASSENZE` e oggetto `SCHEDULE`).

**ATTENZIONE:** `config.js` è caricato SOLO in `index.html` e `colleghi.html`. Per nuove pagine, aggiungere `if (typeof CONFIG === 'undefined') return;` in `app.js` prima di qualsiasi `CONFIG.*` access (es. linee ~314, ~337) per evitare ReferenceError.

## Service Worker
Bump `CACHE_NAME` in `sw.js` (es. `savianu-v143`) ad ogni deploy che aggiunge **o modifica** HTML/CSS/JS.
**When to bump:** After ANY edit to HTML, CSS, JS, or schema markup (not just new files). Users with old cache won't see changes without a bump.
Aggiungere i nuovi file HTML all'array `urlsToCache` in `sw.js`.

**Checklist per ogni bump:** (1) Elencare TUTTE le pagine HTML aggiunte/modificate. (2) Rimuovere i file eliminati da urlsToCache. (3) Cambiare CACHE_NAME (es. v147 → v148). (4) **Nota:** Cache bump NON flushes existing visitors — serve hard refresh (Ctrl+Shift+R) o update toast per vedere novità. Tomorrow's problem, but acceptable for static sites.

## .gitignore Patterns
Use **broad directory patterns** (`.bkit/`, `.claude/`, `.superpowers/`, `.playwright-mcp/`) instead of individual snapshot/log paths — maintenance burden ridotto di 90%.
Use **negation patterns** to protect documentation: `*.md` then `!README.md` (allows README while ignoring analysis files like GEO-ANALYSIS.md).
When untracking files in bulk: `git ls-files --ignored --exclude-standard -c | xargs git rm --cached`.

## Line Endings (.gitattributes)
`.gitattributes` configured: `core.autocrlf = input` + explicit LF for `.html`, `.js`, `.css`, `.json`, `.md`, `.xml`.
**Why:** Prevent CRLF/LF mismatch warnings on Windows commits. All files normalized to LF in repo.
**For you:** Git will auto-convert CRLF → LF on commit; no manual line-ending management needed.

## robots.txt — AI Search Bots
**Allow explicitly:** GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, anthropic-ai, PerplexityBot (ChatGPT, Claude, Perplexity discoverability).
**Disallow:** CCBot (Common Crawl training scraper — optional, depends on content policy).
Use per-crawler directives instead of blanket `User-agent: *` for clarity.

## Dark Mode: Variabili CSS Rinominate (ATTENZIONE)
In `body.dark-mode`, le variabili CSS cambiano semantica radicalmente:
- `--white` → `#162438` (navy scuro, usato per sfondi card) — **NON usare per testo**
- `--primary-dark` → `#e0b976` (oro, usato per titoli) — **NON usare per sfondi**
- `--text-dark` → `#f3efe6` (crema) — colore testo corretto in dark mode

Per override dark mode: usa **valori hex hardcodati** (`#f3efe6`, `#0d1e33`) invece delle variabili, altrimenti si ottengono testo nero su nero o sfondi dorati.

**Print CSS:** Aggiungere `@media print { .page-hero { background: none !important; color: #000; } }` per evitare sfondi scuri che consumano inchiostro. Nascondere topbar, footer, nav (display: none). Espandere max-height su `.faq-answer` (max-height: none !important;).

## SEO / Indicizzazione
Il sito è **indicizzabile** per Local SEO su Arezzo. Tutte le pagine permettono indicizzazione. Schema JSON-LD Physician è presente in `index.html`. Open Graph tags sono configurati per condivisione social.

## GEO (Generative Engine Optimization) — AI Search Visibility
**Key files:** `llms.txt` (ChatGPT/Perplexity site guide), `robots.txt` (AI crawler allow/deny), canonical URLs (`<link rel="canonical">` in head).
**Schema patterns:** Physician + MedicalClinic + BreadcrumbList + FAQPage (all JSON-LD).
**Content citability:** Self-contained passages of 134–167 words are optimal for AI extraction.
**JS-hidden content:** FAQ answers hidden by CSS (`max-height: 0; overflow: hidden`) are invisible to AI crawlers — add JSON-LD `FAQPage` schema as alternative.
See `GEO-ANALYSIS.md` (not in git) for detailed audit + expansion recommendations.

## Design System (Usa `styles.css` esistente)
- **Colori**: Usa le variabili CSS esistenti (`--primary` navy, `--accent` gold, `--bg-gradient-1`).
- **Font**: Montserrat (testi) e Playball (titoli eleganti).
- **Componenti UI da riutilizzare rigorosamente**:
  - Layout a griglia: `.action-grid` e `.container`
  - Contenitori: `.card`, `.card-header`
  - Bottoni: `.btn-main`, `.btn-prenota-large`
  - Alert: `.alert-box` o `.privacy-notice` per il disclaimer medico-legale.
- **Dark Mode**: Nuove sezioni devono usare variabili CSS compatibili con dark mode (`app.js` + `styles.css`).

## Eccezione: calcolatore-ferie.html
Usa React + Tailwind CDN — NON usa `styles.css`. Design system separato (palette teal brand-600).
Dati salvati in `localStorage` con prefisso chiave `calcolatore-ferie-mdg-*`.

## Facsimili e Certificati
Pattern per nuovi documenti: usa `styles.css` + `app.js` (stile sito completo, dark mode, supporto stampa).
Esempio esistente: `cert-malattia.html`. Aggiungere nuovi documenti come `<a>` buttons nella card `#facsimili` in `index.html`.

**FAQ e contenuti lunghi:** Creare pagina standalone + inline embed in pagina principale. Standalone per SEO/discovery (schema JSON-LD FAQPage, search, filters), inline per UX context. Esempio: `faq-riforma.html` (22 Q&As, live search, pill filters, schema) + embed in `visite-private.html#faq-riforma` (compact accordion, link to full page).

## Schema Markup Patterns (Medical Site)
- **index.html:** Physician (name, specialty, address, phone, priceRange, areaServed) + MedicalClinic (openingHours) + BreadcrumbList
- **visite-private.html:** FAQPage + BreadcrumbList
- **faq-riforma.html:** FAQPage + BreadcrumbList
- **Key fields:** `sameAs` (links to Google Maps, LinkedIn), `worksFor` (clinic reference), proper address/phone formatting
- **Validation:** Use Google Rich Results Test or schema.org validator before deploy

## Contenuti della sezione Colleghi
- **Disclaimer**: Avviso medico-legale per l'accesso riservato.
- **Link Utili**: Portale Medico SSR Toscana, Portale Dipendenti GRU, Prontuario Pediatrico
- **Calendario**: iframe Google Calendar per eventi di gruppo.

## Responsive Patterns

**Responsive iframe (Google Calendar, ecc):** Su mobile, usare `padding-top: 75%;` + `position: absolute` per mantenere aspect ratio. Su desktop (min-width: 600px), usare `height: 620px;` fisso. Elimina attributi width/height dall'iframe stesso. Esempio: `visite-private.html` `.calendar-frame`.

## DNS / Hosting
Custom domain: `dottemanuelsavianu.it` (file `CNAME`). Hosted su GitHub Pages.
DNS: Cloudflare (nameserver: `ariadne.ns.cloudflare.com` + `clark.ns.cloudflare.com`).
Records devono essere DNS-only (no proxy arancione) — obbligatorio per il cert Let's Encrypt di GitHub Pages.
Dopo modifiche DNS: verificare GitHub Pages → Settings → Pages → spunta "Enforce HTTPS".


# dottemanuelsavianu.it — Project Context

**Stack:** raw-http | none | javascript

0 routes | 0 models | 0 env vars | 0 import links


---

## Instructions for Claude Code

Before exploring the repo, read these files in order:
1. `.codesight/CODESIGHT.md` — full context map (routes, schema, components, deps)
2. Use the codesight MCP server for targeted queries:

   - `codesight_get_summary` — quick project overview
   - `codesight_get_routes --prefix /api/users` — filtered routes
   - `codesight_get_blast_radius --file src/lib/db.ts` — impact analysis before changes
   - `codesight_get_schema --model users` — specific model details

Only open specific files after consulting codesight context. This saves ~413 tokens per conversation.
