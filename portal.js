// ── CMS-DRIVEN CONTENT (announcements, news, officials, tourism) ──
function esc(v) {
  return String(v || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtNewsDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return esc(iso);
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

const THUMB_GRADIENTS = [
  'linear-gradient(135deg,#1a4a2e,#0d2b1a)',
  'linear-gradient(135deg,#4a1a1a,#2b0d0d)',
  'linear-gradient(135deg,#3a2a1a,#1a140d)',
  'linear-gradient(135deg,#1a2a4a,#0d1530)',
  'linear-gradient(135deg,#2a1a4a,#150d30)'
];

function newsImgStyle(item, i) {
  return item.image
    ? `background-image:url('${esc(item.image)}');background-size:cover;background-position:center;background-repeat:no-repeat;`
    : `background:${THUMB_GRADIENTS[i % THUMB_GRADIENTS.length]}`;
}

// Deterministic accent color for a category/tag string, so any category or
// tag typed in Admin gets a consistent, readable colored badge without
// needing to hardcode a color per name.
function tagColor(str) {
  const s = String(str || '').trim();
  if (!s) return 'var(--navy)';
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 52%, 34%)`;
}



function renderAnnouncementsTicker() {
  const el = document.getElementById('announcementTicker');
  if (!el) return;
  const items = cmsGetCollection('announcements');
  if (!items.length) { el.innerHTML = ''; return; }
  const line = items.map(a => `${esc(a.tag)}: ${esc(a.title || a.text)}`).join(' &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; ');
  // duplicate for seamless scrolling loop
  el.innerHTML = line + ' &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; ' + line;
}

let homeNewsSlideIdx = 0;
let homeNewsSlideCount = 0;

function renderHomeLatestNews() {
  const track = document.getElementById('homeNewsSliderTrack');
  const dotsEl = document.getElementById('homeNewsSliderDots');
  if (!track || !dotsEl) return;
  const items = sortedPublishedNews().slice(0, 8);
  homeNewsSlideCount = items.length;
  homeNewsSlideIdx = 0;

  if (!items.length) {
    track.innerHTML = '<div class="news-slide"><div class="news-slide-empty">No current news right now. <a href="#news/archive" onclick="openNewsArchive();return false;" style="color:var(--gold);text-decoration:underline;">Browse Recently Archived news</a>.</div></div>';
    dotsEl.innerHTML = '';
    track.style.transform = 'translateX(0)';
    return;
  }

  track.innerHTML = items.map(item => `
    <div class="news-slide" onclick="openNewsArticle('${jsStr(item.id)}')">
      ${item.image
        ? `<img src="${esc(item.image)}" alt="${esc(item.title)}" onerror="this.remove()">`
        : `<div class="news-slide-fallback"><i class="fa fa-newspaper"></i></div>`}
      <span class="news-slide-tag" style="background:${tagColor(item.category || 'News')}">${esc((item.category || 'News').toUpperCase())}</span>
      <div class="news-slide-caption">
        <div class="news-slide-date">${fmtNewsDate(item.date)}</div>
        <div class="news-slide-title">${esc(item.title)}</div>
        ${item.excerpt ? `<div class="news-slide-desc">${esc(item.excerpt)}</div>` : ''}
      </div>
    </div>`).join('');

  dotsEl.innerHTML = items.map((_, i) =>
    `<button class="news-slider-dot${i === 0 ? ' active' : ''}" onclick="newsSliderGoTo(${i})" aria-label="Slide ${i + 1}"></button>`
  ).join('');

  updateNewsSliderPosition();
}

// Homepage — top 3 active announcements, reusing the same card markup/CSS
// built for the News & Events page (.ann-card / .ann-grid) and the same
// full-page detail view (openAnnouncementArticle).
function renderHomeAnnouncements() {
  const el = document.getElementById('homeAnnouncementsGrid');
  if (!el) return;
  const items = sortedActiveAnnouncements().slice(0, 3);
  if (!items.length) { el.innerHTML = '<p class="nw-empty">No announcements posted yet.</p>'; return; }
  el.innerHTML = items.map(a => `
    <div class="ann-card">
      <div class="ann-card-top">
        <span class="ann-tag" style="background:${tagColor(a.tag || 'Notice')}">${esc(a.tag || 'Notice')}</span>
        ${a.date ? `<span class="ann-date">${fmtNewsDate(a.date)}</span>` : ''}
      </div>
      <h3 class="ann-title">${esc(a.title || a.tag || 'Announcement')}</h3>
      <p class="ann-excerpt">${esc(a.text || '')}</p>
      <a href="#" class="ann-readmore" onclick="openAnnouncementArticle('${jsStr(a.id)}');return false;">Read More <i class="fa fa-chevron-right"></i></a>
    </div>`).join('');
}

// Homepage — "Mayor's Corner": the Mayor's photo/name come from Admin →
// Officials automatically; the welcome message and hashtag are edited in
// Admin → Site Settings → Mayor's Corner.
function renderMayorCorner() {
  const el = document.getElementById('mayorCornerCard');
  if (!el) return;

  const officials = cmsGetCollection('officials');
  const mayor = officials.find(o => /mayor/i.test(o.position || '') && !/vice/i.test(o.position || ''));

  const rawMessage = cmsGetSetting('mayorCornerMessage').trim() ||
    'Welcome to the Municipality of Cortes!\n\nOur administration is committed to transparent, accountable, and people-centered governance — delivering quality public services and building a more progressive Cortes for every resident.\n\nJoin us in this journey. Together, we can build a more dynamic, peaceful, and responsive Cortes community.';
  const paragraphs = rawMessage.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const hashtag = cmsGetSetting('mayorCornerHashtag').trim();

  const photo = mayor && mayor.photo
    ? `<img src="${esc(mayor.photo)}" alt="${esc(mayor.name)}" onerror="this.parentElement.innerHTML='<i class=\\'fa fa-user-tie\\'></i>'">`
    : `<i class="fa fa-user-tie"></i>`;
  const mayorName = mayor ? mayor.name : 'Municipal Mayor';

  el.innerHTML = `
    <div class="mc-photo">${photo}</div>
    <div class="mc-body">
      <div class="mc-eyebrow">Mayor's Corner</div>
      <div class="mc-quote">
        ${paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}
      </div>
      <div class="mc-name">${esc(mayorName)}</div>
      <div class="mc-title">Municipal Mayor</div>
      ${hashtag ? `<div class="mc-hashtag">${esc(hashtag)}</div>` : ''}
    </div>`;
}

function newsSliderGo(delta) {
  if (!homeNewsSlideCount) return;
  homeNewsSlideIdx = (homeNewsSlideIdx + delta + homeNewsSlideCount) % homeNewsSlideCount;
  updateNewsSliderPosition();
}
function newsSliderGoTo(i) {
  homeNewsSlideIdx = i;
  updateNewsSliderPosition();
}
function updateNewsSliderPosition() {
  const track = document.getElementById('homeNewsSliderTrack');
  if (track) track.style.transform = `translateX(-${homeNewsSlideIdx * 100}%)`;
  document.querySelectorAll('#homeNewsSliderDots .news-slider-dot').forEach((d, i) => {
    d.classList.toggle('active', i === homeNewsSlideIdx);
  });
}

// ── NEWS PAGE: filter bar + paginated card grid ──
let newsCurrentPage = 1;
const NEWS_PAGE_SIZE = 9;



function renderNewsGrid(items) {
  const el = document.getElementById('newsPageGrid');
  if (!el) return;
  if (!items.length) { el.innerHTML = '<p class="nw-empty">No news found.</p>'; return; }
  el.innerHTML = items.map((item, i) => `
    <div class="nw-card">
      <div class="nw-thumb" style="${newsImgStyle(item, i)}">
        <span class="nw-tag" style="background:${tagColor(item.category || 'News')}">${esc((item.category || 'News').toUpperCase())}</span>
      </div>
      <div class="nw-body">
        <div class="nw-date">${item.date ? fmtNewsDate(item.date) : ''}</div>
        <h3 class="nw-title">${esc(item.title)}</h3>
        <p class="nw-excerpt">${esc(item.excerpt || '')}</p>
        <a href="#" class="nw-readmore" onclick="openNewsArticle('${jsStr(item.id)}');return false;">Read More <i class="fa fa-chevron-right"></i></a>
      </div>
    </div>`).join('');
}

function renderNewsPagination(totalCount, totalPages) {
  const el = document.getElementById('newsPagination');
  if (!el) return;
  if (!totalCount) { el.innerHTML = ''; return; }

  let startPage = Math.max(1, newsCurrentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  startPage = Math.max(1, endPage - 4);

  let html = `<button class="np-btn" ${newsCurrentPage === 1 ? 'disabled' : ''} onclick="newsGoPage(${newsCurrentPage - 1})">Prev</button>`;
  for (let p = startPage; p <= endPage; p++) {
    html += `<button class="np-btn${p === newsCurrentPage ? ' active' : ''}" onclick="newsGoPage(${p})">${p}</button>`;
  }
  html += `<button class="np-btn" ${newsCurrentPage === totalPages ? 'disabled' : ''} onclick="newsGoPage(${newsCurrentPage + 1})">Next</button>`;

  const shownStart = (newsCurrentPage - 1) * NEWS_PAGE_SIZE + 1;
  const shownEnd = Math.min(newsCurrentPage * NEWS_PAGE_SIZE, totalCount);
  html += `<span class="np-count">Showing ${shownEnd - shownStart + 1} of ${totalCount} news</span>`;

  el.innerHTML = html;
}

function newsGoPage(p) {
  newsCurrentPage = p;
  applyNewsFilters();
  const grid = document.getElementById('newsPageGrid');
  if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── ANNOUNCEMENTS: card grid on the News & Events page, right after News ──

// ── SHARED "READ MORE" MODAL (used by both News and Announcement cards) ──
function openReadMoreModal(opts) {
  const imgEl = document.getElementById('rmModalImage');
  if (opts.image) {
    imgEl.style.display = '';
    imgEl.style.backgroundImage = `url('${opts.image}')`;
  } else {
    imgEl.style.display = 'none';
    imgEl.style.backgroundImage = '';
  }
  const tagEl = document.getElementById('rmModalTag');
  tagEl.textContent = opts.tag || '';
  tagEl.style.background = opts.tagColor || tagColor(opts.tag || '');
  tagEl.style.display = opts.tag ? '' : 'none';
  const dateEl = document.getElementById('rmModalDate');
  dateEl.textContent = opts.date || '';
  dateEl.style.display = opts.date ? '' : 'none';
  document.getElementById('rmModalTitle').textContent = opts.title || '';
  document.getElementById('rmModalText').textContent = opts.text || '';
  document.getElementById('readMoreModal').classList.add('open');
}
function closeReadMoreModal() {
  document.getElementById('readMoreModal').classList.remove('open');
}
function openNewsArticle(id) {
  const item = cmsGetCollectionAll('news').find(n => n.id === id);
  const body = document.getElementById('newsArticleBody');
  if (!body) return;

  if (!item) {
    body.innerHTML = '<p style="color:var(--muted)">Article not found.</p>';
  } else {
    const bodyText = (item.body && item.body.trim()) ? item.body : (item.excerpt || '');
    const imgStyle = item.image
      ? `background-image:url('${esc(item.image)}')`
      : `background:${THUMB_GRADIENTS[0]}`;
    body.innerHTML = `
      <div class="nwart-layout">
        <div class="nwart-main">
          <div class="nwart-meta">
            ${item.author ? `<span>Article By: <strong>${esc(item.author)}</strong></span>` : '<span></span>'}
            ${item.date ? `<span>Date Posted: <strong>${fmtNewsDate(item.date)}</strong></span>` : ''}
          </div>
          <h1 class="nwart-title">${esc(item.title)}</h1>
          <div class="nwart-body">${esc(bodyText).split(/\n{2,}|\n/).filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')}</div>
        </div>
        <div class="nwart-side">
          <div class="nwart-side-card">
            <div class="nwart-side-img" style="${imgStyle}" onclick="openImgLightbox('${jsStr(item.image || '')}')">
              ${item.category ? `<span class="nw-tag" style="background:${tagColor(item.category)}">${esc(item.category.toUpperCase())}</span>` : ''}
            </div>
            <div class="nwart-side-title">${esc(item.title.length > 44 ? item.title.slice(0, 44) + '…' : item.title)}</div>
          </div>
        </div>
      </div>`;
  }

  showPage('news-article', { hash: 'news/' + id });
}

function openAnnouncementArticle(id) {
  const item = cmsGetCollectionAll('announcements').find(a => a.id === id);
  const body = document.getElementById('annArticleBody');
  if (!body) return;

  if (!item) {
    body.innerHTML = '<p style="color:var(--muted)">Announcement not found.</p>';
  } else {
    const paras = esc(item.text || '').split(/\n{2,}|\n/).filter(p => p.trim());
    const firstPara = paras[0] || '';
    const restParas = paras.slice(1);
    const hasDoc = !!item.docUrl;

    body.innerHTML = `
      <div class="annart-layout${hasDoc ? '' : ' annart-layout--solo'}">
        <div class="annart-main">
          <div class="annart-card">
            <div class="annart-top">
              <span class="ann-tag annart-badge" style="background:${tagColor(item.tag || 'Notice')}">${esc(item.tag || 'Notice')}</span>
              ${item.date ? `<span class="annart-date">${fmtNewsDate(item.date)}</span>` : ''}
            </div>
            <h1 class="annart-title">${esc(item.title || item.tag || 'Announcement')}</h1>
            <hr class="annart-rule">
            ${firstPara ? `<p>${firstPara}</p>` : ''}
          </div>
          ${restParas.length ? `<div class="annart-card">${restParas.map(p => `<p>${p}</p>`).join('')}</div>` : ''}
        </div>
        ${hasDoc ? `
        <div class="annart-side">
          <div class="annart-doc-card">
            <div class="annart-doc-head"><i class="fa fa-file-lines"></i> OFFICIAL DOCUMENT PREVIEW</div>
            <div class="annart-doc-frame"><iframe src="${esc(item.docUrl)}" title="Official document preview"></iframe></div>
          </div>
        </div>` : ''}
      </div>`;
  }

  showPage('announcement-detail', { hash: 'announcement/' + id });
}

// ── PROJECTS PAGE: stat counters + card grid, image lightbox, and the shared "Read More" modal for full summaries ──



function openImgLightbox(url) {
  if (!url) return;
  document.getElementById('imgLightboxImg').src = url;
  document.getElementById('imgLightbox').classList.add('open');
}
function closeImgLightbox() {
  document.getElementById('imgLightbox').classList.remove('open');
  document.getElementById('imgLightboxImg').src = '';
}

function officialRank(position) {
  const p = (position || '').toLowerCase();
  if (p.includes('mayor')) return { label: p.includes('vice') ? 'Executive' : 'Executive', lead: true };
  if (p.includes('councilor') || p.includes('sangguniang') || p.includes('sb ')) return { label: 'Legislative', lead: false };
  return { label: 'Official', lead: false };
}

function officialCardHtml(o) {
  const rank = officialRank(o.position);
  const photoImg = o.photo
    ? `<img src="${esc(o.photo)}" alt="${esc(o.name)}" onerror="this.closest('.official-photo').classList.add('official-photo--empty');this.remove()">`
    : '';
  return `
    <div class="official-card${rank.lead ? ' official-card--lead' : ''}">
      <div class="official-photo${photoImg ? '' : ' official-photo--empty'}">
        ${photoImg}
        <i class="fa fa-user official-photo-fallback"></i>
        <span class="official-rank">${esc(rank.label)}</span>
        <div class="official-plate">
          <div class="official-name">${esc(o.name)}</div>
          <div class="official-pos">${esc(o.position)}</div>
        </div>
      </div>
    </div>`;
}

function renderOfficialsEverywhere() {
  const all = cmsGetCollection('officials');
  const previewHtml = all.map(officialCardHtml).join('');
  ['homeOfficialsGrid', 'lguOfficialsGrid'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = previewHtml;
  });
  renderOfficialsSpotlight(all);
  renderOfficialsPageGrid(all);
}

// Municipal Officials page — Mayor & Vice Mayor spotlight at the top, mirrored
// left/right, with a description pulled from the official's "Description / Bio"
// field in Admin. Falls back to a generic line if no bio has been written yet.
function renderOfficialsSpotlight(all) {
  const el = document.getElementById('officialsSpotlight');
  if (!el) return;
  const officials = all || cmsGetCollection('officials');
  const mayor = officials.find(o => /mayor/i.test(o.position) && !/vice/i.test(o.position));
  const vice = officials.find(o => /vice/i.test(o.position));

  function spotlightBlock(person, eyebrow, fallbackDesc, reverse) {
    if (!person) return '';
    const photo = person.photo
      ? `<img src="${esc(person.photo)}" alt="${esc(person.name)}" onerror="this.parentElement.innerHTML='<i class=\\'fa fa-user-tie\\'></i>'">`
      : `<i class="fa fa-user-tie"></i>`;
    const desc = person.description ? esc(person.description) : fallbackDesc;
    return `
      <div class="off-spotlight${reverse ? ' off-spotlight--reverse' : ''}">
        <div class="off-spotlight-photo">${photo}</div>
        <div class="off-spotlight-body">
          <div class="off-spotlight-eyebrow">${esc(eyebrow)}</div>
          <div class="off-spotlight-name">${esc(person.name)}</div>
          <p class="off-spotlight-desc">${desc}</p>
        </div>
      </div>`;
  }

  el.innerHTML =
    spotlightBlock(mayor, 'The Municipal Mayor',
      'The chief executive of the Municipality of Cortes, responsible for the overall administration and governance of the municipality and its 14 barangays.', false) +
    spotlightBlock(vice, 'The Municipal Vice Mayor',
      'Presides over sessions of the Sangguniang Bayan and assists the Mayor in the governance of the municipality.', true);
}

// Municipal Officials page — Sangguniang Bayan card grid: circular photo,
// name, and position, matching the compact side-by-side card layout. The
// Mayor and Vice Mayor are excluded here since they get their own spotlight
// section above (see renderOfficialsSpotlight).
function renderOfficialsPageGrid(all) {
  const el = document.getElementById('officialsPageGrid');
  if (!el) return;
  const officials = (all || cmsGetCollection('officials')).filter(o => !/mayor/i.test(o.position || ''));
  if (!officials.length) { el.innerHTML = '<p style="color:var(--muted)">No officials added yet.</p>'; return; }
  el.innerHTML = officials.map(o => {
    const photo = o.photo
      ? `<img src="${esc(o.photo)}" alt="${esc(o.name)}" onerror="this.remove()">`
      : `<i class="fa fa-user"></i>`;
    return `
      <div class="pin-official-card">
        <div class="pin-official-photo">${photo}</div>
        <div class="pin-official-body">
          <div class="pin-official-name">${esc(o.name)}</div>
          <ul class="pin-official-info"><li>${esc(o.position)}</li></ul>
        </div>
      </div>`;
  }).join('');
}

// Departments & Offices page — "Meet Your Department Heads" card grid, reusing
// the same card markup/CSS as the officials grid above. Pulls from the
// Departments collection (Admin → Departments): only records with a Head
// name filled in show up here; a photo is optional.
// Departments & Offices page — simple logo + name grid, replacing the old
// static filterable card layout. Every record in Admin → Departments shows
// up here automatically; a missing logo falls back to a plain icon instead
// of breaking or showing nothing.

// Governance page — "Meet Your Department Heads" card grid, reusing the same
// card markup/CSS as the officials grid. Pulls from the Departments
// collection (Admin → Departments): only records with a Head name filled in
// show up here; a photo is optional.
function renderDepartmentHeads() {
  const el = document.getElementById('departmentHeadsGrid');
  if (!el) return;
  const heads = cmsGetCollection('departments').filter(d => (d.head || '').trim());
  if (!heads.length) { el.innerHTML = '<p style="color:var(--muted)">No department heads added yet.</p>'; return; }
  el.innerHTML = heads.map(d => {
    const photo = d.headPhoto
      ? `<img src="${esc(d.headPhoto)}" alt="${esc(d.head)}" onerror="this.remove()">`
      : `<i class="fa fa-user"></i>`;
    return `
      <div class="pin-official-card">
        <div class="pin-official-photo">${photo}</div>
        <div class="pin-official-body">
          <div class="pin-official-name">${esc(d.head)}</div>
          <ul class="pin-official-info"><li>${esc(d.name)}</li></ul>
        </div>
      </div>`;
  }).join('');
}


// Google Maps link for a tourism spot: uses the admin-provided exact link if
// set, otherwise falls back to a name-based Maps search so every spot still
// gets a reasonable destination even before an exact link is added.
function tourismMapUrl(spot) {
  const url = (spot.mapUrl || '').trim();
  if (url) return url;
  const q = encodeURIComponent(`${spot.name || ''}, Cortes, Bohol, Philippines`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function tourCardHtml(s, i) {
  const mapUrl = tourismMapUrl(s);
  const imgStyle = s.image
    ? `background-image:url('${esc(s.image)}')`
    : `background:${THUMB_GRADIENTS[i % THUMB_GRADIENTS.length]}`;
  return `
    <div class="tour-card">
      <a class="tour-card-img" href="${esc(mapUrl)}" target="_blank" rel="noopener" style="${imgStyle}" title="Open ${esc(s.name)} in Google Maps" aria-label="View ${esc(s.name)} on Google Maps"></a>
      <div class="tour-card-body">
        ${s.type ? `<div class="tour-card-cat">${esc(s.type.toUpperCase())}</div>` : ''}
        <h3 class="tour-card-title">${esc(s.name)}</h3>
        <p class="tour-card-desc">${esc(s.description || '')}</p>
        <a class="tour-card-link" href="${esc(mapUrl)}" target="_blank" rel="noopener">View Directions <i class="fa fa-arrow-right"></i></a>
      </div>
    </div>`;
}


// Homepage — featured tourism spots, right after Mayor's Corner. Reuses the
// same card markup/CSS as the full Tourism page, capped to a handful of
// spots with a "View All" link to the complete page.
function renderHomeTourismSpots() {
  const el = document.getElementById('homeTourismGrid');
  if (!el) return;
  const items = cmsGetCollection('tourism').slice(0, 3);
  el.innerHTML = items.length
    ? items.map((s, i) => tourCardHtml(s, i)).join('')
    : '<p style="color:rgba(255,255,255,.6);text-align:center;">No tourist spots added yet.</p>';
}

// ── Homepage "Discover Cortes" carousel — same visuals as the Tourism page's
// carousel, but its own independent state/DOM targets since both can exist
// in the page at the same time (only one .page is visible, but all are in the DOM). ──
// ── ANNUAL BUDGET DOCUMENTS (Annual Budget page) ──
// Accordion categories used to be a fixed list matching a dropdown in Admin.
// Admin now types the category freely, so the accordion is built dynamically
// from whatever categories actually exist in the data — a brand-new category
// gets its own section automatically, with no code change needed. Known
// categories keep a stable, familiar order; any new ones are appended after
// them in the order they were first added. "Quarterly Updates" is handled
// separately below as a plain (non-collapsible) list, not part of this accordion.
const BUDGET_KNOWN_ORDER = ['Annual Budget Report', 'SIPB', 'Statement of Receipts and Expenditures', 'Annual Procurement Plan', 'GAD Accomplishment Report'];
const BUDGET_QUARTERLY_CATEGORY = 'Quarterly Updates';

function budgetDocListHtml(docs) {
  if (!docs.length) return '<li style="color:var(--muted)">No documents posted yet.</li>';
  return docs.map((d, j) => {
    const fname = d.fileName || (esc(d.title).replace(/\s+/g, '-') + '.pdf');
    const url = d.docUrl || '';
    const ownerName = officeNameOf(d);
    const titleHtml = `<span class="yu-doc-title"><i class="fa fa-file-pdf"></i> ${esc(d.title)}${ownerName ? `<span class="yu-doc-office">Source: ${esc(ownerName)}${d.year ? ' · FY ' + esc(d.year) : ''}</span>` : ''}</span>`;
    const actionsHtml = url
      ? `<div class="yu-doc-actions">
          <button type="button" class="yu-btn-preview" onclick="previewPdfDoc('${jsStr(url)}', '${jsStr(d.title)}')">
            <i class="fa fa-eye"></i> Preview
          </button>
          <a class="yu-btn-download" href="${esc(url)}" download="${esc(fname)}" target="_blank" rel="noopener">
            <i class="fa fa-download"></i> Download
          </a>
        </div>`
      : `<span class="yu-doc-missing">Not uploaded yet</span>`;
    return `<li class="yu-doc-row${j === 0 ? ' yu-latest' : ''}">${titleHtml}${actionsHtml}</li>`;
  }).join('');
}

function renderBudgetPage() {
  const wrap = document.getElementById('budgetAccordion');
  const quarterlyWrap = document.getElementById('quarterlyPanel');
  if (!wrap && !quarterlyWrap) return;
  const items = cmsGetCollection('budget');

  const docsFor = cat => items
    .filter(d => ((d.category || '').trim() || 'Uncategorized') === cat)
    .slice()
    .sort((a, b) => (b.year || '') - (a.year || ''));

  // ── Yearly Updates: flat list of category links, each opening a popup with that category's documents ──
  if (wrap) {
    const dataCats = [];
    items.forEach(d => {
      const cat = (d.category || '').trim() || 'Uncategorized';
      if (cat !== BUDGET_QUARTERLY_CATEGORY && !dataCats.includes(cat)) dataCats.push(cat);
    });
    // Only list a category once it actually has at least one document uploaded
    // in the Admin Console — nothing is shown here just because its name is
    // "known". Categories that do exist keep the familiar order below; a
    // brand-new category name typed in Admin is appended after them.
    const categories = [
      ...BUDGET_KNOWN_ORDER.filter(c => dataCats.includes(c)),
      ...dataCats.filter(c => !BUDGET_KNOWN_ORDER.includes(c)),
    ];

    wrap.innerHTML = categories.length
      ? categories.map(cat =>
          `<a class="yu-cat-link" onclick="openBudgetCategoryModal('${jsStr(cat)}')">${esc(cat)}</a>`
        ).join('')
      : '<p style="color:var(--muted)">No documents posted yet.</p>';
  }

  // ── Quarterly Updates: flat list of underlined document links, each opening a popup with Preview/Download ──
  if (quarterlyWrap) {
    const qDocs = docsFor(BUDGET_QUARTERLY_CATEGORY);
    quarterlyWrap.innerHTML = qDocs.length
      ? qDocs.map(d => `<a class="yu-cat-link" onclick="openBudgetDocModal('${jsStr(d.id)}')">${esc(d.title)}</a>`).join('')
      : '<p style="color:var(--muted)">No documents posted yet.</p>';
  }
}

// ── PROCUREMENT & BIDDING RESOURCES (Annual Budget page, right after Quarterly Updates) ──
// Each card is just a title + an optional Google Drive URL, set in Admin →
// Procurement Resources. Visitors are taken straight to that link in a new
// tab — Drive itself decides whether to show a folder listing or a PDF
// preview, depending on what's behind the link. Cards with no link yet show
// as a plain "Coming soon" state instead of a dead click.
function renderProcurementResources() {
  const el = document.getElementById('procurementResourcesGrid');
  if (!el) return;
  const items = cmsGetCollection('procurementResources');
  if (!items.length) { el.innerHTML = '<p style="color:var(--muted)">No resources added yet.</p>'; return; }

  el.innerHTML = items.map(r => {
    const url = (r.url || '').trim();
    if (url) {
      return `<a class="proc-item" href="${esc(url)}" target="_blank" rel="noopener">
        <span>${esc(r.title)}</span>
        <i class="fa fa-arrow-up-right-from-square"></i>
      </a>`;
    }
    return `<div class="proc-item proc-item--empty">
      <span>${esc(r.title)}</span>
      <span class="proc-soon">Coming soon</span>
    </div>`;
  }).join('');
}

function openBudgetDocModal(id) {
  const doc = cmsGetCollection('budget').find(d => d.id === id);
  if (!doc) return;
  document.getElementById('budgetCatModalTitle').textContent = doc.title;
  document.getElementById('budgetCatModalList').innerHTML = budgetDocListHtml([doc]);
  document.getElementById('budgetCategoryModal').classList.add('open');
}

// Popup showing a single Yearly Updates category's documents (title, Preview,
// Download) — used instead of an inline accordion panel.
function openBudgetCategoryModal(cat) {
  const items = cmsGetCollection('budget');
  const docs = items
    .filter(d => ((d.category || '').trim() || 'Uncategorized') === cat)
    .slice()
    .sort((a, b) => (b.year || '') - (a.year || ''));
  document.getElementById('budgetCatModalTitle').textContent = cat;
  document.getElementById('budgetCatModalList').innerHTML = budgetDocListHtml(docs);
  document.getElementById('budgetCategoryModal').classList.add('open');
}
function closeBudgetCategoryModal() {
  document.getElementById('budgetCategoryModal').classList.remove('open');
}

// ── LOCAL YOUTH DEVELOPMENT PLAN (Governance → Local Youth Development Plan page) ──
// Admin can upload more than one entry (e.g. one per year). All of them are shown to
// visitors now: the most recently added one is featured as a full embedded viewer, and
// any older ones are listed underneath with their own Preview/Download.
function renderYouthPlanPage() {
  const wrap = document.getElementById('youthPlanViewer');
  if (!wrap) return;
  const items = (cmsGetCollection('youthplan') || []).filter(d => d && d.docUrl);

  if (!items.length) {
    wrap.innerHTML = `
      <div class="ypv-empty">
        <i class="fa fa-file-circle-question"></i>
        <h4>Document Not Yet Posted</h4>
        <p>The Local Youth Development Plan will appear here as soon as it is uploaded through the Admin Console.</p>
      </div>`;
    return;
  }

  const doc = items[items.length - 1];
  const olderDocs = items.slice(0, -1).reverse(); // most recently added first, current one excluded
  const fname = doc.fileName || (esc(doc.title || 'Local-Youth-Development-Plan').replace(/\s+/g, '-') + '.pdf');

  const olderHtml = olderDocs.length ? `
    <div class="ypv-more">
      <h3>Other Uploaded Documents</h3>
      <ul class="yu-list">
        ${olderDocs.map(d => {
          const dfname = d.fileName || (esc(d.title || 'Local-Youth-Development-Plan').replace(/\s+/g, '-') + '.pdf');
          return `<li class="yu-doc-row">
            <span class="yu-doc-title"><i class="fa fa-file-pdf"></i> ${esc(d.title || 'Local Youth Development Plan')}${d.year ? ' (' + esc(d.year) + ')' : ''}</span>
            <div class="yu-doc-actions">
              <button type="button" class="yu-btn-preview" onclick="previewPdfDoc('${jsStr(d.docUrl)}', '${jsStr(d.title || 'Local Youth Development Plan')}')">
                <i class="fa fa-eye"></i> Preview
              </button>
              <a class="yu-btn-download" href="${esc(d.docUrl)}" download="${esc(dfname)}" target="_blank" rel="noopener">
                <i class="fa fa-download"></i> Download
              </a>
            </div>
          </li>`;
        }).join('')}
      </ul>
    </div>` : '';

  wrap.innerHTML = `
    <div class="ypv-toolbar">
      <div>
        <h2>${esc(doc.title || 'Local Youth Development Plan')}</h2>
        <div class="ypv-meta">
          ${doc.year ? `<span><i class="fa fa-calendar"></i> ${esc(doc.year)}</span>` : ''}
          <span><i class="fa fa-file-pdf"></i> PDF Document</span>
        </div>
      </div>
      <div class="ypv-actions">
        <button type="button" class="ypv-btn ypv-btn-solid" onclick="viewYouthPlanFullscreen('${jsStr(doc.id)}')">
          <i class="fa fa-up-right-and-down-left-from-center"></i> View Fullscreen
        </button>
        <a class="ypv-btn" href="${esc(doc.docUrl)}" download="${esc(fname)}" target="_blank" rel="noopener">
          <i class="fa fa-download"></i> Download
        </a>
      </div>
    </div>
    ${doc.description ? `<p style="color:var(--muted);font-size:.86rem;margin:-.4rem 0 1.1rem;line-height:1.7;">${esc(doc.description)}</p>` : ''}
    <div class="ypv-frame-wrap">
      <iframe src="${esc(doc.docUrl)}" title="Local Youth Development Plan"></iframe>
    </div>
    <div class="ypv-note">
      <i class="fa fa-circle-info"></i>
      <span>Use <strong>View Fullscreen</strong> to open the document in its own tab, or <strong>Download</strong> to save a copy.</span>
    </div>
    ${olderHtml}`;
}
// id is optional — omit it (or pass a falsy value) to open the current/featured document,
// same as before this function took an argument.
function viewYouthPlanFullscreen(id) {
  const items = cmsGetCollection('youthplan');
  const doc = id ? items.find(d => d.id === id) : (items && items.length ? items[items.length - 1] : null);
  if (!doc || !doc.docUrl) return false;
  window.open(doc.docUrl, '_blank', 'noopener');
  return false;
}

// Escapes a value for safe embedding inside a single-quoted inline-JS attribute
// (used by onclick="previewPdfDoc('...','...')" strings — different from HTML esc()).
function jsStr(v) {
  return String(v || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ');
}

// ── PDF PREVIEW MODAL (Annual Budget page: preview a document without downloading it) ──
function previewPdfDoc(url, title) {
  if (!url) {
    alert('This document has not been uploaded yet.');
    return false;
  }
  const modal = document.getElementById('pdfPreviewModal');
  const frame = document.getElementById('pdfPreviewFrame');
  const titleEl = document.getElementById('pdfPreviewTitle');
  const downloadBtn = document.getElementById('pdfPreviewDownload');
  if (!modal || !frame) return false;

  // Preview can be triggered from inside another popup (e.g. the Annual Budget
  // category document list) — close that one first so it doesn't stay stacked
  // behind the PDF preview.
  const categoryModal = document.getElementById('budgetCategoryModal');
  if (categoryModal) categoryModal.classList.remove('open');

  titleEl.textContent = title || 'Document Preview';
  frame.src = url;
  if (downloadBtn) {
    downloadBtn.href = url;
    downloadBtn.setAttribute('download', (title || 'document').replace(/\s+/g, '-') + '.pdf');
  }
  modal.classList.add('open');
  return false;
}
function closePdfPreview() {
  const modal = document.getElementById('pdfPreviewModal');
  if (modal) modal.classList.remove('open');
  const frame = document.getElementById('pdfPreviewFrame');
  if (frame) frame.src = ''; // stop rendering the PDF once closed
}
document.addEventListener('DOMContentLoaded', function () {
  const pdfModal = document.getElementById('pdfPreviewModal');
  if (pdfModal) {
    pdfModal.addEventListener('click', function (e) {
      if (e.target === this) closePdfPreview();
    });
  }
});

// Overrides each page's banner background with an admin-uploaded image, if one
// has been set in Admin → Page Banners. Pages with no custom image keep their
// existing default background untouched.
function applyPageBanners() {
  const banners = cmsGetCollection('pageBanners');
  banners.forEach(b => {
    const pageEl = document.getElementById(b.id + '-page');
    if (!pageEl) return;
    const bannerEl = pageEl.querySelector('.page-banner');
    if (!bannerEl) return;

    if (b.image) {
      // Light scrim only (was a flat 60% navy tint that washed the photo out);
      // the banner text also carries a text-shadow for readability.
      bannerEl.style.backgroundImage = `radial-gradient(ellipse at center, rgba(8,18,38,.42) 0%, rgba(8,18,38,.18) 60%, rgba(8,18,38,0) 100%), url('${b.image}')`;
      bannerEl.style.backgroundSize = 'cover';
      bannerEl.style.backgroundPosition = 'center';
      bannerEl.style.backgroundRepeat = 'no-repeat';
    }

    const labelEl = bannerEl.querySelector('.pg-label');
    if (labelEl) {
      if (b.eyebrow) { labelEl.textContent = b.eyebrow; labelEl.style.display = ''; }
      else { labelEl.style.display = 'none'; }
    }
    const titleEl = bannerEl.querySelector('h1');
    if (titleEl) {
      if (b.title) { titleEl.textContent = b.title; titleEl.style.display = ''; }
      else { titleEl.style.display = 'none'; }
    }
    const descEl = bannerEl.querySelector('p');
    if (descEl) {
      if (b.description) { descEl.textContent = b.description; descEl.style.display = ''; }
      else { descEl.style.display = 'none'; }
    }
  });
}

// ── EVENTS CALENDAR (News & Events page) + homepage "Upcoming Event" widget ──
const EVENT_TYPE_COLORS = {
  'Regular Holiday': '#c0392b',
  'Local Holiday': '#c9782e',
  'Municipal Event': '#1c8a5b',
};
function evTypeColor(type) { return EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS['Municipal Event']; }
// An event uses its own hand-picked Calendar Color when set; otherwise it
// falls back to the color tied to its Type.
function eventColor(ev) { return (ev && ev.color) || evTypeColor(ev && ev.type); }

// Current month being viewed in the calendar (persists across cms:updated
// re-renders / poll refreshes, and across switching pages, until the user
// navigates or the page is reloaded).
const evcalState = (() => {
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth(), selectedId: null, view: 'upcoming' };
})();

function sortedEvents() {
  return cmsGetCollection('events')
    .filter(e => e.date)
    .slice()
    .sort((a, b) => (a.date + (a.startTime || '')).localeCompare(b.date + (b.startTime || '')));
}

function todayIso() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ── Automatic event archive ──
// An event needs no manual archiving: once its date has passed it moves from
// "Upcoming" to "Past Events" on its own. It stays on the calendar grid (so
// past months remain a record) but no longer appears as an upcoming event.
function isPastEvent(ev) { return !!(ev && ev.date) && ev.date < todayIso(); }
function upcomingEvents() { return sortedEvents().filter(e => !isPastEvent(e)); }
function pastEvents() { return sortedEvents().filter(isPastEvent).reverse(); } // most recent first
function evcalSetView(view) {
  evcalState.view = view === 'past' ? 'past' : 'upcoming';
  evcalState.selectedId = null;
  renderEventDetailsPanel();
}

function evcalGoMonth(delta) {
  evcalState.month += delta;
  if (evcalState.month < 0) { evcalState.month = 11; evcalState.year--; }
  if (evcalState.month > 11) { evcalState.month = 0; evcalState.year++; }
  evcalState.selectedId = null;
  renderEventsCalendar();
}
function evcalGoToday() {
  const today = new Date();
  evcalState.year = today.getFullYear();
  evcalState.month = today.getMonth();
  evcalState.selectedId = null;
  renderEventsCalendar();
}
function evcalSelect(id) {
  evcalState.selectedId = id;
  // Show whichever list (Upcoming / Past Events) the clicked event belongs to.
  const picked = sortedEvents().find(e => e.id === id);
  if (picked) evcalState.view = isPastEvent(picked) ? 'past' : 'upcoming';
  renderEventsCalendar();
}

function renderEventsCalendar() {
  const grid = document.getElementById('evcalGrid');
  const monthLabel = document.getElementById('evcalMonthLabel');
  if (!grid || !monthLabel) return;

  const { year, month } = evcalState;
  monthLabel.textContent = new Date(year, month, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

  const events = sortedEvents();
  const eventsByDate = {};
  events.forEach(e => { (eventsByDate[e.date] = eventsByDate[e.date] || []).push(e); });

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const todayStr = todayIso();

  const cells = [];
  // Leading days from previous month
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, outside: true });
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, outside: false, iso: year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0') });
  }
  // Trailing days to complete the last week
  let trail = 1;
  while (cells.length % 7 !== 0) { cells.push({ day: trail++, outside: true }); }

  grid.innerHTML = cells.map(c => {
    if (c.outside) return `<div class="evcal-cell is-outside"><div class="evcal-daynum">${c.day}</div></div>`;
    const dayEvents = eventsByDate[c.iso] || [];
    const isToday = c.iso === todayStr;
    const hasSelected = dayEvents.some(e => e.id === evcalState.selectedId);
    const tags = dayEvents.map(e => `<div class="evcal-tag${c.iso < todayStr ? ' is-past' : ''}" style="background:${eventColor(e)}" onclick="evcalSelect('${esc(e.id)}')" title="${esc(e.title)}">${esc(e.title)}</div>`).join('');
    return `<div class="evcal-cell${isToday ? ' is-today' : ''}${hasSelected ? ' has-selected' : ''}">
      <div class="evcal-daynum">${c.day}</div>
      ${tags}
    </div>`;
  }).join('');

  renderEventDetailsPanel();
}

function renderEventDetailsPanel() {
  const body = document.getElementById('evdetailBody');
  if (!body) return;

  const isPastView = evcalState.view === 'past';
  const PAST_LIMIT = 30;
  const allPast = pastEvents();
  const upcoming = isPastView ? allPast.slice(0, PAST_LIMIT) : upcomingEvents();

  const tabUp = document.getElementById('evTabUpcoming');
  const tabPast = document.getElementById('evTabPast');
  if (tabUp) { tabUp.classList.toggle('active', !isPastView); tabUp.setAttribute('aria-selected', String(!isPastView)); }
  if (tabPast) {
    tabPast.classList.toggle('active', isPastView); tabPast.setAttribute('aria-selected', String(isPastView));
    tabPast.textContent = 'Past Events' + (allPast.length ? ' (' + allPast.length + ')' : '');
  }

  if (!upcoming.length) {
    body.innerHTML = isPastView
      ? '<div class="evdetail-empty">No past events yet. Events move here automatically once their date has passed.</div>'
      : `<div class="evdetail-empty">No upcoming events posted yet.${allPast.length ? ' <a href="#" onclick="evcalSetView(\'past\');return false;">View past events</a>' : ''}</div>`;
    return;
  }

  body.innerHTML = upcoming.map((ev, i) => `
    <div class="evdetail-block${ev.id === evcalState.selectedId ? ' evdetail-block--selected' : ''}${i > 0 ? ' evdetail-block--sep' : ''}">
      <div><span class="evdetail-badge" style="background:${eventColor(ev)};color:#fff">${esc(ev.type || 'Municipal Event')}</span><span class="evdetail-date">${fmtNewsDate(ev.date)}</span>${isPastView ? '<span class="evdetail-past-chip">Past</span>' : ''}</div>
      <div class="evdetail-name">${esc(ev.title)}</div>
      <div class="evdetail-meta">
        ${(ev.startTime || ev.endTime) ? `<div class="evdetail-meta-row"><i class="fa fa-clock"></i><span>${esc(ev.startTime || '')}${ev.startTime && ev.endTime ? ' - ' : ''}${esc(ev.endTime || '')}</span></div>` : ''}
        ${ev.location ? `<div class="evdetail-meta-row"><i class="fa fa-location-dot"></i><em>${esc(ev.location)}</em></div>` : ''}
        ${ev.office ? `<div class="evdetail-meta-row"><i class="fa fa-building"></i><em>${esc(ev.office)}</em></div>` : ''}
      </div>
      <a href="#" class="evdetail-btn" onclick="openEventDetail('${esc(ev.id)}');return false;">View Complete Details <i class="fa fa-chevron-right"></i></a>
    </div>`).join('');
}

function openEventDetail(id) {
  const ev = sortedEvents().find(e => e.id === id);
  const body = document.getElementById('eventDetailBody');
  if (!body) return;

  if (!ev) {
    body.innerHTML = '<p style="color:var(--muted)">Event not found.</p>';
  } else {
    body.innerHTML = `
      <span class="evfull-badge" style="background:${eventColor(ev)};color:#fff">${esc(ev.type || 'Municipal Event')}</span>
      ${isPastEvent(ev) ? '<span class="evfull-badge evfull-badge--past"><i class="fa fa-box-archive"></i> Past event</span>' : ''}
      <h1 class="evfull-title">${esc(ev.title)}</h1>
      <div class="evfull-infobar">
        <div class="evfull-info-item">
          <div class="evfull-info-icon"><i class="fa fa-calendar-days"></i></div>
          <div><div class="evfull-info-label">Date</div><div class="evfull-info-value">${fmtNewsDate(ev.date)}</div></div>
        </div>
        <div class="evfull-info-item">
          <div class="evfull-info-icon"><i class="fa fa-clock"></i></div>
          <div><div class="evfull-info-label">Time</div><div class="evfull-info-value">${esc(ev.startTime || '')}${ev.startTime && ev.endTime ? ' - ' : ''}${esc(ev.endTime || 'TBA')}</div></div>
        </div>
        <div class="evfull-info-item">
          <div class="evfull-info-icon"><i class="fa fa-location-dot"></i></div>
          <div><div class="evfull-info-label">Location</div><div class="evfull-info-value">${esc(ev.location || 'TBA')}</div></div>
        </div>
        <div class="evfull-info-item">
          <div class="evfull-info-icon"><i class="fa fa-building"></i></div>
          <div><div class="evfull-info-label">Office</div><div class="evfull-info-value">${esc(ev.office || 'TBA')}</div></div>
        </div>
      </div>
      ${ev.poster ? `<img class="evfull-poster" src="${esc(ev.poster)}" alt="${esc(ev.title)}">` : ''}
      <div class="evfull-desc-head">Event Details</div>
      <div class="evfull-desc-body">${esc(ev.description || 'No additional details provided yet.')}</div>`;
  }

  showPage('event-detail', { hash: 'event/' + id });
}

// ── HOMEPAGE: "Upcoming Event" sidebar widget, next to Latest News ──
function renderHomeUpcomingEvent() {
  const el = document.getElementById('homeUpcomingEvent');
  if (!el) return;

  // Only genuinely upcoming events — a past event is never shown as "upcoming".
  const ev = upcomingEvents()[0];

  if (!ev) {
    el.innerHTML = '<div class="home-upcoming-empty">No upcoming events posted yet.</div>';
    return;
  }

  const d = new Date(ev.date + 'T00:00:00');
  const monthAbbr = isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-PH', { month: 'short' }).toUpperCase();
  const dayNum = isNaN(d.getTime()) ? '' : d.getDate();

  el.innerHTML = `
    <div class="home-upcoming-card">
      <div class="home-upcoming-datebox" style="background:${eventColor(ev)}">
        <span class="home-upcoming-month">${esc(monthAbbr)}</span>
        <span class="home-upcoming-day">${esc(dayNum)}</span>
      </div>
      <div class="home-upcoming-body">
        <div class="home-upcoming-title">${esc(ev.title)}</div>
        <div class="home-upcoming-meta">
          ${(ev.startTime || ev.endTime) ? `<span><i class="fa fa-clock"></i>${esc(ev.startTime || '')}${ev.startTime && ev.endTime ? ' - ' : ''}${esc(ev.endTime || '')}</span>` : ''}
          ${ev.location ? `<span><i class="fa fa-location-dot"></i>${esc(ev.location)}</span>` : ''}
          ${ev.office ? `<span><i class="fa fa-building"></i>${esc(ev.office)}</span>` : ''}
        </div>
        <a href="#" class="home-upcoming-btn" onclick="openEventDetail('${esc(ev.id)}');return false;">View Complete Details</a>
      </div>
    </div>`;
}


// (Boot listeners for renderAllCmsContent live at the end of this file, next to its definition.)

// ── PAGE SWITCHING ──
const API_ORIGIN = (location.protocol === 'file:' || (location.port && location.port !== '3000'))
  ? 'http://localhost:3000'
  : '';

async function apiFetch(url, options = {}) {
  const response = await fetch(`${API_ORIGIN}${url}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}


// ── MOBILE NAV TOGGLE ──
// These three were referenced by the navbar markup (onclick="handleNavClick(...)",
// closeMobileNav(), toggleMobileNav()) but were never defined anywhere, so every
// click on "About LGU", "Governance", or "Transparency" threw a silent
// ReferenceError in the console and did nothing. Defining them here fixes that.
// Used by the top-level "About LGU" / "Governance" / "Transparency" nav links,
// which have their own overview page in addition to a hover dropdown of subpages.

// ── CONTACT MODAL ──
function openContact() {
  document.getElementById('contactModal').classList.add('open');
  return false;
}
function closeContact() {
  document.getElementById('contactModal').classList.remove('open');
}
document.getElementById('contactModal').addEventListener('click', function(e) {
  if (e.target === this) closeContact();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeContact();
    closePdfPreview();
    closeReadMoreModal();
    closeImgLightbox();
    closeBudgetCategoryModal();
  }
});

async function submitForm() {
  const modal = document.getElementById('contactModal');
  const inputs = modal.querySelectorAll('input');
  const firstName = inputs[0].value.trim();
  const lastName = inputs[1].value.trim();
  const email = inputs[2].value.trim();
  const concern = modal.querySelector('select').value;
  const message = modal.querySelector('textarea').value.trim();

  if (!firstName || !lastName || !email || !message) {
    alert('Please complete your name, email address, and message before sending.');
    return;
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    alert('Please enter a valid email address.');
    return;
  }

  let contactMessage = {
    id: Date.now().toString(),
    firstName,
    lastName,
    email,
    concern,
    message,
    createdAt: new Date().toISOString(),
    read: false
  };

  try {
    const data = await apiFetch('/api/contact-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, concern, message })
    });
    contactMessage = data.message || contactMessage;
  } catch (error) {
    const storedMessages = JSON.parse(localStorage.getItem('cortesContactMessages') || '[]');
    storedMessages.unshift(contactMessage);
    localStorage.setItem('cortesContactMessages', JSON.stringify(storedMessages));
  }

  modal.querySelectorAll('input, textarea').forEach(field => field.value = '');
  modal.querySelector('select').selectedIndex = 0;

  alert('Your message has been sent!\n\nWe will respond within 1-2 business days.\nThank you for contacting the Municipality of Cortes.');
  closeContact();
  return;
  alert('✅ Your message has been sent!\n\nWe will respond within 1–2 business days.\nThank you for contacting the Municipality of Cortes.');
  closeContact();
}

