const bundled=window.NOVELUS_SUPABASE||{};
const saved=(()=>{try{return JSON.parse(localStorage.getItem('novelus.supabase')||'null')}catch{return null}})();
let config=saved||bundled, client=null, user=null, services=[], cases=[], leads=[], settings=null;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel=d=>new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
const msg=(el,text,error=false)=>{if(!el)return;el.textContent=text;el.classList.toggle('error',error)};
async function connect(){if(!config.url||!config.anonKey){status('Not connected',false);return false}try{const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');client=createClient(config.url,config.anonKey);status('Supabase ready',true);return true}catch(e){status('Connection failed',false);return false}}
function status(label,ok){const el=$('#connectionState');el.innerHTML=`<i></i> ${esc(label)}`;el.classList.toggle('ok',ok)}
function showSetup(){ $('#setupView').hidden=false; if(config.url)$('#setupForm').elements.url.value=config.url; if(config.anonKey)$('#setupForm').elements.anonKey.value=config.anonKey; }
function showDashboard(){ $('#loginView').hidden=true;$('#dashboardView').hidden=false;$('#signOut').hidden=false;$('#userEmail').textContent=user.email||'';$('#today').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});$('#overviewDate').textContent=new Date().toLocaleDateString(undefined,{month:'long',year:'numeric'}); }
async function login(e){e.preventDefault();const f=e.currentTarget,b=$('button[type=submit]',f);msg($('#loginMessage'),'');if(!client){showSetup();return}b.disabled=true;const {data,error}=await client.auth.signInWithPassword({email:f.email.value,password:f.password.value});b.disabled=false;if(error){msg($('#loginMessage'),error.message,true);return}user=data.user;const {data:role,error:roleError}=await client.from('marketing_admins').select('user_id').eq('user_id',user.id).maybeSingle();if(roleError||!role){await client.auth.signOut();user=null;msg($('#loginMessage'),'This account is not authorized for the marketing dashboard.',true);return}showDashboard();await refresh();}
async function refresh(){
  const [setRes,svcRes,caseRes,leadRes]=await Promise.all([client.from('site_settings').select('*').eq('id',1).maybeSingle(),client.from('services').select('*').order('sort_order').order('created_at').order('id'),client.from('case_studies').select('*').order('sort_order').order('created_at').order('id'),client.from('leads').select('*').order('created_at',{ascending:false})]);
  for(const [name,res] of [['site settings',setRes],['services',svcRes],['projects',caseRes],['enquiries',leadRes]])if(res.error)console.error(`Could not load ${name}:`,res.error);
  const failures=[setRes,svcRes,caseRes,leadRes].filter(x=>x.error);
  msg($('#dashboardMessage'),failures.length?'Some content could not load. Check your connection and run the included CMS migration. '+failures.map(x=>x.error.message).join(' '):'',!!failures.length);
  settings=setRes.data||{id:1,hero_eyebrow:'DIGITAL TRANSFORMATION',hero_title:'Websites that bring in customers, not just visitors.',hero_text:'Web design, online stores, apps and software built to help your business grow.',primary_cta:'Start Your Project',secondary_cta:'View Our Work',contact_email:'hello@innovelous.com'};
  services=svcRes.data||[];cases=caseRes.data||[];leads=leadRes.data||[];
  const sf=$('#settingsForm');Object.entries(settings).forEach(([k,v])=>{if(sf.elements[k])sf.elements[k].value=v??''});
  $('#statServices').textContent=services.filter(x=>x.is_published).length;$('#statCases').textContent=cases.filter(x=>x.is_published).length;$('#statLeads').textContent=leads.filter(x=>x.status==='new').length;$('#leadCount').textContent=leads.filter(x=>x.status==='new').length;
  drawServices();drawCases();drawLeads();drawRecent();
}
function drawRecent(){const root=$('#recentLeads'),items=leads.slice(0,4);root.innerHTML=items.length?items.map(x=>`<div class="recent-item"><div><b>${esc(x.name)}</b><span>${esc(x.email)} · ${dateLabel(x.created_at)}</span></div><span class="status ${esc(x.status)}">${esc(x.status)}</span></div>`).join(''):'<div class="empty">No enquiries yet. New website messages will appear here.</div>';}
function drawServices(){const root=$('#servicesList');root.innerHTML=services.length?services.map(x=>`<article class="record">${x.image_url?`<img class="project-thumb" src="${esc(x.image_url)}" alt="" loading="lazy"/>`:''}<div><div class="record-title">${esc(x.title)}</div><div class="record-summary">${esc(x.summary)}</div><div class="record-meta">ORDER ${x.sort_order} · ${x.is_published?'VISIBLE ON WEBSITE':'HIDDEN'}</div></div><div class="record-actions"><span class="badge ${x.is_published?'live':''}">${x.is_published?'Published':'Draft'}</span><button class="mini" data-visibility="services" data-record-id="${esc(x.id)}">${x.is_published?'Hide':'Show'}</button><button class="mini" data-edit-service="${esc(x.id)}">Edit</button><button class="mini danger" data-delete-service="${esc(x.id)}">Delete</button></div></article>`).join(''):'<div class="surface empty">No services yet. Add your first service above.</div>';}
function drawCases(){const root=$('#casesList');root.innerHTML=cases.length?cases.map(x=>`<article class="record">${x.image_url?`<img class="project-thumb" src="${esc(x.image_url)}" alt="" loading="lazy"/>`:''}<div><div class="record-title">${esc(x.title)}</div><div class="record-summary">${esc(x.summary)}</div><div class="record-meta">${esc(x.category||'SELECTED WORK')} · ORDER ${x.sort_order}${x.project_date?' · '+esc(x.project_date):''}</div></div><div class="record-actions"><span class="badge ${x.is_published?'live':''}">${x.is_published?'Published':'Draft'}</span><button class="mini" data-visibility="case_studies" data-record-id="${esc(x.id)}">${x.is_published?'Hide':'Show'}</button><button class="mini" data-edit-case="${esc(x.id)}">Edit</button><button class="mini danger" data-delete-case="${esc(x.id)}">Delete</button></div></article>`).join(''):'<div class="surface empty">No projects yet. Add your first project above.</div>';}
function drawLeads(){const root=$('#leadsList'),filter=$('#leadFilter').value,rows=filter==='all'?leads:leads.filter(x=>x.status===filter);root.innerHTML=rows.length?rows.map(x=>`<article class="lead"><div class="lead-head"><div><h3>${esc(x.name)}</h3><div class="lead-details"><a href="mailto:${esc(x.email)}">${esc(x.email)}</a>${x.company?`<span>${esc(x.company)}</span>`:''}</div></div><span class="status ${esc(x.status)}">${esc(x.status)}</span></div>${x.service?`<div class="record-meta">INTERESTED IN · ${esc(x.service)}</div>`:''}<p>${esc(x.message)}</p><div class="lead-foot"><time>${dateLabel(x.created_at)}</time><select data-lead-status="${esc(x.id)}"><option value="new" ${x.status==='new'?'selected':''}>New</option><option value="contacted" ${x.status==='contacted'?'selected':''}>Contacted</option><option value="closed" ${x.status==='closed'?'selected':''}>Closed</option></select></div></article>`).join(''):'<div class="surface empty">No enquiries in this view.</div>';}
const imageEditors = {};
function setupImageEditor(kind, formSelector, bucket, messageSelector) {
  const form=$(formSelector), fileInput=$(`#${kind}ImageFile`), drop=$(`#${kind}ImageDrop`);
  let pending=null, objectUrl=null;
  function preview(url='',file=null){
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}
    if(file)objectUrl=URL.createObjectURL(file);
    const src=objectUrl||url, img=$(`#${kind}ImagePreviewImg`);
    if(src)img.src=src;else img.removeAttribute('src');
    $(`#${kind}ImagePreview`).hidden=!src;$(`#${kind}ImagePrompt`).hidden=!!src;
    $(`#${kind}ImageFileName`).textContent=file?file.name:'Current image';
  }
  function accept(file){
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp','image/avif'].includes(file.type)||file.size>8*1024*1024){
      fileInput.value='';msg($(messageSelector),'Choose PNG, JPG, WEBP or AVIF, 8 MB or smaller.',true);return;
    }
    pending=file;preview('',file);msg($(messageSelector),'Image selected. Save to upload it.');
  }
  drop.addEventListener('click',e=>{if(e.target.closest('button,input'))return;fileInput.click();});
  drop.addEventListener('keydown',e=>{if(e.target===drop&&['Enter',' '].includes(e.key)){e.preventDefault();fileInput.click();}});
  fileInput.addEventListener('change',e=>accept(e.target.files?.[0]));
  drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('is-dragging');});
  drop.addEventListener('dragleave',()=>drop.classList.remove('is-dragging'));
  drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('is-dragging');accept(e.dataTransfer.files?.[0]);});
  $(`#remove${kind[0].toUpperCase()+kind.slice(1)}Image`).addEventListener('click',e=>{e.stopPropagation();pending=null;fileInput.value='';form.elements.image_url.value='';preview();msg($(messageSelector),'Image removed. Save to apply.');});
  return {
    reset(url=''){pending=null;fileInput.value='';preview(url);},
    async upload(){
      if(!pending)return;
      const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/avif':'avif'}[pending.type];
      const path=`${crypto.randomUUID()}.${ext}`;
      msg($(messageSelector),'Uploading image…');
      const {error}=await client.storage.from(bucket).upload(path,pending,{cacheControl:'3600',upsert:false,contentType:pending.type});
      if(error)throw error;
      const {data}=client.storage.from(bucket).getPublicUrl(path);
      form.elements.image_url.value=data.publicUrl;pending=null;fileInput.value='';preview(data.publicUrl);
    }
  };
}
function openForm(id,form,rows,title){
  const f=$(form);f.hidden=false;f.reset();f.elements.id.value='';
  const row=rows.find(x=>x.id===id);
  if(row)Object.entries(row).forEach(([k,v])=>{if(f.elements[k]){if(f.elements[k].type==='checkbox')f.elements[k].checked=!!v;else f.elements[k].value=v??'';}});
  else f.elements.sort_order.value=rows.length?Math.min(2147483647,Math.max(...rows.map(x=>Number(x.sort_order)||0))+1):1;
  imageEditors[form]?.reset(f.elements.image_url.value);
  msg($(form==='#caseForm'?'#caseMessage':'#serviceMessage'),'');
  $(title).textContent=row?'Edit item':'New item';f.scrollIntoView({behavior:'smooth',block:'center'});
}
function serialize(form){const out=Object.fromEntries(new FormData(form));out.sort_order=Number(out.sort_order)||0;if(form.elements.is_published)out.is_published=form.elements.is_published.checked;if(out.id==='')delete out.id;return out;}
async function saveRecord(form,table,messageId,refreshFn){
  const button=$('button[type=submit]',form);if(button.disabled)return;button.disabled=true;
  try{
    if(!form.reportValidity())return;
    await imageEditors[`#${form.id}`]?.upload();
    const data=serialize(form);
    if(!Number.isInteger(data.sort_order)||data.sort_order<0||data.sort_order>2147483647)throw new Error('Display order must be a whole number from 0 to 2147483647.');
    if('project_date' in data)data.project_date=data.project_date||null;
    if(!data.id){data.id=crypto.randomUUID();form.elements.id.value=data.id;}
    const {error}=await client.from(table).upsert(data);if(error)throw error;
    await refreshFn();msg($(messageId),'Saved. Refresh the website to see your changes.');
  }catch(error){msg($(messageId),error.message||'Could not save. Please retry.',true);}
  finally{button.disabled=false;}
}
async function deleteRecord(table,id,refreshFn){if(!confirm('Delete this item?'))return;const {error}=await client.from(table).delete().eq('id',id);if(error){alert(error.message);return}await refreshFn();}
function activate(name){$$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));$$('.panel').forEach(p=>{const active=p.id===`panel-${name}`;p.hidden=!active;p.classList.toggle('active',active)});}
$('#loginForm').addEventListener('submit',login);$('#openSetup').addEventListener('click',showSetup);$('#closeSetup').addEventListener('click',()=>$('#setupView').hidden=true);$('#setupView').addEventListener('click',e=>{if(e.target.id==='setupView')e.currentTarget.hidden=true});
$('#setupForm').addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const button=$('button[type=submit]',e.currentTarget);button.disabled=true;const old=config;config={url:d.url.replace(/\/$/,''),anonKey:d.anonKey.trim()};const ok=await connect();button.disabled=false;if(!ok){config=old;msg($('#setupMessage'),'Could not initialize the Supabase client. Check the URL and key.',true);return}localStorage.setItem('novelus.supabase',JSON.stringify(config));msg($('#setupMessage'),'Connected. Reloading dashboard…');setTimeout(()=>location.reload(),500)});
$('#signOut').addEventListener('click',async()=>{await client?.auth.signOut();location.reload()});
$$('.tab').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.panel)));$$('[data-go]').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.go)));$('#newService').addEventListener('click',()=>openForm('', '#serviceForm', services, '#serviceFormTitle'));$('#newCase').addEventListener('click',()=>openForm('', '#caseForm', cases, '#caseFormTitle'));
$('#servicesList').addEventListener('click',e=>{const edit=e.target.closest('[data-edit-service]'),del=e.target.closest('[data-delete-service]');if(edit)openForm(edit.dataset.editService,'#serviceForm',services,'#serviceFormTitle');if(del)deleteRecord('services',del.dataset.deleteService,refresh)});
$('#casesList').addEventListener('click',e=>{const edit=e.target.closest('[data-edit-case]'),del=e.target.closest('[data-delete-case]');if(edit)openForm(edit.dataset.editCase,'#caseForm',cases,'#caseFormTitle');if(del)deleteRecord('case_studies',del.dataset.deleteCase,refresh)});
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close.replace(/^#/, '')).hidden=true));
imageEditors['#serviceForm']=setupImageEditor('service','#serviceForm','service-images','#serviceMessage');
imageEditors['#caseForm']=setupImageEditor('project','#caseForm','project-images','#caseMessage');
$('#serviceForm').addEventListener('submit',async e=>{e.preventDefault();await saveRecord(e.currentTarget,'services','#serviceMessage',refresh);});
$('#caseForm').addEventListener('submit',async e=>{e.preventDefault();await saveRecord(e.currentTarget,'case_studies','#caseMessage',refresh);});
document.addEventListener('click',async e=>{
  const button=e.target.closest('[data-visibility]');if(!button||button.disabled)return;
  const table=button.dataset.visibility,rows=table==='services'?services:cases;
  const row=rows.find(x=>x.id===button.dataset.recordId);if(!row)return;button.disabled=true;
  try{const {error}=await client.from(table).update({is_published:!row.is_published}).eq('id',row.id);if(error)throw error;await refresh();}
  catch(error){msg($('#dashboardMessage'),error.message||'Could not change visibility.',true);button.disabled=false;}
});

$('#settingsForm').addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));data.id=1;const {error}=await client.from('site_settings').upsert(data);if(error){msg($('#settingsMessage'),error.message,true);return}msg($('#settingsMessage'),'Website content saved.');await refresh()});$('#leadFilter').addEventListener('change',drawLeads);
$('#leadsList').addEventListener('change',async e=>{const select=e.target.closest('[data-lead-status]');if(!select)return;const {error}=await client.from('leads').update({status:select.value}).eq('id',select.dataset.leadStatus);if(error){alert(error.message);return}await refresh()});
async function start(){const ok=await connect();if(!ok){$('#loginView').hidden=false;return}const {data}=await client.auth.getSession();if(!data.session)return;user=data.session.user;const {data:role,error}=await client.from('marketing_admins').select('user_id').eq('user_id',user.id).maybeSingle();if(!role||error){await client.auth.signOut();return}showDashboard();await refresh()}
start();
