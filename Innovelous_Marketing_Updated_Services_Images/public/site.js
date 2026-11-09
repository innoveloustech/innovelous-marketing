const defaults = {
  settings: {
    hero_eyebrow: 'CREATIVE & DIGITAL GROWTH',
    hero_title: 'Make your brand impossible to ignore.',
    hero_text: 'Creative visuals and digital experiences that help your business stand out, connect with people, and grow with confidence.',
    primary_cta: 'Get a Quote',
    secondary_cta: 'Explore Our Work',
    contact_email: 'hello@innovelous.com'
  },
  services: [
    {title:'Social Media Management',summary:'Build a consistent social presence with thoughtful content, planning, and community engagement.',sort_order:1,image_url:'./assets/slide-social-media.jpg'},
    {title:'Video Production & Editing',summary:'Turn ideas into engaging videos, reels, and stories that keep your audience watching.',sort_order:2,image_url:'./assets/slide-video-editing.jpg'},
    {title:'Graphic Design & Branding',summary:'Create a distinctive visual identity through clear design, brand assets, and campaign creatives.',sort_order:3,image_url:'./assets/slide-static-designs.jpg'},
    {title:'Digital Marketing & Ads',summary:'Reach the right audience with focused campaigns, smart targeting, and measurable improvements.',sort_order:4,image_url:'./assets/slide-meta-ads.jpg'},
    {title:'Product Photography',summary:'Showcase products with clean, polished visuals designed to build interest and trust.',sort_order:5,image_url:'./assets/slide-product-branding.jpg'}
  ],
  case_studies: [
    {title:'Social Media Campaigns',category:'CREATIVE DESIGN',summary:'Brand-led visuals for social platforms, designed around a consistent visual identity.',description:'A coordinated social media creative direction combining content planning, campaign artwork, platform-ready designs, and a consistent brand look.',image_url:'./assets/slide-static-designs.jpg'},
    {title:'Product & Brand Visuals',category:'PRODUCT & BRAND',summary:'Premium product presentation and visual content for digital channels.',description:'A product-focused visual direction built around clean compositions, thoughtful lighting, brand consistency, and polished digital presentation.',image_url:'./assets/slide-product-branding.jpg'},
    {title:'Digital Advertising Campaigns',category:'PERFORMANCE MARKETING',summary:'Campaign creative designed to communicate clearly and encourage action.',description:'A digital campaign creative concept covering ad visuals, messaging hierarchy, audience-focused content, and platform-ready campaign assets.',image_url:'./assets/slide-meta-ads.jpg'},
    {title:'Video & Reels Production',category:'VIDEO PRODUCTION',summary:'Short-form video content shaped for social media engagement.',description:'A short-form content approach combining video editing, pacing, visual storytelling, and social-first formats for reels and digital campaigns.',image_url:'./assets/slide-video-editing.jpg'}
  ]
};

let supabase = null;

async function connectSupabase() {
  let savedConfig = null;
  try { savedConfig = JSON.parse(localStorage.getItem('novelus.supabase') || 'null'); } catch (_) {}
  const cfg = savedConfig || window.NOVELUS_SUPABASE || {};
  if (!cfg.url || !cfg.anonKey) return;
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabase = createClient(cfg.url, cfg.anonKey, {auth:{persistSession:false}});
  } catch (error) { console.warn('Innovelous content connection unavailable.', error); }
}

async function loadRows(table, fallback) {
  if (!supabase) return fallback;
  const {data,error} = await supabase.from(table).select('*')
    .eq('is_published', true).order('sort_order', {ascending:true})
    .order('created_at', {ascending:true}).order('id', {ascending:true});
  return error ? fallback : (data?.length ? data : fallback);
}

async function loadSettings() {
  if (!supabase) return defaults.settings;
  const {data,error} = await supabase.from('site_settings').select('*').eq('id',1).maybeSingle();
  return error || !data ? defaults.settings : data;
}