// ── HERO SLIDER (admin-managed, driven by the heroSlides collection) ──
let slideIdx = 0;
let slides = [];
let dots = [];
let heroAutoplayTimer = null;

function goSlide(n) {
  if (!slides.length) return;
  slides[slideIdx].classList.remove('active');
  dots[slideIdx].classList.remove('active');
  slideIdx = n;
  slides[slideIdx].classList.add('active');
  dots[slideIdx].classList.add('active');
}

function renderHeroSlider() {
  const container = document.getElementById('heroSliderContainer');
  if (!container) return;

  if (heroAutoplayTimer) { clearInterval(heroAutoplayTimer); heroAutoplayTimer = null; }

  const mainTitle = cmsGetSetting('heroTitle').trim() || 'Welcome to Cortes';
  const mainCaption = cmsGetSetting('heroSub').trim();
  const mainDesc = cmsGetSetting('heroDesc').trim() || 'Discover the vibrant spirit, rich heritage, and governance of the Municipality of Cortes.';
  const heroContentHtml = (mainTitle || mainCaption) ? `
    <div class="slide-content">
      ${mainTitle ? `<div class="slide-title">${esc(mainTitle)}</div><div class="slide-underline"></div>` : ''}
      ${mainCaption ? `<div class="slide-subtitle">${esc(mainCaption)}</div>` : ''}
      <p class="slide-desc">${esc(mainDesc)}</p>
      <div class="slide-btns">
        <button type="button" class="slide-btn slide-btn--solid" onclick="showPage('news')">What's New in Cortes</button>
        <button type="button" class="slide-btn slide-btn--outline" onclick="showPage('tourism')">Discover Tourism</button>
      </div>
    </div>` : '';

  const heroMode = cmsGetSetting('heroMode').trim() || 'images';
  const heroVideoUrl = cmsGetSetting('heroVideoUrl').trim();

  // ── VIDEO MODE: one looping background video instead of the photo slider ──
  if (heroMode === 'video' && heroVideoUrl) {
    container.innerHTML = `
      <div class="hero hero-video-mode">
        <video id="heroVideoEl" class="hero-video" src="${esc(heroVideoUrl)}" autoplay muted loop playsinline></video>
        ${heroContentHtml}
        <button type="button" class="hero-mute-btn" id="heroMuteBtn" onclick="toggleHeroMute()" aria-label="Unmute video">
          <i class="fa fa-volume-xmark"></i>
        </button>
      </div>`;
    slides = []; dots = [];
    return;
  }

  // ── IMAGE SLIDER MODE (default) ──
  const items = cmsGetCollection('heroSlides').filter(s => s.image).slice(0, 5);

  if (!items.length) {
    container.innerHTML = `
      <div class="hero hero-empty">
        <div class="hero-empty-msg">Add slide images in the Admin Console → Hero Slider to show them here.</div>
      </div>`;
    slides = []; dots = [];
    return;
  }

  container.innerHTML = `
    <div class="hero">
      ${items.map((s, i) => `
        <div class="slide${i === 0 ? ' active' : ''}">
          <div class="slide-bg" style="background-image:url('${esc(s.image)}')"></div>
        </div>`).join('')}
      ${heroContentHtml}
      <div class="slider-dots">
        ${items.map((_, i) => `<button class="dot${i === 0 ? ' active' : ''}" onclick="goSlide(${i})" aria-label="Slide ${i + 1}"></button>`).join('')}
      </div>
    </div>`;

  slideIdx = 0;
  slides = Array.from(container.querySelectorAll('.slide'));
  dots = Array.from(container.querySelectorAll('.dot'));

  if (slides.length > 1) {
    heroAutoplayTimer = setInterval(() => { goSlide((slideIdx + 1) % slides.length); }, 5000);
  }
}

