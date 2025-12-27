const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const volume = document.getElementById('volume');
const loop = document.getElementById('loop');
const progress = document.getElementById('progress');
const progressBar = document.getElementById('progress-bar');
const currentEl = document.getElementById('current');
const durationEl = document.getElementById('duration');
const status = document.getElementById('status');
const sourceSelect = document.getElementById('sourceSelect');
const sourceName = document.getElementById('sourceName');
const themeToggle = document.getElementById('themeToggle');

let currentObjectUrl = null;

// Theme toggle
function applyTheme(isDark) {
  if (isDark) {
    document.body.classList.add('dark');
    themeToggle.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark');
    themeToggle.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  }
}

const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDark = savedTheme === 'dark' || (savedTheme === null && prefersDark);
applyTheme(isDark);

themeToggle.addEventListener('click', () => {
  const isDarkNow = document.body.classList.contains('dark');
  applyTheme(!isDarkNow);
});

// Inline external SVG images (e.g., <img src="logo.svg" class="logo">) so they become true inline SVGs
// and inherit page CSS variables (allowing the manual .dark toggle to change colors).
async function inlineSVGImages(selector = 'img.logo') {
  const imgs = Array.from(document.querySelectorAll(selector));
  for (const img of imgs) {
    try {
      const resp = await fetch(img.getAttribute('src'));
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) continue;
      // Remove internal styles so the page's CSS (e.g. --fg) controls the svg color.
      svg.querySelectorAll('style').forEach(s => s.remove());
      // Ensure the SVG has the same identifying attributes so existing CSS applies.
      svg.classList.add('logo');
      if (img.id) svg.id = img.id;
      if (img.alt && !svg.getAttribute('aria-label')) svg.setAttribute('aria-label', img.alt);
      // Preserve intrinsic size attributes if present on the img.
      if (img.width) svg.setAttribute('width', img.width);
      if (img.height) svg.setAttribute('height', img.height);
      // Replace the <img> with the parsed <svg>
      img.replaceWith(svg);
    } catch (err) {
      console.error('Failed to inline SVG', img.getAttribute('src'), err);
    }
  }
}

// Run once at load to inline any external logos so they follow the site's theme toggle.
inlineSVGImages();

// Temporary on-screen hint utility (used by keyboard shortcuts and actions)
const hintEl = document.getElementById('hint');
let _hintTimeout = null;
function showHint(text, ms = 1400){
  if (!hintEl) return;
  hintEl.textContent = text;
  hintEl.setAttribute('aria-hidden', 'false');
  hintEl.classList.add('visible');
  if (_hintTimeout) clearTimeout(_hintTimeout);
  _hintTimeout = setTimeout(()=>{
    hintEl.classList.remove('visible');
    hintEl.setAttribute('aria-hidden', 'true');
    _hintTimeout = null;
  }, ms);
}

// Initialize
audio.volume = volume.value / 100;
loop.checked = audio.loop;
// Use the attribute source (relative path) when available so we match the select options exactly
sourceName.textContent = (audio.getAttribute('src') || audio.src).split('/').pop();

if (sourceSelect) {
  // Initialize select to match current audio src by filename (so relative or absolute URLs work)
  const attrSrc = audio.getAttribute('src') || '';
  const audioName = attrSrc.split('/').pop() || '';
  let matched = false;
  for (const opt of Array.from(sourceSelect.options)){
    if (opt.value.split('/').pop() === audioName){
      sourceSelect.value = opt.value;
      matched = true;
      break;
    }
  }
  // If no match, default to the first option and update the audio src accordingly
  if (!matched && sourceSelect.options.length){
    sourceSelect.value = sourceSelect.options[0].value;
    audio.src = sourceSelect.value;
    sourceName.textContent = sourceSelect.options[0].value.split('/').pop();
  }

  sourceSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    // Revoke any previous object URL (if present)
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
    audio.src = val;
    const name = val.split('/').pop();
    sourceName.textContent = name;
    audio.load();
    // Do not autoplay when switching tracks; pause and reset the play button
    audio.pause();
    playBtn.textContent = 'Play';
    status.textContent = `Loaded ${name}`;
    showHint(`Loaded: ${name}`);

    // Quick runtime format support check — helps distinguish codec issues from autoplay blocks
    try {
      const lower = name.toLowerCase();
      let mime = '';
      if (lower.endsWith('.m4a') || lower.endsWith('.mp4')) mime = 'audio/mp4';
      else if (lower.endsWith('.aac')) mime = 'audio/aac';
      else if (lower.endsWith('.mp3')) mime = 'audio/mpeg';
      if (mime && typeof audio.canPlayType === 'function') {
        const support = audio.canPlayType(mime);
        if (!support) {
          status.textContent = `Loaded ${name} — browser may not support this format (${mime}).`;
          showHint('Unsupported format');
        } else {
          // support === 'maybe' or 'probably' — show a subtle info in the console
          console.info(`canPlayType(${mime}) -> ${support}`);
        }
      }
    } catch (err) {
      console.warn('Error checking format support', err);
    }
  });
}