function escapeHTML(value='') {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function safeImageSrc(value='') {
  const src = String(value || '').trim();
  return /^(https?:\/\/|\/|\.\/)/i.test(src) ? src : '';
}
function safeProjectUrl(value='') {
  const src = String(value || '').trim();
  return /^https?:\/\//i.test(src) ? src : '';
}

function paintServices(items) {
  const grid = document.getElementById('serviceGrid');
  if (!grid) return;
  const visuals = ['./assets/slide-social-media.jpg','./assets/slide-video-editing.jpg','./assets/slide-static-designs.jpg','./assets/slide-meta-ads.jpg','./assets/slide-product-branding.jpg'];
  grid.innerHTML = items.map((item,index) => {
    const image = safeImageSrc(item.image_url) || visuals[index % visuals.length];
    return `<article class="service-card"><img src="${escapeHTML(image)}" alt="${escapeHTML(item.title)}" loading="lazy"><div><span>${String(index+1).padStart(2,'0')}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.summary || '')}</p></div></article>`;
  }).join('');
}

function paintWork(items) {
  const grid = document.getElementById('workGrid');
  const filters = document.getElementById('projectFilters');
  if (!grid) return;
  const categories = [...new Set(items.map(item => (item.category || 'Projects').trim()).filter(Boolean))];
  if (filters) {
    filters.innerHTML = ['All', ...categories].map((category,index) =>
      `<button type="button" class="project-filter ${index===0?'is-active':''}" data-project-filter="${escapeHTML(category)}" aria-pressed="${index===0}">${escapeHTML(category)}</button>`
    ).join('');
  }
  grid.innerHTML = items.map((item,index) => {
    const image = safeImageSrc(item.image_url) || './assets/slide-static-designs.jpg';
    return `<article class="project-card" data-project-category="${escapeHTML((item.category || 'Projects').trim())}">
      <div class="project-card-image"><img src="${escapeHTML(image)}" alt="${escapeHTML(item.title)}" loading="lazy"><span class="project-image-index">${String(index+1).padStart(2,'0')}</span></div>
      <div class="project-card-copy"><small>${escapeHTML(item.category || 'PROJECTS')}</small><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.summary || '')}</p>
      <button class="project-view-button" type="button" data-project-view="${index}">View Project <span>↗</span></button></div>
    </article>`;
  }).join('');

  filters?.querySelectorAll('[data-project-filter]').forEach(button => {
    button.addEventListener('click', () => {
      filters.querySelectorAll('.project-filter').forEach(item => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      const selected = button.dataset.projectFilter;
      grid.querySelectorAll('.project-card').forEach(card => {
        card.hidden = selected !== 'All' && card.dataset.projectCategory !== selected;
      });
    });
  });
  grid.querySelectorAll('[data-project-view]').forEach(button => {
    button.addEventListener('click', () => openProject(items[Number(button.dataset.projectView)]));
  });
}

function openProject(item) {
  if (!item) return;
  const modal = document.getElementById('projectModal');
  const image = safeImageSrc(item.image_url) || './assets/slide-static-designs.jpg';
  const url = safeProjectUrl(item.project_url);
  document.getElementById('projectModalImage').src = image;
  document.getElementById('projectModalImage').alt = item.title || 'Project image';
  document.getElementById('projectModalCategory').textContent = item.category || 'PROJECT DETAILS';
  document.getElementById('projectModalTitle').textContent = item.title || 'Project';
  document.getElementById('projectModalSummary').textContent = item.summary || '';
  document.getElementById('projectModalDescription').textContent = item.description || item.details || item.summary || 'Explore the creative direction, visual approach, and deliverables behind this project.';
  const link = document.getElementById('projectModalLink');
  link.hidden = !url;
  if (url) link.href = url;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
  document.getElementById('projectModalTitle').focus?.();
}
function closeProject() {
  const modal = document.getElementById('projectModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
}
function initProjectModal() {
  document.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', closeProject));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeProject(); });
}

function initNavigation() {
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('navLinks');
  toggle?.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    menu.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded','false');
  }));
}