// Mute/unmute button overlaid on the hero video (autoplay requires starting
// muted; this lets the visitor turn sound on if the clip has audio).
function toggleHeroMute() {
  const video = document.getElementById('heroVideoEl');
  const btn = document.getElementById('heroMuteBtn');
  if (!video || !btn) return;
  video.muted = !video.muted;
  btn.innerHTML = video.muted ? '<i class="fa fa-volume-xmark"></i>' : '<i class="fa fa-volume-high"></i>';
  btn.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
}

// ── ABOUT LGU PAGE PHOTO SLIDER (admin-managed via the aboutSlides collection) ──
// Independent of the hero slider above (separate state) so both can run at
// the same time without interfering with each other.
let aboutSlideIdx = 0;
let aboutSlideEls = [];
let aboutDotEls = [];
let aboutAutoplayTimer = null;

function goAboutSlide(n) {
  if (!aboutSlideEls.length) return;
  aboutSlideEls[aboutSlideIdx].classList.remove('active');
  aboutDotEls[aboutSlideIdx].classList.remove('active');
  aboutSlideIdx = n;
  aboutSlideEls[aboutSlideIdx].classList.add('active');
  aboutDotEls[aboutSlideIdx].classList.add('active');
}

function renderAboutSlider() {
  const container = document.getElementById('aboutSliderContainer');
  if (!container) return;

  const items = cmsGetCollection('aboutSlides').filter(s => s.image).slice(0, 6);

  if (aboutAutoplayTimer) { clearInterval(aboutAutoplayTimer); aboutAutoplayTimer = null; }

  if (!items.length) {
    container.innerHTML = `<div class="about-slider-empty">Add photos in Admin Console → About LGU Slider to show them here.</div>`;
    aboutSlideEls = []; aboutDotEls = [];
    return;
  }

  container.innerHTML = `
    ${items.map((s, i) => `
      <div class="about-slide${i === 0 ? ' active' : ''}">
        <div class="about-slide-bg" style="background-image:url('${esc(s.image)}')" ${s.caption ? `role="img" aria-label="${esc(s.caption)}"` : ''}></div>
      </div>`).join('')}
    ${items.length > 1 ? `<div class="about-slider-dots">
      ${items.map((_, i) => `<button class="about-dot${i === 0 ? ' active' : ''}" onclick="goAboutSlide(${i})" aria-label="Slide ${i + 1}"></button>`).join('')}
    </div>` : ''}`;

  aboutSlideIdx = 0;
  aboutSlideEls = Array.from(container.querySelectorAll('.about-slide'));
  aboutDotEls = Array.from(container.querySelectorAll('.about-dot'));

  if (aboutSlideEls.length > 1) {
    aboutAutoplayTimer = setInterval(() => { goAboutSlide((aboutSlideIdx + 1) % aboutSlideEls.length); }, 5000);
  }
}

