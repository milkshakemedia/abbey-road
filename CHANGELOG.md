# Abbey Road v2.0 — Changelog

A running log of what was built, why, and what's next.
Cross-reference with `CLAUDE.md` in the v1.5 WordPress project for design decisions and styling specs that carry over.

---

## 2026-04-16 — Session 1: Foundation + Working Audio Player

### What this version is and why
v2.0 is a full rebuild of the Crafted for Cunard site as **static HTML + JavaScript** — no WordPress, no PHP, no Local by Flywheel VM. A zip file on a thumbdrive is all that's needed to deploy or update any tablet. This matters because:
- Ship WiFi security is too tight to download software
- Local by Flywheel is ~10GB and was straining the Surface tablets
- The WordPress blueprint approach (v1.5) still requires Local pre-installed from physical media
- Static HTML just needs a browser — nothing else, ever

### Files created this session

| File | Purpose |
|------|---------|
| `data/playlists.json` | All track data — 54 tracks across 3 playlists, extracted directly from the WordPress database (`local.sql`). Single source of truth. Edit this to add/remove tracks. |
| `js/howler.min.js` | Howler.js audio library, bundled locally. No CDN — works fully offline. |
| `js/player.js` | Custom player engine. Loads `playlists.json`, creates one `Player` instance per studio tab, handles play/pause/next/prev/seek/auto-advance and tracklist UI. |
| `css/player.css` | Dark theme styles. Matches the live WordPress site: `#ff6b35` accent, Georgia serif body, 13.5px player text, 14px scrollbar. |
| `index.html` | Page shell — fixed header, sticky audio bar with three tabs, player panels, main content area. |

### Architecture explained (the three-layer model)
Every audio player project — for any client — follows this same pattern:

1. **Data layer** (`playlists.json`) — all track info in one place. Swap this file, you have a completely different playlist with no code changes.
2. **Engine layer** (Howler.js) — handles the actual audio: loading, playing, seeking, auto-advancing, browser quirks. You don't touch the browser's raw `<audio>` tag directly.
3. **UI layer** (`player.js` + `css/player.css`) — the buttons, tracklist, now-playing display. Talks to Howler. Knows nothing about how audio actually works internally.

### How the data was extracted
The full playlist data (54 tracks, cover art, file paths) was read directly from `abbey-road/app/sql/local.sql` — the WordPress database export. No login required. This is reusable for any Local by Flywheel project.

### Deployment: how to install on a new tablet
1. Copy the `abbey-road-v2/` folder to the tablet (zip + thumbdrive, or download once)
2. Open `index.html` in a browser
3. Done — no server, no internet, no software to install

### To copy all audio files from the WordPress site (one-time, ~2.4GB)
Run these two commands from the `abbey-road` project root:
```bash
cp -r "app/public/wp-content/uploads/2025" "../abbey-road-v2/assets/uploads/"
cp -r "app/public/wp-content/uploads/2026" "../abbey-road-v2/assets/uploads/"
```

### Status
- ✅ JSON data structure — all 54 tracks
- ✅ Howler.js integrated — audio confirmed playing (Moon River test)
- ✅ Three tabbed players — tab switching pauses outgoing audio
- ✅ Track list — click any row to jump to that track
- ✅ Seek bar — click to jump, updates every 250ms while playing
- ✅ Cover art — all images copied and loading
- ✅ Layout fix — responsive breakpoints at 767px and 479px (see Session 2)
- ⬜ Full audio copy — 59 FLACs need copying (one command above)
- ⬜ Styling pass — audit every element against the live site
- ⬜ FLAC / browser testing — confirm Chrome, Edge, Safari; add MP3 fallback if needed
- ⬜ Page content — replace placeholder copy with real Cunard content
- ⬜ Video player (Plyr.js) — added after audio is solid

### Known issues / next session priorities
1. **Audio files not copied yet** — all tracks except Moon River will show "Could not load track". Run the copy command above to fix this.

---

## 2026-04-23 — Session 2: Responsive Layout

### What changed
Added two `@media` breakpoints to `css/player.css` (no HTML or JS changes):

| Breakpoint | Layout |
|---|---|
| `≤ 767px` | 4-column grid; tracklist drops to a full-width row below controls |
| `≤ 479px` | 3-column grid; seek bar moves to its own full-width row; tracklist hidden |

Tested at 912px (Surface target), 700px, and 400px via browser preview. Figma file confirmed the target canvas is 912px wide.
