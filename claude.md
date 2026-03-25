# Project Context: Portale Medico Dr. Savianu
Sei un Web Designer e Developer esperto. Questo progetto è il portale web del Dr. Emanuel Savianu, Medico di Medicina Generale ad Arezzo.

## Obiettivo Principale
Creare una Landing Page (`index.html`) a doppia scelta:
1. **Pazienti**: un pulsante/card grande che reindirizza al sito principale dei pazienti (`https://savianu.it`).
2. **Colleghi**: una sezione integrata nella stessa pagina (o accessibile tramite scroll/click) dedicata ai colleghi medici, che sostituisce il vecchio file `dottori.html`.

## Design System (Usa `styles.css` esistente)
- **Colori**: Usa le variabili CSS esistenti (`--primary` navy, `--accent` gold, `--bg-gradient-1`).
- **Font**: Montserrat (testi) e Playball (titoli eleganti).
- **Componenti UI da riutilizzare rigorosamente**:
  - Layout a griglia: `.action-grid` e `.container`
  - Contenitori: `.card`, `.card-header`
  - Bottoni: `.btn-main`, `.btn-prenota-large` (puoi adattarlo per le due scelte principali).
  - Alert: `.alert-box` o `.privacy-notice` per il disclaimer medico-legale.
- **Dark Mode**: Assicurati che le nuove sezioni usino colori compatibili con la dark mode già implementata in `app.js` e `styles.css`.

## Contenuti della sezione Colleghi
- **Disclaimer**: Avviso medico-legale per l'accesso riservato.
- **Link Utili**: 
  - Portale Medico (SSR Toscana)
  - Portale Dipendenti (Cedolini GRU)
  - Prontuario Pediatrico (PDF)
- **Calendario**: Un iframe Google Calendar per la programmazione degli eventi di gruppo. 