const defaults = {
  settings: {
    hero_eyebrow: 'CREATIVE & DIGITAL GROWTH',
    hero_title: 'Make your brand impossible to ignore.',
    hero_text: 'Creative visuals and digital experiences that help your business stand out, connect with people, and grow with confidence.',
    primary_cta: 'Get a Quote',
    secondary_cta: 'Explore Our Work',
    contact_email: 'hello@innovelous.com'
  },
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

async function loadRows(table) {
  // Public pages must reflect CMS data only. No demo/default rows are shown
  // when Supabase is empty, unavailable, or returns an error.
  if (!supabase) return [];
  const {data,error} = await supabase.from(table).select('*')
    .eq('is_published', true).order('sort_order', {ascending:true})
    .order('created_at', {ascending:true}).order('id', {ascending:true});
  if (error) {
    console.warn(`Could not load published ${table}:`, error);
    return [];
  }
  return data || [];
}

async function loadSettings() {
  if (!supabase) return defaults.settings;
  const {data,error} = await supabase.from('site_settings').select('*').eq('id',1).maybeSingle();
  return error || !data ? defaults.settings : data;
}

async function loadTestimonials() {
  if (!supabase) return [];
  const {data,error} = await supabase.from('testimonials')
    .select('id,client_name,designation,company_name,quote,rating,sort_order')
    .eq('is_published', true)
    .order('sort_order', {ascending:true})
    .order('created_at', {ascending:true});
  if (error) {
    console.warn('Could not load published testimonials:', error);
    return [];
  }
  return data || [];
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
  const section = document.getElementById('services');
  const grid = document.getElementById('serviceGrid');
  if (!grid) return;

  const serviceSelect = document.querySelector('[data-lead-form] select[name="service"]');
  if (serviceSelect) {
    serviceSelect.innerHTML = '<option value="">Choose a focus</option>' +
      items.map(item => `<option value="${escapeHTML(item.title)}">${escapeHTML(item.title)}</option>`).join('') +
      '<option value="Something else">Something else</option>';
  }

  if (!items.length) {
    grid.innerHTML = '';
    if (section) section.hidden = true;
    return;
  }
  if (section) section.hidden = false;

  const visuals = ['./assets/slide-social-media.jpg','./assets/slide-video-editing.jpg','./assets/slide-static-designs.jpg','./assets/slide-meta-ads.jpg','./assets/slide-product-branding.jpg'];
  grid.innerHTML = items.map((item,index) => {
    const image = safeImageSrc(item.image_url) || visuals[index % visuals.length];
    return `<article class="service-card"><img src="${escapeHTML(image)}" alt="${escapeHTML(item.title)}" loading="lazy"><div><span>${String(index+1).padStart(2,'0')}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.summary || '')}</p></div></article>`;
  }).join('');
}

function paintWork(items) {
  const section = document.getElementById('work');
  const grid = document.getElementById('workGrid');
  const filters = document.getElementById('projectFilters');
  if (!grid) return;

  if (!items.length) {
    if (filters) filters.innerHTML = '';
    grid.innerHTML = '';
    if (section) section.hidden = true;
    return;
  }
  if (section) section.hidden = false;

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

function paintTestimonials(items) {
  const section = document.getElementById('testimonials');
  const track = section?.querySelector('[data-testimonial-track]');
  if (!section || !track) return;

  if (!items.length) {
    track.innerHTML = '';
    section.hidden = true;
    return;
  }

  const makeCard = item => {
    const initials = String(item.client_name || '').trim().split(/\s+/).filter(Boolean)
      .slice(0,2).map(part => part[0].toUpperCase()).join('') || 'CL';
    const rating = Math.max(1, Math.min(5, Number(item.rating) || 5));
    return `<article class="testimonial-card">
      <div class="testimonial-stars" aria-label="${rating} out of 5 stars">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</div>
      <p class="testimonial-quote">“${escapeHTML(item.quote || '')}”</p>
      <div class="testimonial-person"><span class="testimonial-avatar">${escapeHTML(initials)}</span><span><strong>${escapeHTML(item.client_name || '')}</strong><small>${escapeHTML(item.designation || '')}</small></span></div>
    </article>`;
  };
  const cards = items.map(makeCard).join('');
  // Render each published testimonial exactly once. The previous second group
  // duplicated every card to create an infinite marquee.
  track.innerHTML = `<div class="testimonial-group">${cards}</div>`;
  section.hidden = false;
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
  const [settings,services,cases,testimonials] = await Promise.all([
    loadSettings(),
    loadRows('services'),
    loadRows('case_studies'),
    loadTestimonials()
  ]);
  paintServices(services);
  paintWork(cases);
  paintTestimonials(testimonials);
  document.getElementById('year').textContent = new Date().getFullYear();
  initNavigation();
  initProjectModal();
}
init();