async function init() {
  await connectSupabase();
  const [settings,services,cases] = await Promise.all([loadSettings(),loadRows('services',defaults.services),loadRows('case_studies',defaults.case_studies)]);
  paintServices(services);
  paintWork(cases);
  document.getElementById('year').textContent = new Date().getFullYear();
  initNavigation();
  initProjectModal();
}
init();
/* ===== Innovelous testimonial carousel only ===== */
function initTestimonialCarousel() {
  const root = document.querySelector('[data-testimonial-carousel]');
  if (!root) return;

  const viewport = root.querySelector('[data-testimonial-viewport]');
  const track = root.querySelector('[data-testimonial-track]');
  const previous = root.querySelector('.testimonial-prev');
  const next = root.querySelector('.testimonial-next');
  if (!viewport || !track || !previous || !next) return;

  const originals = Array.from(track.children);
  if (originals.length < 2) return;

  // Clone both ends to make the carousel loop without a visible jump.
  const before = originals.map(card => card.cloneNode(true));
  const after = originals.map(card => card.cloneNode(true));
  before.forEach(card => { card.setAttribute('aria-hidden', 'true'); card.querySelectorAll('a,button,[tabindex]').forEach(el => el.setAttribute('tabindex', '-1')); });
  after.forEach(card => { card.setAttribute('aria-hidden', 'true'); card.querySelectorAll('a,button,[tabindex]').forEach(el => el.setAttribute('tabindex', '-1')); });
  before.reverse().forEach(card => track.insertBefore(card, track.firstChild));
  after.forEach(card => track.appendChild(card));

  let index = originals.length;
  let step = 0;
  let isDragging = false;
  let startX = 0;
  let startScroll = 0;
  let suppressClick = false;

  const getStep = () => {
    const card = track.querySelector('.testimonial-card');
    if (!card) return 0;
    const styles = getComputedStyle(track);
    return card.getBoundingClientRect().width + (parseFloat(styles.columnGap || styles.gap) || 0);
  };
  const positionAt = (animate = false) => {
    step = getStep();
    if (!step) return;
    viewport.scrollTo({ left: index * step, behavior: animate ? 'smooth' : 'auto' });
  };
  const normalize = () => {
    const total = originals.length;
    if (index >= total * 2) {
      index -= total;
      positionAt(false);
    } else if (index < total) {
      index += total;
      positionAt(false);
    }
  };
  const move = direction => {
    index += direction;
    positionAt(true);
  };

  // Start on the original first card, after the prepended clones.
  requestAnimationFrame(() => positionAt(false));
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));

  viewport.addEventListener('scroll', () => {
    if (isDragging) return;
    if (step && Math.abs(viewport.scrollLeft - index * step) > step * .55) {
      index = Math.round(viewport.scrollLeft / step);
      normalize();
    }
  }, { passive: true });

  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    isDragging = true;
    suppressClick = false;
    startX = event.clientX;
    startScroll = viewport.scrollLeft;
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture?.(event.pointerId);
  });
  viewport.addEventListener('pointermove', event => {
    if (!isDragging) return;
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 5) suppressClick = true;
    viewport.scrollLeft = startScroll - delta;
  });
  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    viewport.classList.remove('is-dragging');
    if (step) index = Math.round(viewport.scrollLeft / step);
    normalize();
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('lostpointercapture', endDrag);
  viewport.addEventListener('click', event => {
    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }
  }, true);

  viewport.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
  });
  window.addEventListener('resize', () => positionAt(false), { passive: true });
}
// Automatic infinite carousel movement
let autoplayTimer;

const startAutoplay = () => {
  clearInterval(autoplayTimer);

  autoplayTimer = setInterval(() => {
    if (!isDragging) {
      move(1);
    }
  }, 3500);
};

const stopAutoplay = () => {
  clearInterval(autoplayTimer);
};

root.addEventListener('mouseenter', stopAutoplay);
root.addEventListener('mouseleave', startAutoplay);

root.addEventListener('touchstart', stopAutoplay, { passive: true });
root.addEventListener('touchend', startAutoplay, { passive: true });

root.addEventListener('focusin', stopAutoplay);
root.addEventListener('focusout', startAutoplay);

startAutoplay();