// ── ABOUT LGU PAGE — SECOND PHOTO SLIDER (Community & Economy, admin-managed
// via the communitySlides collection). Separate state from both sliders
// above so all three can run independently at the same time.
let communitySlideIdx = 0;
let communitySlideEls = [];
let communityDotEls = [];
let communityAutoplayTimer = null;

function goCommunitySlide(n) {
  if (!communitySlideEls.length) return;
  communitySlideEls[communitySlideIdx].classList.remove('active');
  communityDotEls[communitySlideIdx].classList.remove('active');
  communitySlideIdx = n;
  communitySlideEls[communitySlideIdx].classList.add('active');
  communityDotEls[communitySlideIdx].classList.add('active');
}

function renderCommunitySlider() {
  const container = document.getElementById('communitySliderContainer');
  if (!container) return;

  const items = cmsGetCollection('communitySlides').filter(s => s.image).slice(0, 6);

  if (communityAutoplayTimer) { clearInterval(communityAutoplayTimer); communityAutoplayTimer = null; }

  if (!items.length) {
    container.innerHTML = `<div class="about-slider-empty">Add photos in Admin Console → Community &amp; Economy Slider to show them here.</div>`;
    communitySlideEls = []; communityDotEls = [];
    return;
  }

  container.innerHTML = `
    ${items.map((s, i) => `
      <div class="about-slide${i === 0 ? ' active' : ''}">
        <div class="about-slide-bg" style="background-image:url('${esc(s.image)}')" ${s.caption ? `role="img" aria-label="${esc(s.caption)}"` : ''}></div>
      </div>`).join('')}
    ${items.length > 1 ? `<div class="about-slider-dots">
      ${items.map((_, i) => `<button class="about-dot${i === 0 ? ' active' : ''}" onclick="goCommunitySlide(${i})" aria-label="Slide ${i + 1}"></button>`).join('')}
    </div>` : ''}`;

  communitySlideIdx = 0;
  communitySlideEls = Array.from(container.querySelectorAll('.about-slide'));
  communityDotEls = Array.from(container.querySelectorAll('.about-dot'));

  if (communitySlideEls.length > 1) {
    communityAutoplayTimer = setInterval(() => { goCommunitySlide((communitySlideIdx + 1) % communitySlideEls.length); }, 5000);
  }
}

// ── CORTES HYMN (About LGU page, before Barangays) — lyrics are entered by
// Admin in Site Content → Page Banners → Cortes Hymn Lyrics (a setting, not
// hardcoded here, since Claude does not write or reproduce song lyrics).
// Contacts page — Physical Address / Telephone / Direct Email / Operating
// Hours, all editable in Admin → Page Banners → Contact Information. Sensible
// defaults show if a field hasn't been filled in yet, so the page never looks
// broken or blank.
function renderContactsPage() {
  const el = document.getElementById('contactsGrid');
  if (!el) return;

  const address = cmsGetSetting('contactAddress').trim() || 'Cortes Municipal Hall, Malayo Sur, Cortes, Bohol';
  const emergency = cmsGetSetting('emergency').trim();
  const trunkline = cmsGetSetting('trunkline').trim();
  const email = cmsGetSetting('email').trim();
  const hours = cmsGetSetting('contactHours').trim() || 'Monday – Friday: 8:00 AM – 5:00 PM';
  const closedNote = cmsGetSetting('contactClosedNote').trim() || 'Closed on Weekends & Public Holidays';

  const phoneLines = [];
  if (emergency) phoneLines.push(`<strong>Emergency:</strong> ${esc(emergency)}`);
  if (trunkline) phoneLines.push(`<strong>Hotline:</strong> ${esc(trunkline)}`);
  const phoneValue = phoneLines.length ? phoneLines.join('<br>') : 'Not yet set';

  el.innerHTML = `
    <div class="contacts-item">
      <div class="contacts-icon"><i class="fa fa-location-dot"></i></div>
      <div>
        <div class="contacts-label">Physical Address</div>
        <div class="contacts-value">${esc(address)}</div>
      </div>
    </div>
    <div class="contacts-item">
      <div class="contacts-icon"><i class="fa fa-phone"></i></div>
      <div>
        <div class="contacts-label">Telephone</div>
        <div class="contacts-value">${phoneValue}</div>
      </div>
    </div>
    <div class="contacts-item">
      <div class="contacts-icon"><i class="fa fa-envelope"></i></div>
      <div>
        <div class="contacts-label">Direct Email</div>
        <div class="contacts-value">${email ? `<a href="mailto:${esc(email)}" class="contacts-email-link">${esc(email)}</a>` : 'Not yet set'}</div>
      </div>
    </div>
    <div class="contacts-item">
      <div class="contacts-icon"><i class="fa fa-clock"></i></div>
      <div>
        <div class="contacts-label">Operating Hours</div>
        <div class="contacts-value">${esc(hours)}<span class="closed-note">${esc(closedNote)}</span></div>
      </div>
    </div>`;
}

function renderCortesHymn() {
  const el = document.getElementById('cortesHymnLyrics');
  if (!el) return;
  const lyrics = cmsGetSetting('cortesHymnLyrics').trim();
  el.innerHTML = lyrics
    ? `<div class="hymn-lyrics-text">${esc(lyrics)}</div>`
    : `<div class="hymn-lyrics-empty">Lyrics coming soon. Admins can add them in Admin Console → Page Banners → Cortes Hymn Lyrics.</div>`;
}

// ── BARANGAY LOGOS (About LGU page, in each barangay card) — admin-managed
// via the barangayLogos collection. Barangays with no matching entry keep
// the default icon placeholder instead of breaking or showing nothing.
function renderBarangayLogos() {
  const logos = cmsGetCollection('barangayLogos');
  document.querySelectorAll('.brgy-card').forEach(card => {
    const name = (card.dataset.name || '').trim().toLowerCase();
    const match = logos.find(l => (l.name || '').trim().toLowerCase() === name);
    const iconEl = card.querySelector('.brgy-head-icon');
    if (!iconEl) return;
    if (match && match.logo) {
      iconEl.innerHTML = `<img src="${esc(match.logo)}" alt="${esc(match.name)} seal" onerror="this.remove()">`;
    }
  });
}

// ── SEARCH ──

// ── YEARLY UPDATES ACCORDION (Annual Budget page) ──
function toggleAccordion(btn) {
  const item = btn.parentElement;
  const panel = item.querySelector('.yu-panel');
  const icon = btn.querySelector('.yu-toggle i');
  const isOpen = panel.style.display === 'block';
  if (isOpen) {
    panel.style.display = 'none';
    icon.className = 'fa fa-plus';
    btn.classList.remove('open');
  } else {
    panel.style.display = 'block';
    icon.className = 'fa fa-minus';
    btn.classList.add('open');
  }
}

// ── SCROLL TOP ──
window.addEventListener('scroll', () => {
  document.getElementById('scrollTop').classList.toggle('show', window.scrollY > 300);
});

// ══════════════════════════════════════════════════════════════════════
//  V2 — GOVERNANCE STRUCTURE, OFFICE PROFILES, SERVICES DIRECTORY,
//  CITIZEN'S CHARTER, PROJECT MONITORING, BUDGET & PLANNING, NEWS
//  ARCHIVE, DOWNLOADS, SITE SEARCH, ROUTING, MOBILE NAV.
//
//  Data model (all managed in the Admin Console):
//   • departments  → the single office registry. Each record has a
//                    `branch` (Legislative / Executive / National Agency).
//   • services     → each service has an `officeId`. The Services
//                    Directory, the Citizen's Charter, office pages and
//                    search all read these same records.
//   • projects, budget, budgetPlans, documents, news, announcements
//                  → each can carry an `officeId`, so every item shows
//                    "which office handles this?".
//  Nothing here invents official data: empty fields show the placeholder
//  "Information to be updated by the administrator."
// ══════════════════════════════════════════════════════════════════════

const TBU = 'Information to be updated by the administrator.';
function tbu(text) { return `<span class="tbu">${esc(text || TBU)}</span>`; }
function tbuShort() { return `<span class="tbu" title="${esc(TBU)}">To be updated</span>`; }
function hasVal(v) { return v != null && String(v).trim() !== ''; }
function valOr(v, placeholderHtml) { return hasVal(v) ? esc(v) : (placeholderHtml || tbu()); }
// Splits a textarea into clean lines, dropping leading "1." / "-" / "•" markers.
function splitLines(v) {
  return String(v || '').split(/\r?\n/).map(l => l.replace(/^\s*(?:\d+\s*[.)]|[-•*])\s*/, '').trim()).filter(Boolean);
}
function paragraphs(v) { return String(v || '').split(/\n\s*\n|\r?\n/).map(p => p.trim()).filter(Boolean); }
function uniqSorted(arr) { return [...new Set(arr.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))); }
function fillSelect(sel, values, allLabel, labelFn) {
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = `<option value="">${esc(allLabel)}</option>` + values.map(v => `<option value="${esc(v)}">${esc(labelFn ? labelFn(v) : v)}</option>`).join('');
  if (values.map(String).includes(cur)) sel.value = cur;
}
function resetFilters(ids) { ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); }
function inputVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function matchesQuery(haystack, q) {
  const terms = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const h = String(haystack || '').toLowerCase();
  return terms.every(t => h.includes(t));
}
function fileDownloadButtons(url, title, fileName) {
  if (!url) return '';
  const isPdf = /\.pdf($|\?)/i.test(url);
  const dl = fileName || (String(title || 'document').replace(/\s+/g, '-'));
  return `<div class="yu-doc-actions">
      ${isPdf ? `<button type="button" class="yu-btn-preview" onclick="previewPdfDoc('${jsStr(url)}', '${jsStr(title)}')"><i class="fa fa-eye"></i> Preview</button>` : ''}
      <a class="yu-btn-download" href="${esc(url)}" download="${esc(dl)}" target="_blank" rel="noopener"><i class="fa fa-download"></i> Download</a>
    </div>`;
}

// ── OFFICES ─────────────────────────────────────────────────────────
const BRANCHES = [
  { key: 'Legislative', id: 'legislative', title: 'Legislative', icon: 'fa-landmark',
    desc: 'The law-making branch of the municipal government, which enacts ordinances and resolutions.' },
  { key: 'Executive', id: 'executive', title: 'Executive', icon: 'fa-building-columns',
    desc: 'The offices under the Municipal Mayor that implement programs and deliver public services.' },
  { key: 'National Agency', id: 'national', title: 'National Agencies / Attached Government Offices', icon: 'fa-flag',
    desc: 'National government agencies operating or represented within the LGU. These are not municipal offices.' },
];
function branchOf(o) { const b = String((o && o.branch) || '').trim(); return BRANCHES.find(x => x.key === b) || null; }
function allOffices() { return cmsGetCollection('departments'); }
function officeById(id) { return id ? (allOffices().find(o => o.id === id) || null) : null; }
function officeByKey(k) { return allOffices().find(o => o.officeKey === k) || null; }
function officeNameOf(rec) {
  const o = rec && rec.officeId ? officeById(rec.officeId) : null;
  return o ? o.name : ((rec && (rec.office || rec.department)) || '');
}
function officeLinkHtml(rec, emptyHtml) {
  const o = rec && rec.officeId ? officeById(rec.officeId) : null;
  if (!o) {
    const n = rec && (rec.office || rec.department);
    return n ? esc(n) : (emptyHtml || tbuShort());
  }
  return `<a href="#office/${esc(o.id)}" class="olink" onclick="openOffice('${jsStr(o.id)}');return false;">${esc(o.name)}</a>`;
}
// Offices that actually appear in a list of records, in registry order — for filter dropdowns.
function officeIdsIn(records) {
  const used = new Set(records.map(r => r.officeId).filter(Boolean));
  return allOffices().filter(o => used.has(o.id)).map(o => o.id);
}
function officeSelectLabel(id) { const o = officeById(id); return o ? o.name : id; }
function officeIcon(o) {
  const br = branchOf(o);
  return br ? br.icon : 'fa-building';
}
function officeLogoHtml(o, cls) {
  return o && o.logo
    ? `<img src="${esc(o.logo)}" alt="${esc(o.name)} logo" onerror="this.outerHTML='<i class=\\'fa ${officeIcon(o)}\\'></i>'">`
    : `<i class="fa ${officeIcon(o)}"></i>`;
}

