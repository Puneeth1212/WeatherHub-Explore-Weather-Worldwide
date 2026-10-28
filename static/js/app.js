/* =========================================================
   WeatherHub — app.js
   Full frontend logic matching the redesigned UI
   ========================================================= */
'use strict';

// ─── State ───
const State = {
  currentCity: null,
  currentCountry: null,
  favorites: [],
  editingId: null,
  isSearching: false,
  theme: 'night',
};

// ─── DOM helpers ───
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// =========================================================
// Toast
// =========================================================
function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> <span>${escHtml(msg)}</span>`;
  $('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

// =========================================================
// Date / Time Clock
// =========================================================
function updateClock() {
  const now  = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = $('topbarDate');
  const t = $('topbarTime');
  if (d) d.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  if (t) {
    const h = now.getHours(), m = now.getMinutes().toString().padStart(2,'0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    t.textContent = `${((h % 12) || 12)}:${m} ${ampm}`;
  }
}

// =========================================================
// Theme Toggle
// =========================================================
function initTheme() {
  const saved = localStorage.getItem('wh_theme') || 'night';
  applyTheme(saved);
}

function applyTheme(mode) {
  State.theme = mode;
  document.body.classList.toggle('light-mode', mode === 'day');
  $('dayBtn')?.classList.toggle('active', mode === 'day');
  $('nightBtn')?.classList.toggle('active', mode === 'night');
  localStorage.setItem('wh_theme', mode);
}

// =========================================================
// Sidebar (mobile)
// =========================================================
function initSidebar() {
  const btn     = $('mobileMenuBtn');
  const sidebar = $('sidebar');
  btn?.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
  document.addEventListener('click', e => {
    if (sidebar.classList.contains('mobile-open') &&
        !sidebar.contains(e.target) && e.target !== btn) {
      sidebar.classList.remove('mobile-open');
    }
  });
}

// =========================================================
// Navigation
// =========================================================
function navigateTo(section) {
  $$('.nav-link-item').forEach(i => i.classList.remove('active'));
  $(`nav-${section}`)?.classList.add('active');

  // Smooth scroll to section or perform action
  if (section === 'home' || section === 'current' || section === 'forecast') {
    const el = section === 'forecast' ? $('forecastSection') : document.querySelector('.weather-hero');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (section === 'favourites') {
    $('favouritesPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    loadFavourites();
  }
}

// =========================================================
// Search
// =========================================================
async function searchWeather(city, country) {
  if (State.isSearching || !city) return;
  State.isSearching = true;

  // UI: loading
  const btn = $('searchBtn');
  const btnText = $('searchBtnText');
  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Searching…';

  showHeroState('loading');

  try {
    const params = new URLSearchParams({ city });
    if (country) params.append('country', country.toUpperCase());

    const [wRes, fRes] = await Promise.all([
      fetch(`/api/weather/current?${params}`),
      fetch(`/api/weather/forecast?${params}`)
    ]);

    const wData = await wRes.json();
    const fData = await fRes.json();

    if (!wRes.ok || wData.status !== 'success') {
      throw new Error(wData.message || 'Unable to fetch weather.');
    }

    State.currentCity    = city;
    State.currentCountry = country || wData.data?.country || '';

    renderHeroWeather(wData.data);
    showHeroState('data');

    if (fData.status === 'success') {
      renderForecast(fData.data);
    } else {
      showForecastEmpty(fData.message);
    }

    toast(`Weather loaded for ${wData.data.city}`, 'success');

  } catch (err) {
    showHeroState('error', err.message);
    toast(err.message || 'Search failed.', 'error');
  } finally {
    State.isSearching = false;
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Search';
  }
}

function showHeroState(state, msg) {
  $('heroLoading').classList.toggle('hidden', state !== 'loading');
  $('heroError').classList.toggle('hidden',   state !== 'error');
  $('heroData').classList.toggle('hidden',    state !== 'data');
  $('addFavFromHero').classList.toggle('hidden', state !== 'data');
  if (state === 'error' && msg) $('heroErrorMsg').textContent = msg;
}

function renderHeroWeather(d) {
  const icon2x = d.icon ? `https://openweathermap.org/img/wn/${d.icon}@2x.png` : '';
  const icon1x = d.icon ? `https://openweathermap.org/img/wn/${d.icon}.png`    : '';

  // Hero card
  set('wCityName',     d.city || '—');
  set('wCountryBadge', `, ${d.country || ''}`);
  set('wRegion',       d.country ? `${d.city}, ${d.country}` : d.city);
  set('wTemp',         `${Number(d.temperature_c).toFixed(1)}°C`);
  set('wDesc',         d.description || '—');
  set('wFeels',        `${Number(d.feels_like_c).toFixed(1)}°C`);

  // Hero datetime
  const now = new Date();
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  const hdt = $('heroDatetime');
  if (hdt) hdt.textContent =
    `${now.toLocaleDateString('en-US', opts)} | ${formatAMPM(now)}`;

  // Icons
  setImg('wHeroIcon',   icon2x, d.description || 'Weather');
  setImg('wSmallIcon',  icon1x, '');

  // Stat cards
  set('statFeels',      d.feels_like_c   != null ? Number(d.feels_like_c).toFixed(1)   : '—');
  set('statHumidity',   d.humidity_percent  != null ? d.humidity_percent : '—');
  set('statWind',       d.wind_speed_mps  != null ? Number(d.wind_speed_mps).toFixed(1) : '—');
  set('statPressure',   d.pressure_hpa    != null ? d.pressure_hpa : '—');
  set('statVisibility', d.visibility_m    != null ? (d.visibility_m / 1000).toFixed(1) : '—');
}

