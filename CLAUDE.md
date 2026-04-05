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

**Checklist per ogni bump:** (1) Elencare TUTTE le pagine HTML aggiunte/modificate nel commento CACHE_NAME. (2) Rimuovere i file eliminati da urlsToCache. (3) Cambiare CACHE_NAME (es. v147 → v148). (4) **Nota:** Cache bump NON flushes existing visitors — serve hard refresh (Ctrl+Shift+R) o update toast per vedere novità. Tomorrow's problem, but acceptable for static sites.

**CRITICAL:** Every new `.html` page MUST be added to `urlsToCache` array AND cache version bumped in same commit, or users won't see changes.

**Service Worker deploy latency:** GitHub Pages takes 45-60 seconds to serve new version after git push. Cache version bump is mandatory. Playwright/browser may serve cached old version until SW cache updates; add `?v=N` query param to force fresh load.

## Single-Column Page Layouts
New pages (certificato-invalidita-civile.html, standalone guides) must NOT use `class="container"` as main wrapper — applies `grid-template-columns: 2fr 1fr` ≥900px, breaking single-column layout. Use `display: block` with inline `max-width`, or dedicated non-grid class instead.

## Modal Overflow (Welcome & Reps)
`.welcome-card`, `.reps-card` must NOT have `max-height: 90vh; overflow-y: auto` (causes nested scrollbar inside overlay). Instead, move scroll to the overlay itself: `#welcome-overlay { overflow-y: auto; align-items: flex-start; }` + remove max-height from card.

## Lang-Switch Ghost Frame
`.lang-switch` is styled as backdrop-blurred pill box for old ITA/ENG language buttons. Currently only holds the dark-mode toggle → visually appears as ghost frame. Restyle to remove pill appearance (no border/background) when displaying single icon, or use dedicated `.topbar-actions` pattern for new pages.

## Dark Mode Toggle Button (Site-Wide)
**Visibility & Interaction:** Circular button (50% border-radius, 48px), gold border (var(--accent)), hover: scale(1.15) + rotate(180deg) + glow shadow (0 4px 16px rgba(220,171,96,0.45)). Applied to both `.lang-btn` (legacy pages) and `.btn-dark-toggle` (new pages).

**Persistence:** `toggleDarkMode()` in `app.js` persists dark-mode class via localStorage. Works site-wide automatically — no page-specific implementation needed.

## Responsive Flexbox with CSS Reordering
Mobile-first layout using flexbox `flex-direction` + CSS `order` property:
```css
.wrapper { display: flex; flex-direction: column; gap: 28px; }
.wrapper > section:first-child { order: 1; }  /* appears first on mobile */
.wrapper > section:last-child { order: 2; }

@media (min-width: 900px) {
  .wrapper { flex-direction: row; }
  .wrapper > section:first-child { order: 2; flex: 0 0 320px; }  /* right side on desktop */
  .wrapper > section:last-child { order: 1; flex: 1; }  /* left side on desktop */
}
```
Cleaner than duplicating elements or multiple breakpoint-specific `display: none`/`block`.

**Sticky flex sidebar:** `position: sticky` on a flex item only works if `align-self: flex-start` is also set — the default `stretch` value prevents sticky from activating.
```css
.booking-contacts-wrapper > section:first-child {
    position: sticky;
    top: 24px;
    align-self: flex-start; /* required — stretch prevents sticky */
}
```

**Wide-screen booking layout (≥1200px):** `.booking-section` class has `max-width: 900px` — must add `max-width: none` override at ≥1200px or the calendar stays narrow even if the wrapper expands. Pattern in `styles.css`: `@media (min-width: 1200px) { .booking-contacts-wrapper { max-width: 1380px; padding: 0 48px; } }` + inline override `@media (min-width: 1200px) { .booking-section { max-width: none; } }`.

## Contact Card Pattern (Reusable)
Consistent styling for contact sections:
- Phone/email as clickable links (`tel:` and `mailto:` protocols)
- Labels: small caps, uppercase, color: `var(--text-medium)`
- Values: color: `var(--accent)`, font-weight: 700, font-size: 1.15rem
- Privacy/disclaimers: italic, small font, border-top separator
- Dark mode: Apply to `.booking-contacts-wrapper` or parent card, inherits styling automatically

## Testing with Playwright & Service Worker Cache
- **GitHub Pages deploy:** 45-60 seconds after `git push`
- **Service worker + browser cache:** serve stale version until refreshed
- **Solution:** Add `?v=N` query param to testing URLs (e.g., `https://dottemanuelsavianu.it/page.html?v=154`) to force fresh load
- **Cache version in sw.js:** (e.g., `'savianu-v154'`) must be bumped for changes to propagate

## Large File Editing
`visite-private.html` ≈17,817 tokens. Use `Read` with `limit` + `offset` parameters to avoid token overflow:
```bash
# First chunk
Read { file_path, offset: 1, limit: 100 }
# Second chunk
Read { file_path, offset: 100, limit: 100 }
```
Prevents session context overflow and "file too large" errors.

