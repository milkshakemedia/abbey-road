# Abbey Road v2.0 — Changelog

A running log of what was built, why, and what's next.
Cross-reference with `CLAUDE.md` in the v1.5 WordPress project for design decisions and styling specs that carry over.

> **Quick reference — adding or removing tracks:** edit `data/playlists.js`, **not** `data/playlists.json` (that file no longer exists — see Session 4, 2026-07-07). Same JSON structure, just wrapped in `const PLAYLISTS = { ... };`.

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
| `data/playlists.json` | All track data — 54 tracks across 3 playlists, extracted directly from the WordPress database (`local.sql`). Single source of truth. Edit this to add/remove tracks. *(Replaced by `data/playlists.js` in Session 4 — see below.)* |
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

### Styling pass
Follow-up polish, same session:
- Active tab gets an orange 3px inset bottom border (box-shadow)
- Cover image hides alt text when no image is loaded (color: transparent)
- Player info spans full row height and vertically centers NOW PLAYING/title/artist
- Tracklist title/artist max-width removed — uses full column width
- Seek bar gap increased 0.5rem → 0.75rem for breathing room around timestamps

### Status
- ✅ Full audio copy — all 59 FLACs copied into `assets/uploads/`
- ⬜ Styling pass — audit every element against the live site
- ⬜ FLAC / browser testing — confirm Chrome, Edge, Safari; add MP3 fallback if needed
- ⬜ Page content — replace placeholder copy with real Cunard content
- ⬜ Video player (Plyr.js) — added after audio is solid

---

## 2026-05-08 — Session 3: Tracklist UX + Volume Control

### What changed
- **Tracklist switched from 3-column grid to single column** (1 track per line) — multi-column was confusing for the non-tech-savvy Cunard audience
- **Scroll arrows** — elegant up/down chevrons to scroll the tracklist one track at a time; auto-disable at top/bottom; raw scrollbar hidden
- **Volume control** — speaker icon + styled range slider added as a new grid column in the player bar; fill tracks position, persists across track changes; hidden on very small viewports
- **Tab buttons switched to Arial** sans-serif (was serif, matching body copy — tabs needed clearer contrast)

### Status
- ✅ Full audio copy — all 59 FLACs copied into `assets/uploads/`
- ✅ Single-column tracklist with scroll arrows
- ✅ Volume control
- ⬜ Styling pass — audit every element against the live site
- ⬜ FLAC / browser testing — confirm Chrome, Edge, Safari; add MP3 fallback if needed
- ⬜ Page content — replace placeholder copy with real Cunard content
- ⬜ Video player (Plyr.js) — added after audio is solid

---

## 2026-07-07 — Session 4: `file://` Compatibility Fix (⚠️ changes how you add tracks)

### What changed
Deployment was assumed to be "no server, ever — just open `index.html`." That assumption was never actually tested: `js/player.js` loaded track data with `fetch('data/playlists.json')`, and Chrome/Edge (Chromium) **block `fetch` of local files opened via `file://`** as a CORS restriction. On the actual tablet, opening `index.html` directly would have shown a blank player with "Could not load playlists.json" in the console — this only worked in dev because `npx serve` serves over `http://`, which masked the bug.

**Fix:** `data/playlists.json` → **`data/playlists.js`**, same JSON content wrapped as `const PLAYLISTS = { ... };`, loaded via a plain `<script src="data/playlists.js">` tag instead of `fetch`. Script tags load fine over `file://`; JSON fetches don't. Verified working in preview: play/pause, tab switching, and full tracklist all confirmed with the new loader.

### ⚠️ Workflow change — how to add/remove tracks
**Edit `data/playlists.js`, not `data/playlists.json`** (the `.json` file has been deleted). The content and structure are identical — it's the same object, just prefixed with `const PLAYLISTS = ` and suffixed with `;`. Nothing else about editing track entries changes.