function findOfficial(re, notRe) {
  return cmsGetCollection('officials').find(p => re.test(p.position || '') && !(notRe && notRe.test(p.position || '')));
}
// The office head comes from the office record; for the Mayor / Vice Mayor /
// Sangguniang Bayan it falls back to the matching record in Admin → Officials.
function officeHead(o) {
  if (!o) return null;
  if (hasVal(o.head)) return { name: o.head, position: o.headPosition || '', photo: o.headPhoto || '' };
  let p = null;
  if (o.officeKey === 'mayor') p = findOfficial(/mayor/i, /vice/i);
  if (o.officeKey === 'vice-mayor' || o.officeKey === 'sb') p = findOfficial(/vice\s*mayor/i);
  return p ? { name: p.name, position: p.position || '', photo: p.photo || '' } : null;
}
function sbMembers() {
  return cmsGetCollection('officials').filter(p => /sangguniang\s*bayan|councilor|\bsb\b|kagawad/i.test(p.position || '') && !/mayor|kabataan/i.test(p.position || ''));
}
function skOfficials() {
  return cmsGetCollection('officials').filter(p => /kabataan|\bsk\b/i.test(p.position || ''));
}
function personCardHtml(p) {
  const photo = p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)}" onerror="this.remove()">` : `<i class="fa fa-user"></i>`;
  return `<div class="pin-official-card">
      <div class="pin-official-photo">${photo}</div>
      <div class="pin-official-body">
        <div class="pin-official-name">${esc(p.name)}</div>
        <ul class="pin-official-info"><li>${esc(p.position || '')}</li></ul>
      </div>
    </div>`;
}

function officeCardHtml(o) {
  const head = officeHead(o);
  const svcCount = allServices().filter(s => s.officeId === o.id).length;
  return `<a class="oc-card" href="#office/${esc(o.id)}" onclick="openOffice('${jsStr(o.id)}');return false;">
      <span class="oc-logo">${officeLogoHtml(o)}</span>
      <span class="oc-body">
        <span class="oc-name">${esc(o.name)}</span>
        ${o.abbreviation ? `<span class="oc-abbr">${esc(o.abbreviation)}</span>` : ''}
        <span class="oc-head">${head ? `<i class="fa fa-user-tie"></i> ${esc(head.name)}` : '<span class="tbu">Office head to be updated</span>'}</span>
        ${svcCount ? `<span class="oc-meta"><i class="fa fa-list-check"></i> ${svcCount} service${svcCount === 1 ? '' : 's'}</span>` : ''}
      </span>
      <i class="fa fa-chevron-right oc-go" aria-hidden="true"></i>
    </a>`;
}

function renderGovernancePage() {
  const el = document.getElementById('governanceBranches');
  if (!el) return;
  const offices = allOffices();
  let html = BRANCHES.map(br => {
    const list = offices.filter(o => (o.branch || '').trim() === br.key);
    return `<div class="gov-branch gov-branch--${br.id}" id="gov-${br.id}">
        <div class="gov-branch-head">
          <div class="gov-branch-icon"><i class="fa ${br.icon}"></i></div>
          <div>
            <h2>${esc(br.title)}</h2>
            <p>${esc(br.desc)}</p>
          </div>
          <span class="gov-branch-count">${list.length} ${list.length === 1 ? 'office' : 'offices'}</span>
        </div>
        <div class="oc-grid">${list.length ? list.map(officeCardHtml).join('') : `<p>${tbu('No offices assigned to this branch yet.')}</p>`}</div>
      </div>`;
  }).join('');
  const others = offices.filter(o => !branchOf(o));
  if (others.length) {
    html += `<div class="gov-branch gov-branch--other" id="gov-other">
        <div class="gov-branch-head">
          <div class="gov-branch-icon"><i class="fa fa-sitemap"></i></div>
          <div><h2>Other Municipal Offices &amp; Units</h2><p>Offices not yet assigned to a branch in the Admin Console.</p></div>
          <span class="gov-branch-count">${others.length}</span>
        </div>
        <div class="oc-grid">${others.map(officeCardHtml).join('')}</div>
      </div>`;
  }
  el.innerHTML = html;
}

function goGov(section) {
  showPage('governance', { hash: 'governance/' + section, keepScroll: true });
  requestAnimationFrame(() => {
    const target = document.getElementById('gov-' + section);
    if (!target) { window.scrollTo({ top: 0 }); return; }
    const header = document.querySelector('.site-header-group');
    const offset = header ? header.getBoundingClientRect().height + 12 : 0;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
  });
  return false;
}

// Departments & Offices page (under LGU): directory of every office, grouped by branch.
function renderDepartmentsPage() {
  const el = document.getElementById('departmentsGrid');
  if (!el) return;
  const items = allOffices();
  if (!items.length) { el.innerHTML = `<p>${tbu('No offices added yet.')}</p>`; return; }
  const card = d => `
      <a class="dept-logo-card" href="#office/${esc(d.id)}" onclick="openOffice('${jsStr(d.id)}');return false;">
        <div class="dept-logo-img">${officeLogoHtml(d)}</div>
        <div class="dept-logo-name">${esc(d.name)}</div>
        ${d.abbreviation ? `<div class="dept-logo-abbr">${esc(d.abbreviation)}</div>` : ''}
        ${d.contact ? `<div class="dept-logo-contact"><i class="fa fa-phone"></i> ${esc(d.contact)}</div>` : ''}
        <span class="dept-logo-more">View office <i class="fa fa-arrow-right"></i></span>
      </a>`;
  const groups = BRANCHES.map(br => ({ title: br.title, list: items.filter(o => (o.branch || '').trim() === br.key) }))
    .concat([{ title: 'Other Municipal Offices & Units', list: items.filter(o => !branchOf(o)) }])
    .filter(g => g.list.length);
  el.classList.add('dept-groups');
  el.innerHTML = groups.map(g => `
      <div class="dept-group">
        <h3 class="dept-group-title">${esc(g.title)}</h3>
        <div class="dept-logo-grid">${g.list.map(card).join('')}</div>
      </div>`).join('');
}

// ── OFFICE PROFILE PAGE ──────────────────────────────────────────────
let currentOfficeId = null;
function openOffice(id) {
  currentOfficeId = id;
  renderOfficeProfile(id);
  showPage('office', { hash: 'office/' + id });
  return false;
}

