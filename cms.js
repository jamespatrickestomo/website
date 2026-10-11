// ══════════════════════════════════════════════════════════════
// cms.js — Local CMS bridge
// Fetches content collections from the backend API (instead of
// localStorage) so edits made in the Admin Console show up on
// the public site. Keeps the same cmsGetCollection(key) contract
// that portal.js already relies on, so portal.js needs no changes.
// ══════════════════════════════════════════════════════════════

const CMS_API_ORIGIN = (location.protocol === 'file:' || (location.port && location.port !== '3000'))
  ? 'http://localhost:3000'
  : '';

let _cmsCache = {};
let _cmsSettings = {};
let _cmsLoaded = false;

function cmsGetCollection(key) {
  // Archived records (set from the Admin Console) are kept in the database
  // for possible restore, but should never be shown on the public site.
  return (_cmsCache[key] || []).filter(r => !r.archived);
}

// Same as above but INCLUDING archived records. Used only for News and
// Announcements, whose archived items stay publicly readable in the
// "Recently Archived" / News Archive views instead of disappearing.
function cmsGetCollectionAll(key) {
  return (_cmsCache[key] || []).slice();
}

function cmsGetSetting(key) {
  return _cmsSettings[key] || '';
}

async function cmsLoadAll() {
  try {
    const res = await fetch(`${CMS_API_ORIGIN}/api/collections`);
    if (!res.ok) throw new Error('Failed to load content.');
    _cmsCache = await res.json();
    _cmsLoaded = true;
  } catch (e) {
    // Backend unreachable — keep whatever was previously cached
    // (empty on first load) rather than breaking the page.
    console.warn('cms.js: could not reach the content API, showing cached/empty content.', e);
  }
  try {
    const res2 = await fetch(`${CMS_API_ORIGIN}/api/settings`);
    if (res2.ok) _cmsSettings = await res2.json();
  } catch (e) {
    console.warn('cms.js: could not reach the settings API.', e);
  }
  window.dispatchEvent(new Event('cms:updated'));
}

// Initial load
cmsLoadAll();

// Poll periodically so edits made in the Admin Console (even from a
// different browser/device) show up without a manual page refresh.
setInterval(cmsLoadAll, 20000);

// Refresh immediately when the tab regains focus.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') cmsLoadAll();
});