### Tab row + cover art alignment
Follow-up polish, same session, found via wide-viewport testing:
- `.audio-bar__tabs` now shares `.player`'s `max-width: 1400px; margin: 0 auto;` — the tab row no longer stretches full-bleed past the player content on wide screens
- Album cover resized from `100px` to `145px` square to match the rendered width of the "Studio One" tab (measured via computed styles, not eyeballed)
- Cover bleeds flush with the tab row's true left edge (`margin-left: -1rem`, cancelling `.player`'s own left padding) so cover art and the active tab's highlight/underline share one continuous left edge
- `.tab-btn:first-child` left padding bumped `0.5rem → 1rem` to match `.player`'s own left padding — this incidentally grew the tab's total width by 8px, which is why the cover went `137px → 145px` in a follow-up fix, to keep both edges flush

### Status
- ✅ Full audio copy — all 59 FLACs copied into `assets/uploads/`
- ✅ Single-column tracklist with scroll arrows
- ✅ Volume control
- ✅ `file://` compatibility — playlist data loads without a server
- ✅ Tab row / cover art alignment — flush on both edges at all viewport widths
- ⬜ Styling pass — audit every remaining element against the live site
- ⬜ FLAC / browser testing on the actual tablet browser; add MP3 fallback if needed
- ⬜ Page content — replace placeholder copy with real Cunard content
- ⬜ Video player (Plyr.js) — added after audio is solid

---

## 2026-09-25 — Session 5: Real Page Content (demo-ready)

### What changed
- **Placeholder copy replaced with the full "Crafted for Cunard" page** from the WordPress site — ~2,240 words across four sections: Cunard and our Musical Heritage (Elgar → The Beatles), Abbey Road Studios, Bowers & Wilkins, and Qobuz, ending with the QR codes and "Back to top".
- **Source:** the WordPress database export `abbey-road/app/sql/local.sql` (page ID 12, the site's front page, last saved 2026-04-13). No WordPress login or running server needed. A Markdown copy plus full-size original images were also exported to `Abbey Road Cunard/wordpress-export/` on the laptop.
- **All 7 images** use files already in `assets/uploads/` (the 1024px WordPress sizes; logo and QR at full size). Descriptive alt text added.
- **Cleanup vs. WordPress:** stripped block comments/classes, fixed stray spaces inside italic titles (e.g. *Aladdin Sane,* / *Ziggy Stardust*), "Bowers&Wilkins" → "Bowers & Wilkins".
- **Studio links in the copy** ("Studio One / Two / Three") now switch the player to that tab and scroll up to it (`js/player.js`, bottom of file).
- **New content styles** in `css/player.css` under "Page content — imported from the WordPress site": section titles with divider rule, artist sub-heads, full-width figures.
- **Artist sub-heads restyled** (Elgar, Bowie, etc.): were orange — the link colour — so they looked clickable. Now white uppercase small caps (0.14em tracking) with a short **28px** orange bar *below* the name (`h3::after`). Tried 42px; 28px was more elegant — keep it.
- **Entrance photo full width:** `Abbey_Road_New-Logo-scaled.png` is actually a photo of the studio's front entrance, not a logo. Removed the 520px logo-size cap so it spans the text column like the other photos; alt text corrected. (The header logo uses the same file and is unchanged.)
- **Intro divider:** a short centred **28px orange bar** between the italic intro and "Cunard and our Musical Heritage", echoing the artist sub-head bars. Chose this over a full-width gray rule or a short gray line.
- **Small caps on all headings:** page title, section titles (Abbey Road Studios / Bowers & Wilkins / Qobuz) and section headings use `font-variant: small-caps` with slight letter-spacing.
- **Headings converted to title case** so the small caps read consistently (e.g. "The home of music making" → "The Home of Music Making", "Try it Free" → "Try It Free"). Capitalisation only — no wording changed.

### Tested (opened directly via `file://`, Chrome)
- All 54 tracks still play; tab switch still pauses outgoing audio
- All 7 content images load at 912px (tablet), 1440px, and 400px; no horizontal scroll; no console errors
- Studio links and Back to top work

### Git
On branch `session-5-page-content`, pushed — **not yet merged to `main`**.

### Status
- ✅ Page content — real Cunard content in place
- ⬜ Styling pass — compare content section side-by-side with the live WordPress page
- ⬜ FLAC / browser testing on the actual tablet browser (Edge/Safari not yet tested)
- ⬜ Merge `session-5-page-content` → `main` after the 2026-09-26 demo
- ⬜ Video player (Plyr.js)
