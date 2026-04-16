/**
 * Abbey Road v2.0 — Custom Audio Player
 * Built on Howler.js for reliable cross-browser FLAC playback.
 *
 * ARCHITECTURE (three layers):
 *   1. Data  — playlists.json, loaded once at startup
 *   2. Engine — one Howl instance per track (created on demand, destroyed on skip)
 *   3. UI    — Player class manages one panel's DOM; tab switcher coordinates all three
 *
 * One Player instance exists per studio tab. Each manages its own Howl,
 * track index, seek loop, and DOM updates independently.
 */

'use strict';

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const ACCENT      = '#ff6b35';   // Orange — NOW PLAYING label, active tab, active track
const SEEK_TICK   = 250;         // ms between seek bar updates (smooth enough, not heavy)

// ---------------------------------------------------------------------------
// UTILITY — format seconds as M:SS
// ---------------------------------------------------------------------------

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// PLAYER CLASS
// One instance per studio tab. Owns its Howl, its DOM panel, its tracklist.
// ---------------------------------------------------------------------------

class Player {

  constructor(playlistData, panelEl) {
    this.tracks       = playlistData.tracks;
    this.panel        = panelEl;
    this.currentIndex = 0;
    this.howl         = null;
    this.seekTimer    = null;
    this.isPlaying    = false;

    // Cache DOM references inside this panel so we never query the whole page
    this.coverEl      = panelEl.querySelector('.player__cover');
    this.titleEl      = panelEl.querySelector('.player__title');
    this.artistEl     = panelEl.querySelector('.player__artist');
    this.playBtn      = panelEl.querySelector('.ctrl-btn--play');
    this.prevBtn      = panelEl.querySelector('.ctrl-btn--prev');
    this.nextBtn      = panelEl.querySelector('.ctrl-btn--next');
    this.currentTimeEl= panelEl.querySelector('.player__time--current');
    this.durationEl   = panelEl.querySelector('.player__time--duration');
    this.seekBarEl    = panelEl.querySelector('.seek-bar');
    this.seekProgress = panelEl.querySelector('.seek-bar__progress');
    this.seekHandle   = panelEl.querySelector('.seek-bar__handle');
    this.tracklistEl  = panelEl.querySelector('.player__tracklist');

    this._buildTracklist();
    this._loadTrack(0, false); // Load first track but don't auto-play
    this._bindControls();
  }

  // -------------------------------------------------------------------------
  // TRACKLIST — build the <ol> from track data once at init
  // -------------------------------------------------------------------------

  _buildTracklist() {
    this.tracklistEl.innerHTML = '';
    this.tracks.forEach((track, i) => {
      const li = document.createElement('li');
      li.className = 'tracklist-item';
      li.dataset.index = i;
      li.innerHTML = `
        <span class="tracklist-item__num">${i + 1}</span>
        <span class="tracklist-item__title">${track.title}</span>
        <span class="tracklist-item__artist">${track.artist}</span>
      `;
      li.addEventListener('click', () => {
        this._loadTrack(i, true);
      });
      this.tracklistEl.appendChild(li);
    });
  }

  // -------------------------------------------------------------------------
  // LOAD TRACK — destroy previous Howl, create new one, optionally auto-play
  // -------------------------------------------------------------------------

  _loadTrack(index, autoPlay) {
    // Stop and destroy previous Howl cleanly
    if (this.howl) {
      this.howl.stop();
      this.howl.unload();
      this.howl = null;
    }
    this._stopSeekLoop();

    this.currentIndex = index;
    const track = this.tracks[index];

    // Update static UI immediately — don't wait for audio to load
    this.coverEl.src     = track.cover;
    this.titleEl.textContent  = track.title;
    this.artistEl.textContent = track.artist;
    this.currentTimeEl.textContent = '0:00';
    this.durationEl.textContent    = '0:00';
    this._setSeekPercent(0);
    this._updatePlayButton(false);
    this._highlightActiveTrack(index);

    // Create Howl for this track
    this.howl = new Howl({
      src:    [track.file],
      format: ['flac'],
      html5:  true,   // stream from disk rather than loading entire file into memory

      onload: () => {
        // Duration is available once loaded
        this.durationEl.textContent = formatTime(this.howl.duration());
      },

      onplay: () => {
        this.isPlaying = true;
        this._updatePlayButton(true);
        this._startSeekLoop();
      },

      onpause: () => {
        this.isPlaying = false;
        this._updatePlayButton(false);
        this._stopSeekLoop();
      },

      onstop: () => {
        this.isPlaying = false;
        this._updatePlayButton(false);
        this._stopSeekLoop();
      },

      onend: () => {
        // Auto-advance to next track; stop after the last one
        this._stopSeekLoop();
        if (this.currentIndex < this.tracks.length - 1) {
          this._loadTrack(this.currentIndex + 1, true);
        } else {
          this.isPlaying = false;
          this._updatePlayButton(false);
        }
      },

      onloaderror: (id, err) => {
        console.error('Track load error:', track.file, err);
        this.titleEl.textContent = '⚠ Could not load track';
      }
    });

    if (autoPlay) {
      this.howl.play();
    }
  }

  // -------------------------------------------------------------------------
  // TRANSPORT CONTROLS
  // -------------------------------------------------------------------------

  play() {
    if (!this.howl) return;
    this.howl.play();
  }

  pause() {
    if (!this.howl) return;
    this.howl.pause();
  }

