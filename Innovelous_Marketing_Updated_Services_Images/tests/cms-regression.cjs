// Run: node tests/cms-regression.cjs (no dependencies or live database needed)
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function environment(){
 const nodes=new Map();
 function node(key){if(!nodes.has(key))nodes.set(key,{hidden:false,value:'',textContent:'',innerHTML:'',dataset:{},listeners:{},elements:{image_url:{value:''}},classList:{add(){},remove(){},toggle(){}},addEventListener(type,fn){this.listeners[type]=fn},querySelector(s){return node(key+' '+s)},querySelectorAll(){return []},setAttribute(){},removeAttribute(){},scrollIntoView(){},reset(){},click(){}});return nodes.get(key)}
 const context=vm.createContext({console,window:{},localStorage:{getItem(){return null}},document:{querySelector:node,querySelectorAll(){return []},getElementById:id=>node('#'+id),addEventListener(){}},URL:{createObjectURL(){return 'blob:preview'},revokeObjectURL(){}},crypto:{randomUUID(){return 'test-id'}},FormData:class{constructor(form){return new Map(Object.entries(form.values))}},confirm:()=>true,alert(){},setInterval(){},setTimeout(){},matchMedia:()=>({matches:true})});return {context,node};
}
(async()=>{
 const env=environment(),ctx=env.context;
 let source=fs.readFileSync(path.join(root,'public/dashboard/admin.js'),'utf8').replace(/start\(\);\s*$/,'');
 vm.runInContext(source,ctx);
 let writes=[],uploads=[];let fail=false;
 ctx.testClient={from:table=>({upsert:async data=>{writes.push({table,data});return {error:fail?{message:'Save failed'}:null}}}),storage:{from:bucket=>({upload:async(p,f)=>{uploads.push({bucket,p});return {error:null}},getPublicUrl:p=>({data:{publicUrl:'https://example.com/'+p}})})}};
 vm.runInContext('client=testClient',ctx);
 const form=env.node('#serviceForm');form.id='serviceForm';form.reportValidity=()=>true;form.values={id:'',title:'Sixth service',summary:'Description',sort_order:'6',image_url:''};form.elements={id:{value:''},is_published:{checked:true},image_url:{value:''}};
 Object.defineProperty(form.values,'image_url',{get:()=>form.elements.image_url.value,enumerable:true});
 env.node('#serviceImageFile').listeners.change({target:{files:[{name:'image.png',type:'image/png',size:100}]}});
 await vm.runInContext("saveRecord(document.querySelector('#serviceForm'),'services','#serviceMessage',async()=>{})",ctx);
 assert.equal(uploads[0].bucket,'service-images');assert.equal(writes[0].data.sort_order,6);assert.equal(writes[0].data.is_published,true);assert.match(writes[0].data.image_url,/https:/);assert.equal(form.elements.id.value,'test-id');assert.equal(env.node('#serviceForm button[type=submit]').disabled,false);
 // Retrying a failed database save retains ID and does not upload the image twice.
 fail=true;form.values.id=form.elements.id.value;
 await vm.runInContext("saveRecord(document.querySelector('#serviceForm'),'services','#serviceMessage',async()=>{})",ctx);
 assert.equal(uploads.length,1);assert.equal(env.node('#serviceMessage').textContent,'Save failed');assert.equal(writes[1].data.id,'test-id');
 // Optional date serializes to null, hidden projects stay hidden.
 fail=false;const project=env.node('#caseForm');project.id='caseForm';project.reportValidity=()=>true;project.values={id:'project-1',title:'Project',summary:'Text',sort_order:'2',project_date:'',image_url:''};project.elements={id:{value:'project-1'},is_published:{checked:false},image_url:{value:''}};
 await vm.runInContext("saveRecord(document.querySelector('#caseForm'),'case_studies','#caseMessage',async()=>{})",ctx);
 assert.equal(writes.at(-1).data.project_date,null);assert.equal(writes.at(-1).data.is_published,false);
 // Removing an image changes the field only; invalid file sizes never upload.
 env.node('#removeServiceImage').listeners.click({stopPropagation(){}});assert.equal(form.elements.image_url.value,'');
 env.node('#serviceImageFile').listeners.change({target:{files:[{name:'bad.png',type:'image/png',size:9*1024*1024}]}});assert.match(env.node('#serviceMessage').textContent,/8 MB/);
 // UI controls exist, including the new service image IDs and editable date.
 const html=fs.readFileSync(path.join(root,'public/dashboard/index.html'),'utf8');for(const id of ['serviceImageDrop','serviceImageFile','serviceImagePreview','removeServiceImage'])assert(html.includes(`id="${id}"`));assert(html.includes('name="project_date"'));
 const pub=environment();let site=fs.readFileSync(path.join(root,'public/site.js'),'utf8').replace(/init\(\);\s*$/,'');await vm.runInContext('(async()=>{'+site+';globalThis.testAPI={paintServices,paintWork,loadRows,setClient:c=>supabase=c};})()',pub.context);
 const api=pub.context.testAPI;
 api.paintServices(Array.from({length:7},(_,i)=>({title:i===0?'<script>':'Service '+i,summary:'description',image_url:'https://example.com/image'+i+'.png'})));
 const rendered=pub.node('#serviceGrid').innerHTML;assert.equal((rendered.match(/<article/g)||[]).length,7);assert(rendered.includes('image6.png'));assert(!rendered.includes('<script>'));assert(rendered.includes('&lt;script&gt;'));
 const queries=[];const chain={select(){return this},eq(k,v){queries.push([k,v]);return this},order(k){queries.push(k);return this},then(resolve){resolve({data:[],error:null})}};api.setClient({from:()=>chain});assert.equal((await api.loadRows('services',[{title:'fallback'}])).length,0);assert.deepEqual(queries[0],['is_published',true]);assert(queries.includes('sort_order'));api.paintServices([]);assert.equal(pub.node('#serviceGrid').innerHTML,'');
 for(const file of ['index.html','site.js','styles.css','dashboard/index.html','dashboard/admin.js','dashboard/admin.css'])assert.equal(fs.readFileSync(path.join(root,'public',file),'utf8'),fs.readFileSync(path.join(root,'dist',file),'utf8'));
 console.log('PASS: image upload/removal/validation, save retries, project dates/visibility, all services rendered, image mapping, HTML escaping, empty published lists, ordered queries, forms and dist synchronization.');
})().catch(error=>{console.error(error);process.exitCode=1});