// =========================================================
// Forecast
// =========================================================
function renderForecast(data) {
  const container = $('forecastCards');
  if (!container) return;
  container.innerHTML = '';

  // Group by date
  const byDate = {};
  (data.forecast || []).forEach(item => {
    const date = item.forecast_time_utc?.split(' ')[0];
    if (!date) return;
    (byDate[date] = byDate[date] || []).push(item);
  });

  const today = new Date().toISOString().split('T')[0];
  const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  Object.entries(byDate).slice(0, 5).forEach(([date, items], idx) => {
    const noon  = items.find(i => i.forecast_time_utc?.includes('12:00')) || items[Math.floor(items.length / 2)];
    const temps = items.map(i => i.temperature_c).filter(t => t != null);
    const hi    = Math.max(...temps);
    const lo    = Math.min(...temps);
    const pop   = Math.max(...items.map(i => i.precipitation_probability_percent || 0));
    const dateObj = new Date(date + 'T12:00:00');
    const dayName = idx === 0 ? 'Today' : days[dateObj.getDay()];
    const dateStr = `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
    const icon    = noon.icon ? `https://openweathermap.org/img/wn/${noon.icon}@2x.png` : '';

    const card = document.createElement('div');
    card.className = `forecast-day${date === today ? ' today' : ''}`;
    card.setAttribute('role', 'listitem');
    card.innerHTML = `
      <div class="fc-day-name">${dayName}</div>
      <div class="fc-day-date">${dateStr}</div>
      ${icon ? `<img class="fc-icon" src="${icon}" alt="${noon.description || ''}">` : '<div style="height:50px;"></div>'}
      <div class="fc-temps">${Math.round(hi)}°<span class="fc-low"> / ${Math.round(lo)}°</span></div>
      <div class="fc-desc">${noon.description || ''}</div>
      <div class="fc-pop"><i class="bi bi-droplet-fill" style="font-size:.65rem;"></i>${pop}%</div>
    `;
    container.appendChild(card);
  });
}

function showForecastEmpty(msg) {
  const c = $('forecastCards');
  if (c) c.innerHTML = `<div style="padding:24px;color:var(--text-2);font-size:.85rem;">${msg || 'Forecast unavailable.'}</div>`;
}