## Google Calendar Embeds
**Cross-origin iframes have their own scroll context** — `overflow: hidden` on the wrapper div has zero effect on the iframe's internal scrollbar. The only fix is making the iframe tall enough that its content doesn't overflow.
Minimum heights: `900px` desktop, `750px` mobile (≤600px). 620px is too short — causes double scrollbar (page scroll + iframe scroll).
At ≥1200px wide (calendar ~944px), `820px` height is sufficient.

## Gradient Sections with Text
**Never hardcode white text on gradient backgrounds.** Uses CSS variables for automatic dark mode contrast:
```css
/* ✗ Wrong */
<h2 style="color: #ffffff;">Title</h2>
<p style="color: rgba(255,255,255,0.9);">Text</p>

/* ✓ Correct */
<h2 style="color: var(--primary);">Title</h2>
<p style="color: var(--text-dark);">Text</p>
```
Hardcoded white fails readability in light mode on cream gradients.

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

## Pubblicità Medica (Normativa Italiana)
Contenuti SEO **devono essere informativi**, mai promozionali (Codice Deontologico FNOMCeO + divieto pubblicità comparativa).
Vietato: anni di esperienza, superlativi ("il migliore"), confronti con colleghi, testimonial.
**Pattern obbligatorio per pagine di servizio:** citare esplicitamente che "il medico di famiglia SSN può rilasciare il medesimo servizio gratuitamente ai propri assistiti" — evita concorrenza sleale verso i colleghi MMG.
Tono corretto: "Il Dott. X è certificatore telematico INPS autorizzato" (fattuale), non "scegli il Dott. X" (promozionale).

## SEO / Indicizzazione
Il sito è **indicizzabile** per Local SEO su Arezzo. Tutte le pagine permettono indicizzazione. Schema JSON-LD Physician è presente in `index.html`. Open Graph tags sono configurati per condivisione social.

**Google snippet vs meta description:** Google può ignorare la meta description e usare il testo visibile della pagina per gli snippet di ricerca. Per escludere un elemento HTML dagli snippet: `<div data-nosnippet>...</div>`. Per aggiornare lo snippet dopo una modifica: Google Search Console → URL Inspection → "Request Indexing" (1–7 giorni).

**Meta tag limits (SERP Display):** Title ≤60 chars (Google displays 50–60 on desktop, truncates on mobile). Description 150–155 chars (truncates after ~155 on mobile). Trim aggressive — verificare sempre quando si modificano i meta tag.

## Social Sharing Images (og:image)
- `bluelogo.png` — Navy medical caduceus icon (Physician, general pages). Use on `index.html`, main landing pages.
- `bronzelogo.png` — Gold medical caduceus icon (certificates, services). Use on `visite-private.html`, `certificato-invalidita-civile.html`, `faq-riforma.html`.
Add `<meta property="og:image" content="https://dottemanuelsavianu.it/bluelogo.png">` to pages for social preview cards (LinkedIn, WhatsApp, Facebook sharing).

## Sitemap & noindex Pages
Pages with `meta name="robots" content="noindex, nofollow"` should NOT be in `sitemap.xml`. Remove internal/legal pages (colleghi.html, privacy.html, offline.html) from sitemap to avoid mixed crawler signals. Keep sitemap for publicly indexable pages only.

## Fixing Orphaned Pages (No Internal Links)
If a page has zero internal links pointing to it (rsa.html, xsegretarie.html, installazione.html, impegnative.html, esenzioni.html), add navigation in relevant hub page (e.g., `colleghi.html` Facsimili section). Use consistent pattern: `.action-grid tools-grid-auto` wrapper + `.btn-main btn-prenota` links with icon + title + `<small>` descriptor.

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
- **certificato-invalidita-civile.html:** MedicalService + FAQPage + BreadcrumbList + LocalBusiness+MedicalOrganization
- **LocalBusiness+MedicalOrganization:** `@type: ["LocalBusiness", "MedicalOrganization"]` — use on service pages for local search visibility (name, address, phone, email, areaServed). Factual, not promotional.
- **Key fields:** `sameAs` (links to Google Maps, LinkedIn), `worksFor` (clinic reference), proper address/phone formatting
- **Validation:** Use Google Rich Results Test or schema.org validator before deploy

## Contenuti della sezione Colleghi
- **Disclaimer**: Avviso medico-legale per l'accesso riservato.
- **Link Utili**: Portale Medico SSR Toscana, Portale Dipendenti GRU, Prontuario Pediatrico
- **Calendario**: iframe Google Calendar per eventi di gruppo.

## Responsive Patterns

**Responsive iframe (Google Calendar, ecc):** Use fixed heights — `900px` desktop (default), `750px` mobile (≤600px), `820px` at ≥1200px wide. Remove width/height attributes from the `<iframe>` element itself. See `visite-private.html` `.calendar-frame`.

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