  togglePlayPause() {
    if (!this.howl) return;
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  prev() {
    const newIndex = this.currentIndex > 0 ? this.currentIndex - 1 : 0;
    this._loadTrack(newIndex, this.isPlaying);
  }

  next() {
    const newIndex = this.currentIndex < this.tracks.length - 1
      ? this.currentIndex + 1
      : this.currentIndex;
    this._loadTrack(newIndex, this.isPlaying);
  }

  // Called by tab switcher when this panel is deactivated
  pauseIfPlaying() {
    if (this.isPlaying) this.pause();
  }

  // -------------------------------------------------------------------------
  // SEEK — both the polling loop and click-to-seek on the bar
  // -------------------------------------------------------------------------

  _startSeekLoop() {
    this._stopSeekLoop(); // prevent duplicates
    this.seekTimer = setInterval(() => {
      if (!this.howl || !this.isPlaying) return;
      const current  = this.howl.seek() || 0;
      const duration = this.howl.duration() || 1;
      this.currentTimeEl.textContent = formatTime(current);
      this._setSeekPercent(current / duration);
    }, SEEK_TICK);
  }

  _stopSeekLoop() {
    if (this.seekTimer) {
      clearInterval(this.seekTimer);
      this.seekTimer = null;
    }
  }

  _setSeekPercent(pct) {
    // pct: 0.0 – 1.0
    const p = Math.min(Math.max(pct, 0), 1) * 100;
    this.seekProgress.style.width  = `${p}%`;
    this.seekHandle.style.left     = `${p}%`;
  }

  _seekToClick(e) {
    if (!this.howl) return;
    const rect     = this.seekBarEl.getBoundingClientRect();
    const pct      = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const duration = this.howl.duration() || 0;
    this.howl.seek(pct * duration);
    this._setSeekPercent(pct);
    this.currentTimeEl.textContent = formatTime(pct * duration);
  }

  // -------------------------------------------------------------------------
  // UI HELPERS
  // -------------------------------------------------------------------------

  _updatePlayButton(playing) {
    // Unicode play ▶ / pause ⏸
    this.playBtn.innerHTML = playing ? '&#9646;&#9646;' : '&#9654;';
    this.playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  _highlightActiveTrack(index) {
    const items = this.tracklistEl.querySelectorAll('.tracklist-item');
    items.forEach((item, i) => {
      item.classList.toggle('tracklist-item--active', i === index);
    });

    // Scroll active track into view within the tracklist
    const activeItem = items[index];
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // -------------------------------------------------------------------------
  // BIND CONTROLS — wire up buttons and seek bar
  // -------------------------------------------------------------------------

  _bindControls() {
    this.playBtn.addEventListener('click', () => this.togglePlayPause());
    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());

    // Click anywhere on the seek bar to jump to that position
    this.seekBarEl.addEventListener('click', (e) => this._seekToClick(e));

    // Drag support on the seek bar
    let dragging = false;
    this.seekBarEl.addEventListener('mousedown', () => { dragging = true; });
    document.addEventListener('mousemove', (e) => {
      if (dragging) this._seekToClick(e);
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  }

}

// ---------------------------------------------------------------------------
// TAB SWITCHER — coordinates the three Player instances
// ---------------------------------------------------------------------------

function initTabSwitcher(players) {
  const tabBtns = document.querySelectorAll('.tab-btn');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;

      // Pause whichever player is currently active
      Object.values(players).forEach(p => p.pauseIfPlaying());

      // Deactivate all tabs and panels
      tabBtns.forEach(b => {
        b.classList.remove('tab-btn--active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.player-panel').forEach(panel => {
        panel.classList.remove('player-panel--active');
        panel.hidden = true;
      });

      // Activate the clicked tab and its panel
      btn.classList.add('tab-btn--active');
      btn.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById(`panel-${targetId}`);
      targetPanel.classList.add('player-panel--active');
      targetPanel.hidden = false;
    });
  });
}

// ---------------------------------------------------------------------------
// BAR POSITIONING — keeps the audio bar flush below the fixed header,
// and sets --audio-bar-height so main content clears the bar.
// ---------------------------------------------------------------------------

function initBarPositioning() {
  const header = document.querySelector('.site-header');
  const bar    = document.getElementById('audio-bar');
  const main   = document.getElementById('main-content');

  function update() {
    const headerBottom = header.getBoundingClientRect().bottom;
    bar.style.top      = `${headerBottom}px`;

    // Set main content padding so it clears both header and bar
    const barBottom    = bar.getBoundingClientRect().bottom;
    main.style.paddingTop = `${barBottom + 16}px`;
  }

  update();
  window.addEventListener('scroll', update);
  window.addEventListener('resize', update);

  // Also update whenever the bar changes height (e.g. tracklist expands)
  new ResizeObserver(update).observe(bar);
  new ResizeObserver(update).observe(header);
}

// ---------------------------------------------------------------------------
// BOOTSTRAP — fetch JSON, create Player instances, wire everything up
// ---------------------------------------------------------------------------

async function init() {
  let data;

  try {
    const response = await fetch('data/playlists.json');
    data = await response.json();
  } catch (err) {
    console.error('Could not load playlists.json:', err);
    return;
  }

  // Build a map of playlistId → Player instance
  const players = {};

  data.playlists.forEach(playlist => {
    const panelEl = document.getElementById(`panel-${playlist.id}`);
    if (!panelEl) {
      console.warn(`No panel found for playlist: ${playlist.id}`);
      return;
    }
    players[playlist.id] = new Player(playlist, panelEl);
  });

  initTabSwitcher(players);
  initBarPositioning();
}

// Start once the DOM is ready
document.addEventListener('DOMContentLoaded', init);