// =========================================================
// Favourites
// =========================================================
async function loadFavourites() {
  const list = $('favList');
  if (!list) return;

  list.innerHTML = `<div class="panel-empty"><span class="panel-empty-icon">⏳</span><span>Loading…</span></div>`;

  try {
    const r = await fetch('/api/favorites');
    const d = await r.json();
    State.favorites = d.data || [];

    if (!r.ok || d.status !== 'success') {
      list.innerHTML = panelEmpty('⚠️', 'Unable to load favourites.');
      return;
    }

    if (State.favorites.length === 0) {
      list.innerHTML = panelEmpty('⭐', 'No favourites yet. Add a city!');
      // Update count badge
      updateFavCount(0);
      return;
    }

    list.innerHTML = '';
    State.favorites.forEach(fav => list.appendChild(buildFavItem(fav)));
    updateFavCount(State.favorites.length);

    // Load weather for each favourite asynchronously
    State.favorites.forEach(fav => loadFavWeather(fav));

  } catch {
    list.innerHTML = panelEmpty('❌', 'Network error loading favourites.');
  }
}

function panelEmpty(icon, msg) {
  return `<div class="panel-empty"><span class="panel-empty-icon">${icon}</span><p>${msg}</p></div>`;
}

function updateFavCount(n) {
  // Update count shown in sidebar nav
  const navFav = $('nav-favourites');
  if (navFav) {
    const existing = navFav.querySelector('.nav-fav-count');
    if (existing) existing.remove();
    if (n > 0) {
      const badge = document.createElement('span');
      badge.className = 'nav-fav-count';
      badge.style.cssText = 'margin-left:auto;background:rgba(244,63,94,.2);color:#f43f5e;border-radius:10px;padding:1px 7px;font-size:.65rem;font-weight:700;';
      badge.textContent = n;
      navFav.appendChild(badge);
    }
  }
}

function buildFavItem(fav) {
  const item = document.createElement('div');
  item.className = 'fav-item';
  item.dataset.id = fav.id;
  item.setAttribute('role', 'listitem');
  item.innerHTML = `
    <div class="fav-icon-placeholder" style="width:36px;height:36px;border-radius:50%;background:rgba(59,130,246,.12);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;">🏙️</div>
    <div class="fav-info">
      <div class="fav-city">${escHtml(fav.city)}</div>
      <div class="fav-meta">${escHtml(fav.country)}${fav.nickname ? ` | <span class="fav-nickname">${escHtml(fav.nickname)}</span>` : ''}</div>
    </div>
    <div class="fav-temp-block" id="fav-temp-${fav.id}">
      <div class="fav-temp-val">—</div>
      <div class="fav-weather-desc">—</div>
    </div>
    <div class="fav-actions">
      <button class="fav-action-btn fav-edit-btn" title="Edit" onclick="openEditModal(${fav.id})" aria-label="Edit ${escHtml(fav.city)}">
        <i class="bi bi-pencil-fill"></i>
      </button>
      <button class="fav-action-btn fav-del-btn" title="Delete" onclick="confirmDelete(${fav.id})" aria-label="Delete ${escHtml(fav.city)}">
        <i class="bi bi-trash3-fill"></i>
      </button>
    </div>
  `;
  return item;
}

async function loadFavWeather(fav) {
  try {
    const r = await fetch(`/api/weather/current?city=${encodeURIComponent(fav.city)}&country=${fav.country}`);
    const d = await r.json();
    if (!r.ok || d.status !== 'success') return;

    const wd = d.data;
    const block = $(`fav-temp-${fav.id}`);
    if (!block) return;

    block.innerHTML = `
      <div class="fav-temp-val">${Number(wd.temperature_c).toFixed(1)}°C</div>
      <div class="fav-weather-desc">${wd.description || ''}</div>
    `;

    // Also update icon placeholder
    const item = block.closest('.fav-item');
    if (item && wd.icon) {
      const placeholder = item.querySelector('.fav-icon-placeholder');
      if (placeholder) {
        placeholder.outerHTML = `<img class="fav-weather-icon" src="https://openweathermap.org/img/wn/${wd.icon}@2x.png" alt="${wd.description || ''}">`;
      }
    }
  } catch { /* silent – weather data is optional for list display */ }
}