function crumbsHtml(parts) {
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${parts.map((p, i) => i === parts.length - 1
    ? `<li aria-current="page">${esc(p.label)}</li>`
    : `<li><a href="#${esc(p.hash)}" onclick="${p.onclick};return false;">${esc(p.label)}</a></li>`).join('')}</ol></nav>`;
}

function serviceRowCompact(s) {
  return `<li class="op-svc">
      <div class="op-svc-main">
        <div class="op-svc-name">${esc(s.name)}</div>
        <div class="op-svc-pills">
          ${hasVal(s.processingTime) ? `<span class="svd-pill svd-time"><i class="fa fa-clock"></i> ${esc(s.processingTime)}</span>` : ''}
          ${feePillHtml(s.fees)}
          ${splitLines(s.steps).length ? '' : '<span class="svd-pill svd-pending"><i class="fa fa-hourglass-half"></i> Process to be updated</span>'}
        </div>
      </div>
      <button type="button" class="btn-sm" onclick="openService('${jsStr(s.id)}')">View Process</button>
    </li>`;
}

function parsePersonLine(line) {
  const parts = line.split(/\s+[—–-]\s+|\s*\|\s*/);
  return { name: parts[0] || line, role: parts.slice(1).join(' — ') };
}

function renderOfficeProfile(id) {
  const el = document.getElementById('officeProfile');
  if (!el) return;
  const o = officeById(id);
  if (!o) {
    el.innerHTML = `${crumbsHtml([{ label: 'Home', hash: 'home', onclick: "showPage('home')" }, { label: 'Governance', hash: 'governance', onclick: "showPage('governance')" }, { label: 'Office' }])}
      <div class="op-card"><h2>Office not found</h2><p>This office may have been renamed or removed. <a href="#governance" class="olink" onclick="showPage('governance');return false;">Browse all offices</a>.</p></div>`;
    return;
  }
  const br = branchOf(o);
  const head = officeHead(o);
  const services = allServices().filter(s => s.officeId === o.id);
  const isSK = o.officeKey === 'sk';
  const isSB = o.officeKey === 'sb';
  const projects = cmsGetCollection('projects').filter(p => p.officeId === o.id || (isSK && /youth|\bsk\b/i.test(p.category || '')));
  const plans = cmsGetCollection('budgetPlans').filter(b => b.officeId === o.id);
  const budgetDocs = cmsGetCollection('budget').filter(b => b.officeId === o.id);
  const docs = cmsGetCollection('documents').filter(d => d.officeId === o.id);
  const posts = [
    ...cmsGetCollectionAll('news').filter(n => n.officeId === o.id).map(n => ({ kind: 'news', item: n, state: contentState(n, 'news') })),
    ...cmsGetCollectionAll('announcements').filter(a => a.officeId === o.id).map(a => ({ kind: 'ann', item: a, state: contentState(a, 'ann') })),
  ].filter(x => x.state === 'current' || x.state === 'archived')
   .sort((a, b) => String(b.item.date || '').localeCompare(String(a.item.date || ''))).slice(0, 8);
  const functions = splitLines(o.functions);
  const personnel = splitLines(o.personnel).map(parsePersonLine);
  const desc = paragraphs(o.description);

  const crumbs = [{ label: 'Home', hash: 'home', onclick: "showPage('home')" }];
  if (br) { crumbs.push({ label: 'Governance', hash: 'governance', onclick: "showPage('governance')" }); crumbs.push({ label: br.id === 'national' ? 'National Agencies' : br.title, hash: 'governance/' + br.id, onclick: `goGov('${br.id}')` }); }
  else crumbs.push({ label: 'Offices', hash: 'departments', onclick: "showPage('departments')" });
  crumbs.push({ label: o.name });

  const headPhoto = head && head.photo ? `<img src="${esc(head.photo)}" alt="${esc(head.name)}" onerror="this.outerHTML='<i class=\\'fa fa-user-tie\\'></i>'">` : '<i class="fa fa-user-tie"></i>';

  const sbHtml = isSB ? (() => {
    const members = sbMembers();
    return `<div class="op-card"><h2><i class="fa fa-users"></i> Members of the Sangguniang Bayan</h2>
        ${members.length ? `<div class="pin-officials-grid op-people">${members.map(personCardHtml).join('')}</div>` : `<p>${tbu()}</p>`}
      </div>`;
  })() : '';

  const skHtml = isSK ? (() => {
    const offs = skOfficials();
    const plansDocs = (cmsGetCollection('youthplan') || []).filter(d => d && d.docUrl);
    const latest = plansDocs[plansDocs.length - 1];
    return `<div class="op-card"><h2><i class="fa fa-users"></i> SK Officials</h2>
          ${offs.length ? `<div class="pin-officials-grid op-people">${offs.map(personCardHtml).join('')}</div>` : `<p>${tbu()}</p>`}
        </div>
        <div class="op-card op-lydp" id="op-lydp">
          <h2><i class="fa fa-file-lines"></i> Local Youth Development Plan</h2>
          <p class="op-muted">The official roadmap guiding youth programs, projects, and activities of the Sangguniang Kabataan and the Municipality of Cortes.</p>
          ${latest ? `<div class="op-lydp-row">
              <div><strong>${esc(latest.title || 'Local Youth Development Plan')}</strong>${latest.year ? ` <span class="op-muted">(${esc(latest.year)})</span>` : ''}
                ${plansDocs.length > 1 ? `<div class="op-muted">${plansDocs.length - 1} earlier version${plansDocs.length > 2 ? 's' : ''} also available</div>` : ''}</div>
              <button type="button" class="btn-sm btn-sm--solid" onclick="showPage('youthplan')"><i class="fa fa-up-right-from-square"></i> Open the Plan</button>
            </div>` : `<p>${tbu('The Local Youth Development Plan document is to be uploaded by the administrator.')}</p>`}
        </div>`;
  })() : '';

  const projectsHtml = projects.length
    ? `<div class="dt-wrap"><table class="dt dt--cards dt--compact"><thead><tr><th>Project / Program</th><th>Category</th><th>Status</th><th>Progress</th><th>Year</th><th><span class="sr-only">Details</span></th></tr></thead>
        <tbody>${projects.map(p => `<tr>
          <td data-label="Project"><button type="button" class="linklike" onclick="openProjectModal('${jsStr(p.id)}')">${esc(p.title)}</button></td>
          <td data-label="Category">${valOr(p.category, '—')}</td>
          <td data-label="Status">${statusBadge(p.status)}</td>
          <td data-label="Progress">${progressHtml(p)}</td>
          <td data-label="Year">${valOr(projectYear(p), '—')}</td>
          <td><button type="button" class="btn-sm" onclick="openProjectModal('${jsStr(p.id)}')">View</button></td></tr>`).join('')}</tbody></table></div>`
    : `<p class="op-muted">No projects or programs have been posted for this office yet.</p>`;

  const planHtml = (plans.length || budgetDocs.length) ? `<div class="op-card"><h2><i class="fa fa-coins"></i> Budget &amp; Planning</h2>
      ${plans.length ? `<div class="dt-wrap"><table class="dt dt--cards dt--compact"><thead><tr><th>Fiscal Year</th><th>Program / Project</th><th>Funding Source</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>${plans.map(b => `<tr><td data-label="Fiscal Year">${valOr(b.fiscalYear, '—')}</td><td data-label="Program / Project">${esc([b.program, b.project].filter(Boolean).join(' — ') || b.title || '—')}</td><td data-label="Funding Source">${valOr(b.fundingSource, '—')}</td><td data-label="Amount">${fmtAmount(b.amount)}</td><td data-label="Status">${valOr(b.status, '—')}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${budgetDocs.length ? `<ul class="yu-list">${budgetDocListHtml(budgetDocs)}</ul>` : ''}
    </div>` : '';

  const postsHtml = posts.length
    ? `<ul class="op-posts">${posts.map(x => `<li>
        <a href="#" onclick="${x.kind === 'news' ? `openNewsArticle('${jsStr(x.item.id)}')` : `openAnnouncementArticle('${jsStr(x.item.id)}')`};return false;">${esc(x.item.title || x.item.tag || 'Announcement')}</a>
        <span class="op-post-meta">${x.kind === 'news' ? 'News' : 'Announcement'}${x.item.date ? ' · ' + fmtNewsDate(x.item.date) : ''}${x.state === 'archived' ? ' · <span class="arch-badge">Archived</span>' : ''}</span>
      </li>`).join('')}</ul>`
    : `<p class="op-muted">No announcements or news have been posted for this office yet.</p>`;

  const docList = [...docs.map(d => ({ title: d.title, url: d.fileUrl, fileName: d.fileUrlName, meta: [d.category, d.date ? fmtNewsDate(d.date) : ''].filter(Boolean).join(' · ') })),
    ...services.filter(s => s.formUrl).map(s => ({ title: 'Form: ' + s.name, url: s.formUrl, fileName: s.formUrlName, meta: 'Service form' }))];
  const docsHtml = docList.length
    ? `<ul class="yu-list">${docList.map(d => `<li class="yu-doc-row"><span class="yu-doc-title"><i class="fa fa-file-lines"></i> ${esc(d.title)}${d.meta ? `<span class="yu-doc-office">${esc(d.meta)}</span>` : ''}</span>${fileDownloadButtons(d.url, d.title, d.fileName) || '<span class="yu-doc-missing">Not uploaded yet</span>'}</li>`).join('')}</ul>`
    : `<p class="op-muted">No documents or forms have been posted for this office yet.</p>`;

  const contactLine = (icon, label, value, href) => `<div class="op-qi-row"><i class="fa ${icon}"></i><div><div class="op-qi-label">${esc(label)}</div><div class="op-qi-val">${hasVal(value) ? (href ? `<a href="${esc(href)}" ${/^https?:/.test(href) ? 'target="_blank" rel="noopener"' : ''}>${esc(value)}</a>` : esc(value)) : tbuShort()}</div></div></div>`;

  el.innerHTML = `
    ${crumbsHtml(crumbs)}
    <header class="op-hero op-hero--${br ? br.id : 'other'}">
      <div class="op-logo">${officeLogoHtml(o)}</div>
      <div class="op-hero-body">
        <span class="op-branch">${esc(br ? br.title : 'Municipal Office')}</span>
        <h1>${esc(o.name)}</h1>
        ${o.abbreviation ? `<div class="op-abbr">${esc(o.abbreviation)}</div>` : ''}
        <p class="op-lead">${desc.length ? esc(desc[0]) : tbu()}</p>
        ${br && br.id === 'national' ? '<p class="op-note"><i class="fa fa-circle-info"></i> National government agency operating within the LGU — not a municipal office.</p>' : ''}
      </div>
    </header>

    <div class="op-layout">
      <div class="op-main">
        <div class="op-card op-headcard">
          <div class="op-head-photo">${headPhoto}</div>
          <div>
            <div class="op-head-label">${isSB ? 'Presiding Officer' : 'Office Head'}</div>
            <div class="op-head-name">${head ? esc(head.name) : tbu()}</div>
            <div class="op-head-pos">${head && head.position ? esc(head.position) : (head ? '' : '')}</div>
          </div>
        </div>

        <div class="op-card">
          <h2><i class="fa fa-circle-info"></i> About the Office</h2>
          ${desc.length ? desc.map(p => `<p>${esc(p)}</p>`).join('') : `<p>${tbu()}</p>`}
          <h3>Main Functions &amp; Responsibilities</h3>
          ${functions.length ? `<ul class="op-list">${functions.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : `<p>${tbu()}</p>`}
        </div>

        ${sbHtml}
        ${skHtml}

        <div class="op-card">
          <h2><i class="fa fa-people-group"></i> Personnel &amp; Sections</h2>
          ${personnel.length ? `<ul class="op-personnel">${personnel.map(p => `<li><span class="op-p-name">${esc(p.name)}</span>${p.role ? `<span class="op-p-role">${esc(p.role)}</span>` : ''}</li>`).join('')}</ul>` : `<p>${tbu()}</p>`}
        </div>

        <div class="op-card" id="op-services">
          <h2><i class="fa fa-list-check"></i> Services Offered ${services.length ? `<span class="op-count">${services.length}</span>` : ''}</h2>
          ${services.length ? `<ul class="op-svcs">${services.map(serviceRowCompact).join('')}</ul>` : `<p class="op-muted">No services are listed for this office yet.</p>`}
        </div>

        <div class="op-card">
          <h2><i class="fa fa-diagram-project"></i> ${isSK ? 'Youth Programs &amp; Projects' : 'Projects &amp; Programs'}</h2>
          ${projectsHtml}
        </div>

        ${planHtml}

        <div class="op-card">
          <h2><i class="fa fa-bullhorn"></i> Announcements &amp; News</h2>
          ${postsHtml}
        </div>

        <div class="op-card">
          <h2><i class="fa fa-folder-open"></i> Documents &amp; Forms</h2>
          ${docsHtml}
        </div>
      </div>

      <aside class="op-side">
        <div class="op-card op-quick">
          <h2>Quick Information</h2>
          ${contactLine('fa-location-dot', 'Office Location', o.location)}
          ${contactLine('fa-clock', 'Office Hours', o.hours)}
          ${contactLine('fa-phone', 'Contact Number', o.contact, hasVal(o.contact) && /^[\d\s+()-]+$/.test(o.contact) ? 'tel:' + o.contact.replace(/[^\d+]/g, '') : '')}
          ${contactLine('fa-envelope', 'Email', o.email, hasVal(o.email) ? 'mailto:' + o.email : '')}
          ${o.facebook ? contactLine('fa-brands fa-facebook', 'Facebook', 'Facebook Page', o.facebook) : ''}
          <div class="op-qi-row"><i class="fa fa-list-check"></i><div><div class="op-qi-label">Services</div><div class="op-qi-val">${services.length ? `<a href="#op-services" onclick="document.getElementById('op-services').scrollIntoView({behavior:'smooth'});return false;">${services.length} service${services.length === 1 ? '' : 's'} offered</a>` : 'None listed yet'}</div></div></div>
        </div>
        <a class="op-back" href="#governance" onclick="${br ? `goGov('${br.id}')` : "showPage('departments')"};return false;"><i class="fa fa-arrow-left"></i> ${br ? 'Back to ' + esc(br.id === 'national' ? 'National Agencies' : br.title) : 'All Offices'}</a>
      </aside>
    </div>`;
}

// ── SERVICES DIRECTORY + CITIZEN'S CHARTER (one data source) ───────────
function allServices() { return cmsGetCollection('services'); }
function feeKind(fee) {
  const f = String(fee || '').trim().toLowerCase();
  if (!f) return 'unset';
  if (/free|no fee|none|walang bayad/.test(f)) return 'free';
  return 'paid';
}
function feePillHtml(fee) {
  const k = feeKind(fee);
  if (k === 'free') return `<span class="svd-pill svd-free"><i class="fa fa-check-circle"></i> ${esc(fee)}</span>`;
  if (k === 'paid') return `<span class="svd-pill svd-fee"><i class="fa fa-tag"></i> ${esc(fee)}</span>`;
  return `<span class="svd-pill svd-pending" title="${esc(TBU)}"><i class="fa fa-tag"></i> Fee to be updated</span>`;
}
function timeBucket(t) {
  const s = String(t || '').toLowerCase();
  if (!s.trim() || /varies|ongoing|depend/.test(s)) return 'varies';
  if (/day|week|month/.test(s)) return 'long';
  const h = s.match(/(\d+(?:\.\d+)?)\s*(?:hr|hour)/);
  const m = s.match(/(\d+)\s*min/);
  if (!h && !m) return 'varies';
  const mins = (h ? parseFloat(h[1]) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
  return mins <= 30 ? 'short' : 'day';
}
function serviceHaystack(s) {
  return [s.name, s.category, s.description, s.requirements, s.steps, s.fees, s.processingTime, s.responsible, officeNameOf(s), (officeById(s.officeId) || {}).abbreviation].join(' ');
}

function renderServicesDirectory() {
  const tbody = document.querySelector('#svcTable tbody');
  if (!tbody) return;
  const all = allServices();
  fillSelect(document.getElementById('svcOffice'), officeIdsIn(all), 'All Offices', officeSelectLabel);
  fillSelect(document.getElementById('svcCategory'), uniqSorted(all.map(s => s.category)), 'All Categories');

  const q = inputVal('svcSearch'), office = inputVal('svcOffice'), cat = inputVal('svcCategory'), fee = inputVal('svcFee'), time = inputVal('svcTime');
  const list = all.filter(s =>
    (!office || s.officeId === office) &&
    (!cat || s.category === cat) &&
    (!fee || feeKind(s.fees) === fee) &&
    (!time || timeBucket(s.processingTime) === time) &&
    matchesQuery(serviceHaystack(s), q));

  const offCount = new Set(list.map(s => s.officeId)).size;
  const countEl = document.getElementById('svcCount');
  if (countEl) countEl.textContent = list.length === all.length
    ? `Showing all ${all.length} services across ${offCount} offices`
    : `${list.length} of ${all.length} services match your filters`;

  if (!list.length) {
    tbody.innerHTML = `<tr class="dt-empty"><td colspan="7"><i class="fa fa-folder-open"></i> No services match your search. Try a different keyword, or <a href="#" class="olink" onclick="openContact();return false;">contact the LGU</a> directly.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(s => {
    const reqs = splitLines(s.requirements);
    return `<tr>
        <td data-label="Service"><button type="button" class="linklike dt-title" onclick="openService('${jsStr(s.id)}')">${esc(s.name)}</button>${s.category ? `<div class="dt-sub">${esc(s.category)}</div>` : ''}</td>
        <td data-label="Office">${officeLinkHtml(s)}</td>
        <td data-label="Requirements">${reqs.length ? `<ul class="dt-reqs">${reqs.slice(0, 2).map(r => `<li>${esc(r)}</li>`).join('')}</ul>${reqs.length > 2 ? `<span class="dt-more">+${reqs.length - 2} more</span>` : ''}` : tbuShort()}</td>
        <td data-label="Processing Time">${hasVal(s.processingTime) ? esc(s.processingTime) : tbuShort()}</td>
        <td data-label="Fee">${feePillHtml(s.fees)}</td>
        <td data-label="Responsible">${hasVal(s.responsible) ? esc(s.responsible) : tbuShort()}</td>
        <td class="dt-action"><button type="button" class="btn-sm" onclick="openService('${jsStr(s.id)}')"><i class="fa fa-list-ol"></i> View Process</button></td>
      </tr>`;
  }).join('');
}

function lguFeedbackHtml(o) {
  const lines = [];
  if (o && hasVal(o.contact)) lines.push(`<i class="fa fa-phone"></i> ${esc(o.contact)}`);
  if (o && hasVal(o.email)) lines.push(`<i class="fa fa-envelope"></i> <a href="mailto:${esc(o.email)}">${esc(o.email)}</a>`);
  if (!lines.length) {
    const tl = cmsGetSetting('trunkline').trim(), em = cmsGetSetting('email').trim();
    if (tl) lines.push(`<i class="fa fa-phone"></i> Municipal Hotline: ${esc(tl)}`);
    if (em) lines.push(`<i class="fa fa-envelope"></i> <a href="mailto:${esc(em)}">${esc(em)}</a>`);
  }
  return `<div class="xm-feedback"><h3>Feedback &amp; Inquiries</h3>
      ${lines.length ? `<p>${lines.join('<br>')}</p>` : ''}
      <button type="button" class="btn-sm" onclick="closeDetailModal();openContact()"><i class="fa fa-paper-plane"></i> Send a message</button>
    </div>`;
}

function openService(id) {
  const s = allServices().find(x => x.id === id);
  if (!s) return false;
  const o = officeById(s.officeId);
  const reqs = splitLines(s.requirements), steps = splitLines(s.steps);
  const forms = [
    ...(s.formUrl ? [{ title: s.formUrlName || 'Application form', url: s.formUrl, fileName: s.formUrlName }] : []),
    ...cmsGetCollection('documents').filter(d => d.serviceId === s.id && d.fileUrl).map(d => ({ title: d.title, url: d.fileUrl, fileName: d.fileUrlName })),
  ];
  const fact = (icon, label, value) => `<div class="xm-fact"><i class="fa ${icon}"></i><div><div class="xm-fact-label">${esc(label)}</div><div class="xm-fact-val">${hasVal(value) ? esc(value) : tbuShort()}</div></div></div>`;
  openDetailModal(`
    <div class="xm-eyebrow">${esc(s.category || 'Municipal Service')}</div>
    <h2 id="detailModalTitle">${esc(s.name)}</h2>
    <div class="xm-office"><i class="fa fa-building"></i> ${officeLinkHtml(s)}</div>
    ${hasVal(s.description) ? `<p class="xm-desc">${esc(s.description)}</p>` : ''}
    <div class="xm-facts">
      ${fact('fa-clock', 'Processing Time', s.processingTime)}
      ${fact('fa-tag', 'Fees', s.fees)}
      ${fact('fa-user-check', 'Who May Avail', s.whoMayAvail)}
      ${fact('fa-user-tie', 'Person / Office Responsible', s.responsible)}
      ${fact('fa-inbox', 'Where to Submit', s.whereToSubmit)}
    </div>
    <h3>Requirements</h3>
    ${reqs.length ? `<ul class="xm-reqs">${reqs.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : `<p>${tbu()}</p>`}
    <h3>Step-by-Step Process</h3>
    ${steps.length ? `<ol class="xm-steps">${steps.map(st => `<li>${esc(st)}</li>`).join('')}</ol>` : `<p>${tbu('The step-by-step process for this service is to be updated by the administrator.')}</p>`}
    ${forms.length ? `<h3>Downloadable Forms</h3><ul class="yu-list">${forms.map(f => `<li class="yu-doc-row"><span class="yu-doc-title"><i class="fa fa-file-lines"></i> ${esc(f.title)}</span>${fileDownloadButtons(f.url, f.title, f.fileName)}</li>`).join('')}</ul>` : ''}
    ${lguFeedbackHtml(o)}
    ${s.source ? `<div class="xm-source">Source: ${esc(s.source)}</div>` : ''}
  `);
  return false;
}

function renderCharterPage() {
  const body = document.getElementById('charterBody');
  if (!body) return;
  const all = allServices();
  fillSelect(document.getElementById('charterOffice'), officeIdsIn(all), 'All Offices', officeSelectLabel);
  const q = inputVal('charterSearch'), office = inputVal('charterOffice');
  const list = all.filter(s => (!office || s.officeId === office) && matchesQuery(serviceHaystack(s), q));
  const orderedOffices = [...allOffices()].sort((a, b) => {
    const ia = BRANCHES.findIndex(x => x.key === a.branch), ib = BRANCHES.findIndex(x => x.key === b.branch);
    return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib);
  });
  const groups = orderedOffices.map(o => ({ o, svcs: list.filter(s => s.officeId === o.id) })).filter(g => g.svcs.length);
  const orphan = list.filter(s => !officeById(s.officeId));
  if (orphan.length) groups.push({ o: null, svcs: orphan });

  body.innerHTML = groups.length ? groups.map(g => `
      <div class="charter-office">
        <div class="charter-office-head">
          <div class="charter-office-logo">${officeLogoHtml(g.o)}</div>
          <div>
            <h2>${g.o ? `<a href="#office/${esc(g.o.id)}" onclick="openOffice('${jsStr(g.o.id)}');return false;">${esc(g.o.name)}</a>` : 'Other Services'}</h2>
            <div class="charter-office-sub">${g.o && branchOf(g.o) ? esc(branchOf(g.o).title) + ' · ' : ''}${g.svcs.length} service${g.svcs.length === 1 ? '' : 's'}</div>
          </div>
        </div>
        <div class="dt-wrap"><table class="dt dt--cards charter-table">
          <thead><tr><th>Service</th><th>Who May Avail</th><th>Requirements</th><th>Step-by-Step Procedure</th><th>Processing Time</th><th>Fees</th><th>Person Responsible</th></tr></thead>
          <tbody>${g.svcs.map(s => {
            const reqs = splitLines(s.requirements), steps = splitLines(s.steps);
            return `<tr>
              <td data-label="Service"><button type="button" class="linklike dt-title" onclick="openService('${jsStr(s.id)}')">${esc(s.name)}</button></td>
              <td data-label="Who May Avail">${hasVal(s.whoMayAvail) ? esc(s.whoMayAvail) : tbuShort()}</td>
              <td data-label="Requirements">${reqs.length ? `<ul class="dt-reqs">${reqs.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : tbuShort()}</td>
              <td data-label="Procedure">${steps.length ? `<ol class="dt-steps">${steps.map(r => `<li>${esc(r)}</li>`).join('')}</ol>` : tbuShort()}</td>
              <td data-label="Processing Time">${hasVal(s.processingTime) ? esc(s.processingTime) : tbuShort()}</td>
              <td data-label="Fees">${hasVal(s.fees) ? esc(s.fees) : tbuShort()}</td>
              <td data-label="Responsible">${hasVal(s.responsible) ? esc(s.responsible) : tbuShort()}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>`).join('')
    : `<div class="dt-empty-box"><i class="fa fa-folder-open"></i> No services match your search.</div>`;

  const fb = document.getElementById('charterFeedback');
  if (fb) {
    const tl = cmsGetSetting('trunkline').trim(), em = cmsGetSetting('email').trim(), addr = cmsGetSetting('contactAddress').trim();
    fb.innerHTML = `<h3><i class="fa fa-comments"></i> Feedback &amp; Complaints</h3>
      <p>For feedback, suggestions, or complaints about any service in this Charter, contact the office concerned or the Municipality of Cortes:</p>
      <p>${addr ? `<i class="fa fa-location-dot"></i> ${esc(addr)}<br>` : ''}${tl ? `<i class="fa fa-phone"></i> ${esc(tl)}<br>` : ''}${em ? `<i class="fa fa-envelope"></i> <a href="mailto:${esc(em)}">${esc(em)}</a>` : ''}${!addr && !tl && !em ? tbu() : ''}</p>
      <button type="button" class="btn-sm btn-sm--solid" onclick="openContact()"><i class="fa fa-paper-plane"></i> Send Feedback</button>`;
  }
}

// ── DOWNLOADS & FORMS ────────────────────────────────────────────────
function allDownloadRows() {
  const docs = cmsGetCollection('documents').map(d => ({ id: d.id, title: d.title, officeId: d.officeId, category: d.category || 'Document', date: d.date || '', description: d.description || '', url: d.fileUrl, fileName: d.fileUrlName }));
  const forms = allServices().filter(s => s.formUrl).map(s => ({ id: 'svc-' + s.id, title: (s.formUrlName || 'Form') + ' — ' + s.name, officeId: s.officeId, category: 'Service Form', date: '', description: '', url: s.formUrl, fileName: s.formUrlName }));
  return [...docs, ...forms];
}
function renderDownloadsPage() {
  const tbody = document.querySelector('#dlTable tbody');
  if (!tbody) return;
  const all = allDownloadRows();
  fillSelect(document.getElementById('dlOffice'), officeIdsIn(all), 'All Offices', officeSelectLabel);
  fillSelect(document.getElementById('dlCategory'), uniqSorted(all.map(d => d.category)), 'All Categories');
  const q = inputVal('dlSearch'), office = inputVal('dlOffice'), cat = inputVal('dlCategory');
  const list = all.filter(d => (!office || d.officeId === office) && (!cat || d.category === cat) && matchesQuery([d.title, d.description, d.category, officeNameOf(d)].join(' '), q))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const countEl = document.getElementById('dlCount');
  if (countEl) countEl.textContent = all.length ? `${list.length} of ${all.length} documents` : '';
  tbody.innerHTML = list.length ? list.map(d => `<tr>
      <td data-label="Document"><span class="dt-title">${esc(d.title)}</span>${d.description ? `<div class="dt-sub">${esc(d.description)}</div>` : ''}</td>
      <td data-label="Office">${officeLinkHtml(d, '—')}</td>
      <td data-label="Category">${esc(d.category)}</td>
      <td data-label="Date">${d.date ? fmtNewsDate(d.date) : '—'}</td>
      <td class="dt-action">${fileDownloadButtons(d.url, d.title, d.fileName) || '<span class="yu-doc-missing">Not uploaded yet</span>'}</td>
    </tr>`).join('')
    : `<tr class="dt-empty"><td colspan="5"><i class="fa fa-folder-open"></i> ${all.length ? 'No documents match your filters.' : 'No forms or documents have been posted yet.'}</td></tr>`;
}

// ── PROJECTS (tabular monitoring) ──────────────────────────────────────
const PROJECT_STATUSES = ['Planning', 'Proposed', 'Ongoing', 'Completed', 'On Hold'];
function normStatus(s) {
  const v = String(s || '').trim().toLowerCase();
  return PROJECT_STATUSES.find(x => x.toLowerCase() === v) || (v ? s : 'Ongoing');
}
function projectStatusColor(status) {
  switch (normStatus(status)) {
    case 'Completed': return '#1c8a5b';
    case 'Planning': return 'var(--navy-mid)';
    case 'Proposed': return '#6b4fa3';
    case 'On Hold': return '#8a94a3';
    default: return '#b7861f'; // Ongoing
  }
}
function statusBadge(status) {
  const st = normStatus(status);
  return `<span class="st-badge st-${st.toLowerCase().replace(/\s+/g, '-')}">${esc(st)}</span>`;
}
// Progress is shown ONLY when an official figure has been entered in Admin.
function progressVal(p) {
  const v = String(p.progress ?? '').replace('%', '').trim();
  if (v === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : Math.max(0, Math.min(100, n));
}
function progressHtml(p) {
  const n = progressVal(p);
  if (n === null) return `<span class="pbar-none" title="No official percentage has been reported">—</span>`;
  return `<div class="pbar-wrap"><div class="pbar" role="progressbar" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="100" aria-label="${n}% complete"><div class="pbar-fill" style="width:${n}%;background:${projectStatusColor(p.status)}"></div></div><span class="pbar-num">${n}%</span></div>`;
}
function projectYear(p) { return p.year || String(p.startDate || '').slice(0, 4) || ''; }
function fmtAmount(v) {
  const raw = String(v ?? '').trim();
  if (!raw) return '—';
  const n = Number(raw.replace(/[₱,\s]/g, ''));
  return isNaN(n) ? esc(raw) : '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function projectRowHtml(p) {
  return `<tr>
      <td data-label="Project / Program"><button type="button" class="linklike dt-title" onclick="openProjectModal('${jsStr(p.id)}')">${esc(p.title)}</button>${p.location ? `<div class="dt-sub"><i class="fa fa-location-dot"></i> ${esc(p.location)}</div>` : ''}</td>
      <td data-label="Office">${officeLinkHtml(p)}</td>
      <td data-label="Category">${valOr(p.category, '—')}</td>
      <td data-label="Status">${statusBadge(p.status)}</td>
      <td data-label="Progress">${progressHtml(p)}</td>
      <td data-label="Year">${valOr(projectYear(p), '—')}</td>
      <td class="dt-action"><button type="button" class="btn-sm" onclick="openProjectModal('${jsStr(p.id)}')">View</button></td>
    </tr>`;
}
function renderProjectsPage() {
  const tbody = document.querySelector('#projectsTable tbody');
  const statsEl = document.getElementById('projectsStats');
  if (!tbody) return;
  const all = cmsGetCollection('projects');
  if (statsEl) {
    const c = st => all.filter(p => normStatus(p.status) === st).length;
    statsEl.innerHTML = `<button type="button" class="proj-stat-card" onclick="document.getElementById('projStatus').value='';renderProjectsPage()"><div class="proj-stat-num">${all.length}</div><div class="proj-stat-label">Total</div></button>` +
      PROJECT_STATUSES.map(st => `<button type="button" class="proj-stat-card" onclick="document.getElementById('projStatus').value='${st}';renderProjectsPage()"><div class="proj-stat-num" style="color:${projectStatusColor(st)}">${c(st)}</div><div class="proj-stat-label">${st}</div></button>`).join('');
  }
  fillSelect(document.getElementById('projOffice'), officeIdsIn(all), 'All Offices', officeSelectLabel);
  fillSelect(document.getElementById('projCategory'), uniqSorted(all.map(p => p.category)), 'All Categories');
  fillSelect(document.getElementById('projYear'), uniqSorted(all.map(projectYear)).reverse(), 'All Years');
  const q = inputVal('projSearch'), office = inputVal('projOffice'), cat = inputVal('projCategory'), year = inputVal('projYear'), status = inputVal('projStatus');
  const list = all.filter(p => (!office || p.officeId === office) && (!cat || p.category === cat) && (!year || projectYear(p) === year) && (!status || normStatus(p.status) === status) &&
    matchesQuery([p.title, p.description, p.location, p.fundingSource, p.category, p.remarks, officeNameOf(p)].join(' '), q))
    .sort((a, b) => String(projectYear(b)).localeCompare(String(projectYear(a))));
  const countEl = document.getElementById('projCount');
  if (countEl) countEl.textContent = all.length ? `${list.length} of ${all.length} projects and programs` : '';
  tbody.innerHTML = list.length ? list.map(projectRowHtml).join('')
    : `<tr class="dt-empty"><td colspan="7"><i class="fa fa-folder-open"></i> ${all.length ? 'No projects match your filters.' : 'No projects have been posted yet.'}</td></tr>`;
}
function renderHomeProjects() {
  const el = document.getElementById('homeProjectsTable');
  if (!el) return;
  const all = cmsGetCollection('projects');
  const rank = p => (p.featured === 'Yes' ? 0 : 2) + (normStatus(p.status) === 'Ongoing' ? 0 : 1);
  const list = all.slice().sort((a, b) => rank(a) - rank(b) || String(projectYear(b)).localeCompare(String(projectYear(a)))).slice(0, 6);
  el.innerHTML = list.length
    ? `<div class="dt-wrap"><table class="dt dt--cards"><thead><tr><th>Project / Program</th><th>Office</th><th>Category</th><th>Status</th><th>Progress</th><th>Year</th><th><span class="sr-only">Details</span></th></tr></thead><tbody>${list.map(projectRowHtml).join('')}</tbody></table></div>`
    : `<p class="op-muted">No projects have been posted yet.</p>`;
}
function openProjectModal(id) {
  const p = cmsGetCollection('projects').find(x => x.id === id);
  if (!p) return false;
  const fact = (icon, label, value) => `<div class="xm-fact"><i class="fa ${icon}"></i><div><div class="xm-fact-label">${esc(label)}</div><div class="xm-fact-val">${value}</div></div></div>`;
  const n = progressVal(p);
  openDetailModal(`
    ${p.image ? `<div class="xm-image" style="background-image:url('${esc(p.image)}')" onclick="openImgLightbox('${jsStr(p.image)}')" role="img" aria-label="${esc(p.title)}"></div>` : ''}
    <div class="xm-eyebrow">${esc(p.category || 'Project')}</div>
    <h2 id="detailModalTitle">${esc(p.title)}</h2>
    <div class="xm-office"><i class="fa fa-building"></i> ${officeLinkHtml(p)}</div>
    <div class="xm-status-row">${statusBadge(p.status)} ${n !== null ? progressHtml(p) : '<span class="op-muted">No official progress percentage reported.</span>'}</div>
    ${hasVal(p.description) ? `<p class="xm-desc">${esc(p.description)}</p>` : ''}
    <div class="xm-facts">
      ${fact('fa-hand-holding-dollar', 'Funding Source', valOr(p.fundingSource, '—'))}
      ${fact('fa-coins', 'Budget', fmtAmount(p.budget))}
      ${fact('fa-calendar', 'Year', valOr(projectYear(p), '—'))}
      ${fact('fa-play', 'Start Date', p.startDate ? fmtNewsDate(p.startDate) : '—')}
      ${fact('fa-flag-checkered', 'Target Completion', p.targetDate ? fmtNewsDate(p.targetDate) : '—')}
      ${fact('fa-location-dot', 'Location', valOr(p.location, '—'))}
    </div>
    ${hasVal(p.remarks) ? `<h3>Remarks</h3><p class="xm-desc">${esc(p.remarks)}</p>` : ''}
  `);
  return false;
}

// ── BUDGET & PLANNING (office-attributed records) ───────────────────────
function renderBudgetPlans() {
  const tbody = document.querySelector('#bpTable tbody');
  if (!tbody) return;
  const all = cmsGetCollection('budgetPlans');
  fillSelect(document.getElementById('bpOffice'), officeIdsIn(all), 'All Offices', officeSelectLabel);
  fillSelect(document.getElementById('bpYear'), uniqSorted(all.map(b => b.fiscalYear)).reverse(), 'All Years');
  const q = inputVal('bpSearch'), office = inputVal('bpOffice'), year = inputVal('bpYear');
  const list = all.filter(b => (!office || b.officeId === office) && (!year || b.fiscalYear === year) &&
    matchesQuery([b.program, b.project, b.department, b.fundingSource, b.description, b.status, officeNameOf(b)].join(' '), q))
    .sort((a, b) => String(b.fiscalYear || '').localeCompare(String(a.fiscalYear || '')));
  tbody.innerHTML = list.length ? list.map(b => `<tr>
      <td data-label="Fiscal Year">${valOr(b.fiscalYear, '—')}</td>
      <td data-label="Office / Department">${officeLinkHtml(b)}${hasVal(b.department) ? `<div class="dt-sub">${esc(b.department)}</div>` : ''}</td>
      <td data-label="Program / Project"><span class="dt-title">${esc(b.program || '—')}</span>${hasVal(b.project) ? `<div class="dt-sub">${esc(b.project)}</div>` : ''}${hasVal(b.description) ? `<div class="dt-sub">${esc(b.description)}</div>` : ''}</td>
      <td data-label="Funding Source">${valOr(b.fundingSource, '—')}</td>
      <td data-label="Budget Amount">${fmtAmount(b.amount)}</td>
      <td data-label="Status">${valOr(b.status, '—')}</td>
      <td class="dt-action">${fileDownloadButtons(b.docUrl, b.program || 'Document', b.docUrlName) || '—'}</td>
    </tr>`).join('')
    : `<tr class="dt-empty"><td colspan="7"><i class="fa fa-folder-open"></i> ${all.length ? 'No records match your filters.' : 'No budget or planning records have been posted yet.'}</td></tr>`;
}

// ── NEWS & ANNOUNCEMENTS LIFECYCLE / ARCHIVE ──────────────────────────
// A post is: draft → scheduled (publish date in the future) → current →
// archived. It becomes archived when (a) an admin archives it, (b) its own
// Archive Date is reached, or (c) — if it has no Archive Date — it is older
// than the "auto-archive after N days" setting (Admin → News; 0 = never).
// Archived posts are never deleted and stay readable in the News Archive.
function newsArchiveDays() {
  const n = parseInt(cmsGetSetting('newsArchiveDays'), 10);
  return isNaN(n) ? 30 : Math.max(0, n);
}
function addDaysIso(iso, days) {
  const d = new Date(String(iso) + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function contentState(item, kind) {
  const today = todayIso();
  const live = kind === 'news' ? (item.status || 'Published') === 'Published' : (item.active || 'Active') === 'Active';
  if (!live) return 'draft';
  if (item.publishAt && item.publishAt > today) return 'scheduled';
  if (item.archived) return 'archived';
  if (item.archiveAt) return item.archiveAt <= today ? 'archived' : 'current';
  const days = newsArchiveDays();
  if (days > 0 && item.date) { const cut = addDaysIso(item.date, days); if (cut && cut <= today) return 'archived'; }
  return 'current';
}
function newsByState(states) {
  return cmsGetCollectionAll('news').filter(n => states.includes(contentState(n, 'news')))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}
function annByState(states) {
  return cmsGetCollectionAll('announcements').filter(a => states.includes(contentState(a, 'ann')))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}
// Homepage + slider use CURRENT items only.
function sortedPublishedNews() { return newsByState(['current']); }
function sortedActiveAnnouncements() { return annByState(['current']); }

let newsView = 'current';
function viewStates() { return newsView === 'archived' ? ['archived'] : newsView === 'all' ? ['current', 'archived'] : ['current']; }
function setNewsView(v) {
  newsView = ['current', 'archived', 'all'].includes(v) ? v : 'current';
  const sel = document.getElementById('newsFilterStatus'); if (sel) sel.value = newsView;
  ['current', 'archived'].forEach(k => { const t = document.getElementById('nwTab-' + k); if (t) { t.classList.toggle('active', newsView === k); t.setAttribute('aria-selected', newsView === k ? 'true' : 'false'); } });
  const title = document.getElementById('newsListTitle');
  if (title) title.textContent = newsView === 'archived' ? 'Recently Archived News' : newsView === 'all' ? 'All News' : 'Current News';
  const annTitle = document.getElementById('annListTitle');
  if (annTitle) annTitle.textContent = newsView === 'archived' ? 'Archived Announcements' : 'Announcements';
  newsCurrentPage = 1;
  renderNewsPage();
  renderAnnouncementsPageGrid();
}
function openNewsArchive() {
  showPage('news', { hash: 'news/archive' });
  setNewsView('archived');
  return false;
}
function renderNewsPage() {
  const gridEl = document.getElementById('newsPageGrid');
  if (!gridEl) return;
  const all = newsByState(viewStates());
  fillSelect(document.getElementById('newsFilterCategory'), uniqSorted(all.map(n => n.category)), 'All Categories');
  fillSelect(document.getElementById('newsFilterOffice'), officeIdsIn(all), 'All Offices', officeSelectLabel);
  applyNewsFilters(all);
}
function applyNewsFilters(all) {
  const source = all || newsByState(viewStates());
  const dateVal = inputVal('newsFilterDate');
  const catVal = inputVal('newsFilterCategory');
  const officeVal = inputVal('newsFilterOffice');
  const searchVal = inputVal('newsFilterSearch').trim();
  const filtered = source.filter(n => (!dateVal || n.date === dateVal) && (!catVal || (n.category || '') === catVal) && (!officeVal || n.officeId === officeVal) &&
    matchesQuery([n.title, n.excerpt, n.category, officeNameOf(n)].join(' '), searchVal));
  const totalPages = Math.max(1, Math.ceil(filtered.length / NEWS_PAGE_SIZE));
  newsCurrentPage = Math.min(Math.max(1, newsCurrentPage), totalPages);
  const startIdx = (newsCurrentPage - 1) * NEWS_PAGE_SIZE;
  renderNewsGrid(filtered.slice(startIdx, startIdx + NEWS_PAGE_SIZE));
  renderNewsPagination(filtered.length, totalPages);
  if (!filtered.length) {
    const el = document.getElementById('newsPageGrid');
    if (el) el.innerHTML = `<p class="nw-empty">${newsView === 'archived' ? 'No archived news yet.' : 'No current news found.'}${newsView === 'current' ? ` <a href="#news/archive" class="olink" onclick="setNewsView('archived');return false;">View Recently Archived</a>` : ''}</p>`;
  }
}
function renderAnnouncementsPageGrid() {
  const el = document.getElementById('announcementsPageGrid');
  if (!el) return;
  const items = annByState(viewStates());
  if (!items.length) { el.innerHTML = `<p class="nw-empty">${newsView === 'archived' ? 'No archived announcements yet.' : 'No current announcements.'}</p>`; return; }
  el.innerHTML = items.map(a => `
    <div class="ann-card">
      <div class="ann-card-top">
        <span class="ann-tag" style="background:${tagColor(a.tag || 'Notice')}">${esc(a.tag || 'Notice')}</span>
        ${contentState(a, 'ann') === 'archived' ? '<span class="arch-badge">Archived</span>' : ''}
        ${a.date ? `<span class="ann-date">${fmtNewsDate(a.date)}</span>` : ''}
      </div>
      <h3 class="ann-title">${esc(a.title || a.tag || 'Announcement')}</h3>
      ${a.officeId ? `<div class="ann-office"><i class="fa fa-building"></i> ${esc(officeNameOf(a))}</div>` : ''}
      <p class="ann-excerpt">${esc(a.text || '')}</p>
      <a href="#announcement/${esc(a.id)}" class="ann-readmore" onclick="openAnnouncementArticle('${jsStr(a.id)}');return false;">Read More <i class="fa fa-chevron-right"></i></a>
    </div>`).join('');
}
function renderHomeArchived() {
  const el = document.getElementById('homeArchivedList');
  if (!el) return;
  const items = [
    ...newsByState(['archived']).map(n => ({ kind: 'news', item: n })),
    ...annByState(['archived']).map(a => ({ kind: 'ann', item: a })),
  ].sort((a, b) => String(b.item.date || '').localeCompare(String(a.item.date || ''))).slice(0, 4);
  el.innerHTML = items.length ? items.map(x => `<li>
      <a href="#" onclick="${x.kind === 'news' ? `openNewsArticle('${jsStr(x.item.id)}')` : `openAnnouncementArticle('${jsStr(x.item.id)}')`};return false;">${esc(x.item.title || x.item.tag || 'Announcement')}</a>
      <span>${x.kind === 'news' ? esc(x.item.category || 'News') : 'Announcement'}${x.item.date ? ' · ' + fmtNewsDate(x.item.date) : ''}</span>
    </li>`).join('') : '<li class="home-archived-empty">Nothing archived yet.</li>';
}

// ── TOURISM: category chips + contact ─────────────────────────────────
let tourismFilter = '';
function setTourismFilter(v) { tourismFilter = v; renderTourismSpots(); }
function renderTourismSpots() {
  const el = document.getElementById('tourismSpotsGrid');
  if (!el) return;
  const all = cmsGetCollection('tourism');
  const chips = document.getElementById('tourismChips');
  const types = uniqSorted(all.map(s => s.type));
  if (tourismFilter && !types.includes(tourismFilter)) tourismFilter = '';
  if (chips) chips.innerHTML = types.length > 1 ? ['', ...types].map(t => `<button type="button" role="tab" aria-selected="${tourismFilter === t}" class="tour-chip${tourismFilter === t ? ' active' : ''}" onclick="setTourismFilter('${jsStr(t)}')">${esc(t || 'All')}</button>`).join('') : '';
  const items = all.filter(s => !tourismFilter || s.type === tourismFilter);
  el.innerHTML = items.length ? items.map((s, i) => tourCardHtml(s, i)).join('') : '<p style="color:rgba(255,255,255,.7)">No tourist spots added yet.</p>';
}
function renderTourismContact() {
  const el = document.getElementById('tourismContact');
  if (!el) return;
  const info = cmsGetSetting('tourismContact').trim();
  el.innerHTML = `<h3><i class="fa fa-circle-info"></i> Tourism Contact</h3><p>${info ? esc(info).replace(/\n/g, '<br>') : tbu()}</p>`;
}

// ── YOUTH PLAN breadcrumb (it lives under Governance → Legislative → SK) ──
function renderYouthPlanCrumbs() {
  const el = document.getElementById('youthPlanCrumbs');
  if (!el) return;
  const sk = officeByKey('sk');
  el.outerHTML = `<div id="youthPlanCrumbs" class="inner" style="padding-bottom:0">${crumbsHtml([
    { label: 'Home', hash: 'home', onclick: "showPage('home')" },
    { label: 'Governance', hash: 'governance', onclick: "showPage('governance')" },
    { label: 'Legislative', hash: 'governance/legislative', onclick: "goGov('legislative')" },
    ...(sk ? [{ label: 'Sangguniang Kabataan', hash: 'office/' + sk.id, onclick: `openOffice('${jsStr(sk.id)}')` }] : []),
    { label: 'Local Youth Development Plan' }])}</div>`;
}

// ── DETAIL MODAL (shared) ─────────────────────────────────────────────
let _lastFocus = null;
function openDetailModal(html) {
  _lastFocus = document.activeElement;
  document.getElementById('detailModalBody').innerHTML = html;
  const m = document.getElementById('detailModal');
  m.classList.add('open');
  document.body.classList.add('modal-open');
  const closeBtn = m.querySelector('.modal-close'); if (closeBtn) closeBtn.focus();
}
function closeDetailModal() {
  const m = document.getElementById('detailModal');
  if (!m || !m.classList.contains('open')) return;
  m.classList.remove('open');
  document.body.classList.remove('modal-open');
  if (_lastFocus && _lastFocus.focus) _lastFocus.focus();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDetailModal(); closeMobileNav(); } });

// ── SITE SEARCH ───────────────────────────────────────────────────────
const SEARCH_PAGES = [
  { page: 'history', title: 'History of Cortes', keys: 'history founded origin' },
  { page: 'missionvision', title: 'Mission & Vision', keys: 'mission vision values pledge' },
  { page: 'lgu', title: 'About the LGU & Barangays', keys: 'about lgu barangay barangays hymn population' },
  { page: 'officials', title: 'Municipal Officials', keys: 'officials mayor vice mayor councilor sangguniang bayan members' },
  { page: 'governance', title: 'Governance — Legislative, Executive, National Agencies', keys: 'governance legislative executive national agencies structure' },
  { page: 'services', title: 'Services Directory', keys: 'services directory permit certificate' },
  { page: 'charter', title: "Citizen's Charter", keys: "citizen's charter citizens charter procedure" },
  { page: 'downloads', title: 'Downloads & Forms', keys: 'downloads forms documents' },
  { page: 'budget', title: 'Budget & Planning / Transparency', keys: 'budget planning transparency seal procurement bid fdp full disclosure' },
  { page: 'projects', title: 'Projects', keys: 'projects programs infrastructure development' },
  { page: 'news', title: 'News & Announcements', keys: 'news announcements events calendar archive' },
  { page: 'tourism', title: 'Tourism', keys: 'tourism tourist spots attractions heritage culture visit' },
  { page: 'contacts', title: 'Contact Us', keys: 'contact hotline address email phone map' },
  { page: 'privacy', title: 'Privacy Policy', keys: 'privacy policy data personal information' },
  { page: 'accessibility', title: 'Accessibility', keys: 'accessibility accessible screen reader keyboard' },
  { page: 'sitemap', title: 'Sitemap', keys: 'sitemap site map pages' },
];
function doSearch() {
  const q = (document.getElementById('headerSearch') || {}).value || '';
  if (!q.trim()) { document.getElementById('headerSearch').focus(); return false; }
  runSiteSearch(q);
  closeMobileNav();
  return false;
}
function runSiteSearch(raw) {
  const q = String(raw || '').trim();
  const input = document.getElementById('searchPageInput'); if (input) input.value = q;
  showPage('search', { hash: 'search/' + encodeURIComponent(q) });
  const out = document.getElementById('searchResults');
  const title = document.getElementById('searchTitle');
  if (!out) return false;
  if (!q) { out.innerHTML = ''; if (title) title.textContent = 'Search the Website'; return false; }
  if (title) title.textContent = `Results for “${q}”`;
  const groups = [
    { label: 'Pages', icon: 'fa-file', items: SEARCH_PAGES.filter(p => matchesQuery(p.title + ' ' + p.keys, q)).map(p => ({ title: p.title, sub: '', go: `showPage('${p.page}')` })) },
    { label: 'Offices', icon: 'fa-building', items: allOffices().filter(o => matchesQuery([o.name, o.abbreviation, o.branch, o.description, o.functions, o.head].join(' '), q)).map(o => ({ title: o.name, sub: (branchOf(o) || {}).title || 'Municipal Office', go: `openOffice('${jsStr(o.id)}')` })) },
    { label: 'Services', icon: 'fa-list-check', items: allServices().filter(s => matchesQuery(serviceHaystack(s), q)).map(s => ({ title: s.name, sub: officeNameOf(s), go: `openService('${jsStr(s.id)}')` })) },
    { label: 'Projects', icon: 'fa-diagram-project', items: cmsGetCollection('projects').filter(p => matchesQuery([p.title, p.description, p.category, p.location, officeNameOf(p)].join(' '), q)).map(p => ({ title: p.title, sub: [normStatus(p.status), officeNameOf(p)].filter(Boolean).join(' · '), go: `openProjectModal('${jsStr(p.id)}')` })) },
    { label: 'News & Announcements', icon: 'fa-newspaper', items: [
        ...newsByState(['current', 'archived']).filter(n => matchesQuery([n.title, n.excerpt, n.body, n.category].join(' '), q)).map(n => ({ title: n.title, sub: `News · ${fmtNewsDate(n.date)}${contentState(n, 'news') === 'archived' ? ' · Archived' : ''}`, go: `openNewsArticle('${jsStr(n.id)}')` })),
        ...annByState(['current', 'archived']).filter(a => matchesQuery([a.title, a.text, a.tag].join(' '), q)).map(a => ({ title: a.title || a.tag, sub: `Announcement${a.date ? ' · ' + fmtNewsDate(a.date) : ''}`, go: `openAnnouncementArticle('${jsStr(a.id)}')` })),
      ] },
    { label: 'Documents & Forms', icon: 'fa-folder-open', items: [
        ...allDownloadRows().filter(d => matchesQuery([d.title, d.description, d.category, officeNameOf(d)].join(' '), q)).map(d => ({ title: d.title, sub: [d.category, officeNameOf(d)].filter(Boolean).join(' · '), go: d.url ? `window.open('${jsStr(d.url)}','_blank','noopener')` : `showPage('downloads')` })),
        ...cmsGetCollection('budget').filter(d => matchesQuery([d.title, d.category, d.year, officeNameOf(d)].join(' '), q)).map(d => ({ title: d.title, sub: ['Budget & Transparency', d.year].filter(Boolean).join(' · '), go: `showPage('budget')` })),
      ] },
    { label: 'Tourism', icon: 'fa-umbrella-beach', items: cmsGetCollection('tourism').filter(t => matchesQuery([t.name, t.type, t.description].join(' '), q)).map(t => ({ title: t.name, sub: t.type || 'Tourism', go: `showPage('tourism')` })) },
  ].filter(g => g.items.length);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  out.innerHTML = total ? `<p class="fbar-count">${total} result${total === 1 ? '' : 's'}</p>` + groups.map(g => `
      <div class="sr-group">
        <h2><i class="fa ${g.icon}"></i> ${esc(g.label)} <span>${g.items.length}</span></h2>
        <ul>${g.items.slice(0, 12).map(it => `<li><a href="#" onclick="${it.go};return false;"><span class="sr-title">${esc(it.title)}</span>${it.sub ? `<span class="sr-sub">${esc(it.sub)}</span>` : ''}</a></li>`).join('')}</ul>
      </div>`).join('')
    : `<div class="dt-empty-box"><i class="fa fa-magnifying-glass"></i> No results for “${esc(q)}”. Try a different keyword, browse the <a href="#services" class="olink" onclick="showPage('services');return false;">Services Directory</a>, or <a href="#" class="olink" onclick="openContact();return false;">contact the LGU</a>.</div>`;
  return false;
}

// ── PAGE SWITCHING + HASH ROUTING (links like #office/off-mho are shareable) ──
const NAV_GROUPS = {
  'nav-home': ['home'],
  'nav-lgu': ['lgu', 'history', 'missionvision', 'officials'],
  'nav-gov': ['governance', 'budget', 'youthplan'],
  'nav-offices': ['departments', 'office'],
  'nav-services': ['services', 'charter', 'downloads'],
  'nav-projects': ['projects'],
  'nav-news': ['news', 'news-article', 'announcement-detail', 'event-detail'],
  'nav-tourism': ['tourism'],
  'nav-contacts': ['contacts'],
};
const PAGE_TITLES = { home: '', lgu: 'About the LGU', history: 'History', missionvision: 'Mission & Vision', officials: 'Municipal Officials', governance: 'Governance',
  departments: 'Departments & Offices', services: 'Services Directory', charter: "Citizen's Charter", downloads: 'Downloads & Forms', projects: 'Projects',
  budget: 'Budget & Planning', news: 'News & Announcements', tourism: 'Tourism', contacts: 'Contact Us', youthplan: 'Local Youth Development Plan', search: 'Search',
  privacy: 'Privacy Policy', accessibility: 'Accessibility', sitemap: 'Sitemap' };
let _routing = false;
function setHash(h) {
  if (_routing) return;
  const nh = '#' + h;
  if (location.hash !== nh) history.pushState(null, '', nh);
}
function showPage(page, opts) {
  opts = opts || {};
  if (page === 'transparency') page = 'budget'; // the old Transparency Seal page was merged into Budget & Planning
  let pageEl = document.getElementById(page === 'home' ? 'home-page' : page + '-page');
  if (!pageEl) { page = 'home'; pageEl = document.getElementById('home-page'); }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  pageEl.classList.add('active');
  document.querySelectorAll('#navbar a').forEach(a => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
  Object.keys(NAV_GROUPS).forEach(id => {
    if (!NAV_GROUPS[id].includes(page)) return;
    const el = document.getElementById(id);
    if (el) { el.classList.add('active'); el.setAttribute('aria-current', 'page'); }
  });
  if (page !== 'office') currentOfficeId = null;
  setHash(opts.hash || page);
  let t = PAGE_TITLES[page];
  if (page === 'office') { const o = officeById(currentOfficeId); t = o ? o.name : 'Office'; }
  document.title = (t ? t + ' | ' : '') + 'Municipality of Cortes | Official Website';
  if (!opts.keepScroll) window.scrollTo({ top: 0 });
  closeMobileNav();
  return false;
}
function routeFromHash() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const slash = h.indexOf('/');
  const pg = slash < 0 ? h : h.slice(0, slash);
  const arg = slash < 0 ? '' : h.slice(slash + 1);
  _routing = true;
  try {
    closeDetailModal();
    if (!pg || pg === 'home') showPage('home');
    else if (pg === 'office' && arg) openOffice(arg);
    else if (pg === 'governance' && arg) goGov(arg);
    else if (pg === 'news' && arg === 'archive') openNewsArchive();
    else if (pg === 'news' && arg) openNewsArticle(arg);
    else if (pg === 'announcement' && arg) openAnnouncementArticle(arg);
    else if (pg === 'event' && arg) openEventDetail(arg);
    else if (pg === 'service' && arg) { showPage('services'); openService(arg); }
    else if (pg === 'project' && arg) { showPage('projects'); openProjectModal(arg); }
    else if (pg === 'search') runSiteSearch(arg);
    else if (pg === 'transparency') showPage('budget');
    else if (document.getElementById(pg + '-page')) showPage(pg);
  } finally { _routing = false; }
}
window.addEventListener('popstate', routeFromHash);

// ── MOBILE NAV ────────────────────────────────────────────────────────
function toggleMobileNav() {
  const navInner = document.getElementById('navInner');
  if (!navInner) return;
  const isOpen = !navInner.classList.contains('open');
  navInner.classList.toggle('open', isOpen);
  const overlay = document.getElementById('navOverlay'); if (overlay) overlay.classList.toggle('open', isOpen);
  const btn = document.getElementById('navToggle');
  if (btn) { btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false'); btn.setAttribute('aria-label', isOpen ? 'Close main menu' : 'Open main menu'); }
  document.body.classList.toggle('nav-open', isOpen);
}
function closeMobileNav() {
  const navInner = document.getElementById('navInner');
  if (navInner) navInner.classList.remove('open');
  const overlay = document.getElementById('navOverlay'); if (overlay) overlay.classList.remove('open');
  const btn = document.getElementById('navToggle');
  if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Open main menu'); }
  document.body.classList.remove('nav-open');
}
// Parent items ("LGU", "Governance", "Services") open their overview page.
function handleNavClick(event, page) {
  if (event) event.preventDefault();
  showPage(page);
  return false;
}

// ── RENDER EVERYTHING (runs on load and whenever cms.js refreshes content) ──
function renderAllCmsContent() {
  const steps = [renderHeroSlider, renderAboutSlider, renderCommunitySlider, renderCortesHymn, renderContactsPage, renderBarangayLogos,
    applyPageBanners, renderHomeLatestNews, renderHomeAnnouncements, renderHomeArchived, renderHomeProjects, renderMayorCorner,
    renderNewsPage, renderAnnouncementsPageGrid, renderProjectsPage, renderOfficialsEverywhere, renderDepartmentsPage, renderDepartmentHeads,
    renderGovernancePage, renderServicesDirectory, renderCharterPage, renderDownloadsPage, renderBudgetPlans,
    renderTourismSpots, renderHomeTourismSpots, renderTourismContact, renderBudgetPage, renderProcurementResources,
    renderYouthPlanPage, renderYouthPlanCrumbs, renderEventsCalendar, renderHomeUpcomingEvent];
  // One broken section must never blank out the rest of the site.
  steps.forEach(fn => { try { fn(); } catch (e) { console.error('Render failed:', fn.name, e); } });
  if (currentOfficeId && document.getElementById('office-page').classList.contains('active')) {
    try { renderOfficeProfile(currentOfficeId); } catch (e) { console.error(e); }
  }
}
let _firstCmsLoad = true;
document.addEventListener('DOMContentLoaded', () => { renderAllCmsContent(); routeFromHash(); });
window.addEventListener('cms:updated', () => {
  renderAllCmsContent();
  // A deep link (e.g. #news/abc) opened before content finished loading — route again now that data exists.
  if (_firstCmsLoad) { _firstCmsLoad = false; if (location.hash.length > 1) routeFromHash(); }
});
if (document.readyState !== 'loading') { renderAllCmsContent(); routeFromHash(); }