function formatTime(t){
  if (!isFinite(t)) return '0:00';
  const m = Math.floor(t/60);
  const s = Math.floor(t%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

// Play / Pause
playBtn.addEventListener('click', async () => {
  if (audio.paused){
    try{
      await audio.play();
      playBtn.textContent = 'Pause';
      status.textContent = 'Playing';
      showHint('Playing');
    }catch(err){
      // Log the real error for debugging and show a clearer status to the user
      console.error('Playback error', err);
      status.textContent = `Playback error: ${err && err.name ? err.name : 'Error'} ${err && err.message ? '- ' + err.message : ''}`;
      showHint('Play blocked');
    }
  } else {
    audio.pause();
    playBtn.textContent = 'Play';
    status.textContent = 'Paused';
    showHint('Paused');
  }
});

// Volume control
volume.addEventListener('input', () => {
  audio.volume = volume.value / 100;
});

// Loop control
loop.addEventListener('change', () => {
  audio.loop = loop.checked;
});

// Progress updates
audio.addEventListener('timeupdate', () => {
  if (!isFinite(audio.duration)) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  progressBar.style.width = pct + '%';
  currentEl.textContent = formatTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('ended', () => {
  if (!audio.loop){
    playBtn.textContent = 'Play';
    status.textContent = 'Ended';
  }
});

// Seek on click
progress.addEventListener('click', (e) => {
  const rect = progress.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const pct = x / rect.width;
  if (isFinite(audio.duration)) audio.currentTime = pct * audio.duration;
});

// Show buffering state
audio.addEventListener('waiting', () => status.textContent = 'Buffering...');
audio.addEventListener('playing', () => status.textContent = 'Playing');
audio.addEventListener('pause', () => status.textContent = 'Paused');

// Report media errors (decode/format/network) with a helpful message
audio.addEventListener('error', () => {
  const err = audio.error;
  if (!err) return;
  let msg = '';
  switch (err.code){
    case 1: msg = 'Media playback aborted.'; break;
    case 2: msg = 'Network error while fetching media.'; break;
    case 3: msg = 'Decoding error — possibly unsupported format or corrupted file.'; break;
    case 4: msg = 'Media format not supported by the browser.'; break;
    default: msg = 'Unknown media error.';
  }
  const more = err.message ? ` (${err.message})` : '';
  status.textContent = `Audio error: ${msg}${more} (code ${err.code})`;
  console.error('Audio element error', err);
  showHint('Audio error');
});

// Helpful keyboard shortcuts
function adjustVolume(deltaPercent){
  if (!volume) return;
  let val = parseInt(volume.value, 10) || 0;
  val = Math.min(100, Math.max(0, val + deltaPercent));
  volume.value = val;
  audio.volume = val / 100;
  status.textContent = `Volume: ${val}%`;
  showHint(`Volume: ${val}%`);
}

function nextTrack(){
  if (!sourceSelect) return;
  const opts = Array.from(sourceSelect.options);
  if (!opts.length) return;
  const idx = sourceSelect.selectedIndex;
  const next = (idx + 1) % opts.length;
  sourceSelect.selectedIndex = next;
  sourceSelect.dispatchEvent(new Event('change'));
}

function prevTrack(){
  if (!sourceSelect) return;
  const opts = Array.from(sourceSelect.options);
  if (!opts.length) return;
  const idx = sourceSelect.selectedIndex;
  const prev = (idx - 1 + opts.length) % opts.length;
  sourceSelect.selectedIndex = prev;
  sourceSelect.dispatchEvent(new Event('change'));
}

window.addEventListener('keydown', (e) => {
  // Ignore when typing into form controls or when modifier keys are used
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = (e.target && e.target.tagName) || '';
  if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;

  switch (e.code){
    case 'Space':
      e.preventDefault();
      playBtn.click();
      break;
    case 'ArrowUp':
      e.preventDefault();
      adjustVolume(5);
      break;
    case 'ArrowDown':
      e.preventDefault();
      adjustVolume(-5);
      break;
    case 'ArrowRight':
      e.preventDefault();
      nextTrack();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      prevTrack();
      break;
    default:
      break;
  }
});