// View weather for favourite
function viewFavCity(id) {
  const fav = State.favorites.find(f => f.id === id);
  if (!fav) return;
  $('cityInput').value    = fav.city;
  $('countryInput').value = fav.country;
  searchWeather(fav.city, fav.country);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  navigateTo('home');
}

// ─── Add Modal ───
function openAddModal() {
  $('favModalTitle').innerHTML = '<i class="bi bi-star-fill" style="color:#f59e0b;"></i> Add Favourite City';
  $('favForm').reset();
  $('favModalError').classList.add('hidden');
  $('favIdInput').value = '';
  State.editingId = null;

  // Pre-fill from current search
  if (State.currentCity)    $('favCityInput').value    = State.currentCity;
  if (State.currentCountry) $('favCountryInput').value = State.currentCountry;

  $('favModal').classList.remove('hidden');
  $('favCityInput').focus();
}

// ─── Edit Modal ───
function openEditModal(id) {
  const fav = State.favorites.find(f => f.id === id);
  if (!fav) { toast('Favourite not found.', 'error'); return; }

  $('favModalTitle').innerHTML = '<i class="bi bi-pencil-fill" style="color:#60a5fa;"></i> Edit Favourite City';
  $('favCityInput').value     = fav.city;
  $('favCountryInput').value  = fav.country;
  $('favNicknameInput').value = fav.nickname || '';
  $('favModalError').classList.add('hidden');
  $('favIdInput').value = fav.id;
  State.editingId = fav.id;

  $('favModal').classList.remove('hidden');
  $('favCityInput').focus();
}

// ─── Save Favourite ───
async function saveFavourite(e) {
  e.preventDefault();

  const city     = $('favCityInput').value.trim();
  const country  = $('favCountryInput').value.trim().toUpperCase();
  const nickname = $('favNicknameInput').value.trim() || null;
  const errEl    = $('favModalError');

  if (!city) { showModalError(errEl, 'City name is required.'); return; }
  if (country.length !== 2 || !/^[A-Z]+$/.test(country)) {
    showModalError(errEl, 'Country must be a 2-letter code (e.g. IN, US).'); return;
  }

  const saveBtn = $('favSaveBtn');
  const origHTML = saveBtn.innerHTML;
  saveBtn.innerHTML = '<span class="spinner-sm"></span> Saving…';
  saveBtn.disabled  = true;
  errEl.classList.add('hidden');

  const isEdit = !!State.editingId;
  const url    = isEdit ? `/api/favorites/${State.editingId}` : '/api/favorites';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, country, nickname })
    });
    const d = await r.json();

    if (!r.ok || d.status !== 'success') {
      showModalError(errEl, d.message || 'Failed to save.');
      return;
    }

    $('favModal').classList.add('hidden');
    toast(isEdit ? 'Favourite updated!' : 'Favourite added!', 'success');
    loadFavourites();

  } catch {
    showModalError(errEl, 'Network error. Please try again.');
  } finally {
    saveBtn.innerHTML = origHTML;
    saveBtn.disabled  = false;
  }
}

// ─── Delete ───
function confirmDelete(id) {
  const fav = State.favorites.find(f => f.id === id);
  if (!fav) return;
  $('confirmCityName').textContent = `${fav.city}, ${fav.country}`;
  $('confirmDeleteBtn').dataset.id = id;
  $('confirmModal').classList.remove('hidden');
}

async function executeDelete(id) {
  const btn = $('confirmDeleteBtn');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="spinner-sm"></span> Deleting…';
  btn.disabled  = true;

  try {
    const r = await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
    const d = await r.json();
    $('confirmModal').classList.add('hidden');

    if (!r.ok || d.status !== 'success') {
      toast(d.message || 'Delete failed.', 'error'); return;
    }

    toast('Favourite removed.', 'success');
    loadFavourites();

  } catch {
    toast('Network error during delete.', 'error');
    $('confirmModal').classList.add('hidden');
  } finally {
    btn.innerHTML = orig;
    btn.disabled  = false;
  }
}

