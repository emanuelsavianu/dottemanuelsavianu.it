# AGENTS.md — Portale Medico Dr. Savianu

## Quick orientation
- **Static HTML/CSS/JS** on GitHub Pages (`dottemanuelsavianu.it`). Push `main` → auto-deploy. No build step, no test suite.
- **Separate patient portal** at `savianu.it` is a different repo (`emanuelsavianu.github.io`). Don't mix changes.
- Serve locally: `npx serve .`
- `config.js` edits absences, schedule, and banner. It's the single source for those.

## Must-know gotchas

### Service worker bump (MANDATORY on every edit)
- Bump `CACHE_NAME` in `sw.js` (e.g. `'savianu-v177'`). List edited files in the CACHE_NAME comment.
- Add new `.html` files to `urlsToCache` array.
- Returning visitors see stale content without a bump. GH Pages deploy lag: 45-60s.

### `config.js` NOT loaded on every page
- Root `index.html` does **not** include `config.js`. Pages that do: `colleghi.html`, `faq.html`, `impegnative.html`, `cert-malattia.html`, `esenzioni.html`, `RUAP/index.html`.
- Before any `CONFIG.*` access in `app.js`, guard with: `if (typeof CONFIG === 'undefined') return;`.
- New pages needing schedule/absence data must explicitly add the `<script src="config.js">` tag.

### `.container` breaks single-column standalone pages
- At ≥900px, `.container` applies `grid-template-columns: 2fr 1fr`. Standalone/guide pages must NOT use `class="container"`. Use `display: block` + inline `max-width` instead.

### Dark mode CSS variable inversion
In `html.dark`:
- `--white` → `#162438` (navy — backgrounds, NOT text)
- `--primary-dark` → `#e0b976` (gold — headings, NOT backgrounds)
- `--text-dark` → `#f3efe6` (cream — correct text color)
For manual overrides: use **raw hex** (`#f3efe6`, `#0d1e33`) — CSS variables in dark mode produce dark-on-dark.

### `calcolatore-ferie.html` is a completely separate stack
- **React + Tailwind CDN.** Does NOT use `styles.css` or main `app.js`. Separate design system (teal brand-600).
- Separate localStorage prefix: `calcolatore-ferie-mdg-*`. Don't apply main site patterns to it.

### Large files
- `visite-private.html` (~17k tokens) — read with `offset`/`limit`
- `RUAP/app.js` (~2500 lines) — prefer Grep over Read for targeted edits

## Conventions

### Italian medical advertising rules
- **Forbidden**: superlatives ("il migliore"), testimonials, years-of-experience claims, comparative advertising
- **Required on service pages**: "Il medico di famiglia SSN può rilasciare il medesimo servizio gratuitamente ai propri assistiti"
- **Always factual**: "Il Dott. X è certificatore telematico INPS autorizzato" — never promotional

### SEO
- Title ≤60 chars, meta description ≤155 chars (Google truncates beyond)
- `og:image`: `bluelogo.png` (physician/general pages) or `bronzelogo.png` (certificates/services)
- Pages with `<meta name="robots" content="noindex">` must NOT be in `sitemap.xml` (currently violated: `faq.html`, `impegnative.html`, `esenzioni.html`, `cert-malattia.html`, `calcolatore-ferie.html`, `calcolatoreferiegemini.html`, `ferie.html`, `installazione.html`, `protocollo-certificati-inps.html`, `rsa.html`, `xsegretarie.html` are `noindex` but in sitemap)
- Update `llms.txt` when adding/removing public-facing pages

### Git
- **Always commit AND push together** (never commit-only)
- Repo enforces LF line endings via `.gitattributes` — Windows commits auto-convert
- `.gitignore` has `*.md` → `!README.md` `!AGENTS.md`, but `CLAUDE.md` files are **already tracked** (committed before gitignore entry). They will show in `git status` despite the gitignore pattern.

### Print styles
Every new page needs: hide `.topbar, footer, nav`, reset `.page-hero` background, expand `.faq-answer` max-height. See `styles.css` `@media print` for patterns.

## Sub-apps

| App | Dir | Stack | Notes |
|-----|-----|-------|-------|
| Main site | `/` | styles.css + app.js | PWA (sw.js + manifest.json + offline.html), config.js NOT on root index |
| Gestore Turni | `gestoreturni/` | Tailwind CDN, standalone | CRUD shift manager; localStorage keys `ruap-*` |
| RUAP Attività Diurne | `RUAP/` | Tailwind CDN, config-driven | 16 doctors, monthly budget, Excel import/export, Genera Mese |

## Other instruction files
- **`CLAUDE.md`** — Full architecture, dark mode, responsive patterns, schema markup, DNS/hosting (258 lines, tracked in git)
- **`RUAP/CLAUDE.md`** — RUAP data schema, budget system, import/export format, generate algorithm (tracked in git)
- **`gestoreturni/CLAUDE.md`** — Gestore Turni state shape, localStorage keys, migration patterns (tracked in git)
