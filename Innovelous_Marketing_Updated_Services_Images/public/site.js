const defaults = {
  settings: {hero_eyebrow:'DIGITAL TRANSFORMATION',hero_title:'Websites that bring in customers, not just visitors.',hero_text:'Web design, online stores, apps and software built to help your business grow.',primary_cta:'Start Your Project',secondary_cta:'View Our Work',contact_email:'hello@innovelous.com'},
  services:[
    {title:'Brand strategy',summary:'Define your position, sharpen your story, and make your difference unmistakable.',sort_order:1},
    {title:'Performance marketing',summary:'Reach the right audience with campaigns built to learn, improve, and scale.',sort_order:2},
    {title:'SEO & content',summary:'Earn attention with useful content and a stronger presence in search.',sort_order:3},
    {title:'Social & creative',summary:'Create a consistent brand people recognize and want to spend time with.',sort_order:4},
    {title:'Web experiences',summary:'Turn curious visitors into confident customers with a clearer digital journey.',sort_order:5},
    {title:'Insights & analytics',summary:'Know what is working, what is changing, and where to focus next.',sort_order:6}
  ],
  case_studies:[]
};
const savedConfig = (()=>{try{return JSON.parse(localStorage.getItem('novelus.supabase')||'null')}catch{return null}})();
const cfg = savedConfig || window.NOVELUS_SUPABASE || {};
let supabase = null;
let hasPublishedCases = false;
let managedHero = null;
if (cfg.url && cfg.anonKey) {
  try { const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2'); supabase=createClient(cfg.url,cfg.anonKey,{auth:{persistSession:false}}); } catch(e) { console.warn('Marketing content could not connect.',e); }
}
async function loadRows(table, fallback, fields='*') {
  if (!supabase) return fallback;
  const {data,error}=await supabase.from(table).select(fields).eq('is_published',true).order('sort_order',{ascending:true}).order('created_at',{ascending:true}).order('id',{ascending:true});
  if(table==='case_studies') hasPublishedCases=!error && !!data?.length;
  if(error) return fallback;
  return data || [];
}
async function loadSettings(){
  if (!supabase) return defaults.settings;
  const {data,error}=await supabase.from('site_settings').select('*').eq('id',1).maybeSingle();
  return error || !data ? defaults.settings : data;
}
function paintServices(items){
  const grid=document.getElementById('serviceGrid'); if(!grid)return;
  const serviceSelect=document.querySelector('[data-lead-form] select[name="service"]');
  if(serviceSelect)serviceSelect.innerHTML='<option value="">Choose a focus</option>'+items.map(item=>`<option value="${esc(item.title)}">${esc(item.title)}</option>`).join('')+'<option value="Something else">Something else</option>';
  const visuals=[
    {src:'service-social-media.png',alt:'Social media management workspace'},
    {src:'service-video-production.png',alt:'Video production and editing workspace'},
    {src:'service-graphic-design.png',alt:'Graphic design workspace'},
    {src:'service-digital-marketing.png',alt:'Digital marketing campaign analytics workspace'},
    {src:'service-product-photography.png',alt:'Product photography studio'}
  ];
  grid.innerHTML=items.map((item,i)=>{
    const visual=visuals[i % visuals.length]; const image=safeImageSrc(item.image_url); 
    return `<article class="service-card service-image-card"><img src="${esc(image || `./assets/${visual.src}`)}" alt="${esc(item.title)}" loading="lazy" /><div class="service-card-copy"><span class="card-number">${String(i+1).padStart(2,'0')}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p><a href="#contact" aria-label="Discuss ${esc(item.title)}">↗</a></div></article>`;
  }).join('');
}
function paintWork(items){
  const grid=document.getElementById('workGrid'), filters=document.getElementById('projectFilters'); if(!grid)return;
  const categories=[...new Set(items.map(x=>(x.category||'PROJECTS').trim()).filter(Boolean))];
  if(filters)filters.innerHTML=items.length?['All',...categories].map((category,i)=>`<button type="button" class="project-filter ${i===0?'is-active':''}" data-project-filter="${esc(category)}" aria-pressed="${i===0}">${esc(category)}</button>`).join(''):'';
  if(!items.length){grid.innerHTML='<div class="project-empty"><span class="project-empty-mark">i.</span><h3>Our projects are coming into focus.</h3><p>Published projects will appear here. Add the first one from the admin dashboard.</p></div>';const note=document.querySelector('.work-note');if(note)note.hidden=true;return;}
  grid.innerHTML=items.map((item,i)=>{
    const image=safeImageSrc(item.image_url), href=safeProjectUrl(item.project_url), category=(item.category||'Projects').trim();
    const visual=`${image?`<img src="${esc(image)}" alt="${esc(item.title)} project" loading="lazy"/>`:'<span class="project-image-placeholder"><i></i><b>PROJECT PREVIEW</b></span>'}${href?'<span class="project-open">View Project <b>↗</b></span>':'<span class="project-open project-preview-label">Project Preview</span>'}`;
    return `<article class="project-card" data-project-category="${esc(category)}">${href?`<a class="project-image${image?' has-image':''}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${visual}</a>`:`<div class="project-image${image?' has-image':''}">${visual}</div>`}<div class="project-meta"><p>${esc(category)}</p><h3>${esc(item.title)}</h3><p class="project-summary">${esc(item.summary)}</p>${href?`<a class="project-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">View project <span>↗</span></a>`:`<a class="project-link" href="#contact">Discuss a similar project <span>↗</span></a>`}</div></article>`;
  }).join('');
  filters?.querySelectorAll('[data-project-filter]').forEach(button=>button.addEventListener('click',()=>{
    filters.querySelectorAll('.project-filter').forEach(item=>{const active=item===button;item.classList.toggle('is-active',active);item.setAttribute('aria-pressed',String(active));});
    const selected=button.dataset.projectFilter;grid.querySelectorAll('.project-card').forEach(card=>{card.hidden=selected!=='All'&&card.dataset.projectCategory!==selected;});
  }));
  const note=document.querySelector('.work-note'); if(note){note.hidden=false;note.textContent='Selected projects from Innovelous.';}
}

function safeImageSrc(value=''){const src=String(value||'').trim();return /^(https?:\/\/|\/|\.\/)/i.test(src)?src:'';}
function safeProjectUrl(value=''){const src=String(value||'').trim();return /^https?:\/\//i.test(src)?src:'';}
function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function init(){
  const [settings,services,cases]=await Promise.all([loadSettings(),loadRows('services',defaults.services),loadRows('case_studies',defaults.case_studies)]);
  managedHero = settings;
  const eyebrow=document.getElementById('heroEyebrow');if(eyebrow)eyebrow.textContent=settings.hero_eyebrow||defaults.settings.hero_eyebrow;
  const title=document.getElementById('heroTitle');
  if(title && settings.hero_title){ const words=esc(settings.hero_title); const split=words.lastIndexOf(' '); title.innerHTML=split>4?`${words.slice(0,split)} <span>${words.slice(split+1)}</span>`:`${words} <span></span>`; }
  const intro=document.getElementById('heroText'); if(intro)intro.textContent=settings.hero_text||defaults.settings.hero_text;
  const primary=document.getElementById('heroPrimary'); if(primary){primary.firstChild.textContent=(settings.primary_cta||defaults.settings.primary_cta)+' ';}
  const secondary=document.getElementById('heroSecondary');if(secondary){secondary.firstChild.textContent=(settings.secondary_cta||defaults.settings.secondary_cta)+' ';}
  const email=settings.contact_email||defaults.settings.contact_email;
  for(const el of [document.getElementById('contactEmail'),document.getElementById('contactCta')]) if(el){el.href='mailto:'+email; if(el.id==='contactEmail')el.innerHTML=`${esc(email)} <span>↗</span>`;}
  paintServices(services); paintWork(cases); showHeroSlide(heroIndex); document.getElementById('year').textContent=new Date().getFullYear();
}
const heroSlides=[...document.querySelectorAll('.hero-slide')];let heroIndex=0;function showHeroSlide(next){if(!heroSlides.length)return;heroIndex=(next+heroSlides.length)%heroSlides.length;heroSlides.forEach((slide,i)=>slide.classList.toggle('is-active',i===heroIndex));const active=heroSlides[heroIndex];const eyebrow=document.getElementById('heroEyebrow'),title=document.getElementById('heroTitle'),intro=document.getElementById('heroText');if(eyebrow)eyebrow.textContent=active.dataset.eyebrow||'DIGITAL GROWTH';if(title)title.innerHTML=active.dataset.title||'Digital experiences <span>built for growth.</span>';if(intro)intro.textContent=active.dataset.text||'';if(managedHero){if(eyebrow)eyebrow.textContent=managedHero.hero_eyebrow||'';if(title){const words=esc(managedHero.hero_title||'');const split=words.lastIndexOf(' ');title.innerHTML=split>4?`${words.slice(0,split)} <span>${words.slice(split+1)}</span>`:words;}if(intro)intro.textContent=managedHero.hero_text||'';}const count=document.getElementById('heroSlideCount');if(count)count.textContent=`${String(heroIndex+1).padStart(2,'0')} / ${String(heroSlides.length).padStart(2,'0')}`;}
document.getElementById('heroPrev')?.addEventListener('click',()=>showHeroSlide(heroIndex-1));document.getElementById('heroNext')?.addEventListener('click',()=>showHeroSlide(heroIndex+1));
if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&heroSlides.length>1)setInterval(()=>showHeroSlide(heroIndex+1),7000);
document.getElementById('menuToggle')?.addEventListener('click',e=>{const b=e.currentTarget,menu=document.getElementById('navLinks'),open=menu.classList.toggle('is-open');b.setAttribute('aria-expanded',String(open));b.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
document.querySelectorAll('#navLinks a').forEach(a=>a.addEventListener('click',()=>{document.getElementById('navLinks')?.classList.remove('is-open');document.getElementById('menuToggle')?.setAttribute('aria-expanded','false');}));
const leadForm=document.querySelector('[data-lead-form]');
leadForm?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,msg=form.querySelector('[data-form-message]'),button=form.querySelector('button[type=submit]');msg.textContent='';const values=Object.fromEntries(new FormData(form));if(!supabase){const subject=encodeURIComponent(`Website enquiry from ${values.name}`),body=encodeURIComponent(`Name: ${values.name}\nEmail: ${values.email}\nCompany: ${values.company||'—'}\nInterested in: ${values.service||'Not specified'}\n\n${values.message}`);window.location.href=`mailto:${defaults.settings.contact_email}?subject=${subject}&body=${body}`;msg.textContent='Your email app should open with your enquiry ready to send.';return;}button.disabled=true;const {error}=await supabase.from('leads').insert({name:values.name,email:values.email,company:values.company||null,service:values.service||null,message:values.message});button.disabled=false;if(error){msg.textContent='We could not send that just now. Please email hello@innovelous.com.';return;}form.reset();msg.textContent='Thanks — your note is on its way.';});
init();