// =========================================================
// World Weather
// =========================================================
const WORLD_CITIES = [
  { city: 'New York', country: 'US', key: 'ny'     },
  { city: 'London',   country: 'GB', key: 'london' },
  { city: 'Tokyo',    country: 'JP', key: 'tokyo'  },
  { city: 'Sydney',   country: 'AU', key: 'sydney' },
];

async function loadWorldWeather() {
  for (const wc of WORLD_CITIES) {
    fetchWorldCity(wc);
  }
}

async function fetchWorldCity({ city, country, key }) {
  try {
    const r = await fetch(`/api/weather/current?city=${encodeURIComponent(city)}&country=${country}`);
    const d = await r.json();
    if (!r.ok || d.status !== 'success') return;

    const wd = d.data;
    const tempEl = $(`world-${key}-temp`);
    const descEl = $(`world-${key}-desc`);
    const iconEl = $(`world-${key}-icon`);

    if (tempEl) tempEl.textContent = `${Number(wd.temperature_c).toFixed(1)}°C`;
    if (descEl) descEl.textContent = wd.description || '';
    if (iconEl && wd.icon) {
      iconEl.src = `https://openweathermap.org/img/wn/${wd.icon}.png`;
      iconEl.alt = wd.description || '';
    }
  } catch { /* silent */ }
}

function loadWorldCity(el) {
  const city    = el.dataset.city;
  const country = el.dataset.country;
  if (!city) return;
  $('cityInput').value    = city;
  $('countryInput').value = country;
  searchWeather(city, country);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =========================================================
// Helpers
// =========================================================
function set(id, text) { const el = $(id); if (el) el.textContent = text; }
function setImg(id, src, alt) { const el = $(id); if (el) { el.src = src; el.alt = alt; } }
function escHtml(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
function showModalError(el, msg) { if (el) { el.textContent = '⚠️ ' + msg; el.classList.remove('hidden'); } }
function formatAMPM(date) {
  const h = date.getHours(), m = date.getMinutes().toString().padStart(2,'0');
  return `${((h % 12) || 12)}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

// =========================================================
// Events
// =========================================================
function setupEvents() {
  // Search
  $('weatherForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const city    = $('cityInput').value.trim();
    const country = $('countryInput').value.trim();
    if (!city) { toast('Please enter a city name.', 'warning'); return; }
    searchWeather(city, country);
  });

  // Theme
  $('dayBtn')?.addEventListener('click',   () => applyTheme('day'));
  $('nightBtn')?.addEventListener('click', () => applyTheme('night'));

  // Nav
  $$('.nav-link-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.section);
      $('sidebar')?.classList.remove('mobile-open');
    });
  });

  // Modals — close button
  $('closeFavModal')?.addEventListener('click',     () => $('favModal').classList.add('hidden'));
  $('cancelFavModal')?.addEventListener('click',    () => $('favModal').classList.add('hidden'));
  $('closeConfirmModal')?.addEventListener('click', () => $('confirmModal').classList.add('hidden'));
  $('cancelConfirmModal')?.addEventListener('click',() => $('confirmModal').classList.add('hidden'));

  // Save favourite
  $('favForm')?.addEventListener('submit', saveFavourite);
  $('favSaveBtn')?.addEventListener('click', () => {
    $('favForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });

  // Confirm delete
  $('confirmDeleteBtn')?.addEventListener('click', e => {
    executeDelete(Number(e.currentTarget.dataset.id));
  });

  // Close modal on backdrop click
  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      $$('.modal-overlay').forEach(m => m.classList.add('hidden'));
    }
  });

  // Sidebar mobile
  initSidebar();
}

// =========================================================
// Init
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEvents();
  updateClock();
  setInterval(updateClock, 30000);

  // Set default city
  $('cityInput').value    = 'Vijayawada';
  $('countryInput').value = 'IN';

  // Initial data load
  searchWeather('Vijayawada', 'IN');
  loadFavourites();
  loadWorldWeather();

  navigateTo('home');
});
