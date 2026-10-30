const fs=require('fs'),path=require('path'),os=require('os');
const {chromium}=require('playwright');
const root=__dirname,out=path.join(root,'measurements');fs.mkdirSync(out,{recursive:true});
const PILOT=process.argv.includes('--pilot'), PAIRS=PILOT?1:20;
const BASE='http://127.0.0.1:18080';
async function post(url,data){const r=await fetch(BASE+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return r.json();}
const toMetrics=x=>Object.fromEntries(x.metrics.map(a=>[a.name,a.value]));
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-networking','--disable-extensions']});
 const env={timestamp_utc:new Date().toISOString(),node:process.version,browser:browser.version(),browser_channel:'msedge',headless:true,viewport:{width:800,height:500},cpu:os.cpus()[0].model,logical_cpus:os.cpus().length,total_ram_bytes:os.totalmem(),os:os.type(),os_release:os.release(),hardware_claim:'This host was used for supplementary A4 runs only, not the historical A3 runs.',source_commit:'fc9c818b5e46a2c7b2e43b41c155b813a66f6a08',pairs:PAIRS,pages_per_run:42,batch_size:12,input_records:500,checkpoints:[12,120,252,500],seed_rule:'1000 + pair; identical API artificial-delay seed for both conditions within pair',order_rule:'pagination first on odd pair; infinite first on even pair',network:'loopback HTTP; no network or CPU throttling',gc_rule:'force GC only at checkpoints; snapshot task timing captured before GC',pilot:PILOT};
 fs.writeFileSync(path.join(out,PILOT?'pilot_environment.json':'environment.json'),JSON.stringify(env,null,2));
 if(!PILOT){for(const mode of ['pagination','infinite']){const c=await browser.newContext({viewport:env.viewport});const p=await c.newPage();await p.goto(BASE+'/'+mode);await p.waitForFunction(()=>document.querySelectorAll('.card').length===12);await p.waitForTimeout(150);await c.close();}fs.writeFileSync(path.join(out,'warmup.json'),JSON.stringify({warmup_contexts:2,conditions:['pagination','infinite'],purpose:'Browser and asset initialization only; not included in measured trials.'},null,2));}
 const all=[], trials=[];
 for(let pair=1;pair<=PAIRS;pair++){
  for(const mode of pair%2?['pagination','infinite']:['infinite','pagination']){
   const id=(PILOT?'P':'R')+String(pair).padStart(2,'0')+'_'+mode;
   await post('/a4/reset',{seed:1000+pair,run_id:id});
   const context=await browser.newContext({viewport:env.viewport,deviceScaleFactor:1,locale:'en-US',reducedMotion:'reduce'});
   const page=await context.newPage();const errors=[],responses=[];
   page.on('pageerror',e=>errors.push(String(e)));
   page.on('response',async r=>{if(r.url().includes('/api/items')){try{const j=await r.json();responses.push({url:r.url(),status:r.status(),page:j.page,items:j.items.length,first_id:j.items[0]?.id,last_id:j.items.at(-1)?.id});}catch(e){errors.push('response JSON: '+e);}}});
   await page.addInitScript(()=>{window.__a4paint=[];new PerformanceObserver(l=>window.__a4paint.push(...l.getEntries().map(x=>({type:x.entryType,name:x.name,startTime:x.startTime,size:x.size})))).observe({type:'largest-contentful-paint',buffered:true});});
   const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
   const start=Date.now();await page.goto(BASE+'/'+mode);await page.waitForFunction(()=>document.querySelectorAll('.card').length===12);const initialReady=await page.evaluate(()=>performance.now());await page.waitForTimeout(120);
   let previous=toMetrics(await cdp.send('Performance.getMetrics'));
   for(let pg=1;pg<=42;pg++){
    let latency=null;
    if(pg>1){
     latency=await page.evaluate(async ({mode,pg})=>{
      const t=performance.now();
      const target=Math.min(500,pg*12), expectedFirst=mode==='pagination'?(pg-1)*12+1:1;
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{observer.disconnect();reject(new Error('card completion timeout '+pg))},10000);const observer=new MutationObserver(()=>{const first=document.querySelector('.card .idx'),last=document.querySelector('.card:last-child .idx');if(first?.textContent==='#'+expectedFirst&&last?.textContent==='#'+target){observer.disconnect();clearTimeout(timer);requestAnimationFrame(()=>requestAnimationFrame(resolve));}});observer.observe(document.querySelector('.grid'),{childList:true});if(mode==='pagination')document.querySelector('.pager button:last-child').click();else window.scrollTo(0,document.body.scrollHeight);});
      return performance.now()-t;
     },{mode,pg});
    }
    const m=toMetrics(await cdp.send('Performance.getMetrics'));
    const dom=await page.evaluate(()=>({cards:document.querySelectorAll('.card').length,elements:document.querySelectorAll('*').length,last:Number(document.querySelector('.card:last-child .idx').textContent.slice(1)),first:Number(document.querySelector('.card:first-child .idx').textContent.slice(1))}));
    const row={run_id:id,pair,mode,page:pg,loaded_records:Math.min(500,pg*12),batch_ready_ms:latency,cards:dom.cards,document_elements:dom.elements,first_id:dom.first,last_id:dom.last,heap_before_gc_bytes:m.JSHeapUsedSize,task_duration_s:m.TaskDuration,layout_duration_s:m.LayoutDuration,recalc_duration_s:m.RecalcStyleDuration,script_duration_s:m.ScriptDuration,task_since_previous_s:m.TaskDuration-previous.TaskDuration,checkpoint:[1,10,21,42].includes(pg)};
    if(row.checkpoint){await cdp.send('HeapProfiler.collectGarbage');row.heap_after_gc_bytes=toMetrics(await cdp.send('Performance.getMetrics')).JSHeapUsedSize;}
    all.push(row);previous=toMetrics(await cdp.send('Performance.getMetrics'));
   }
   await page.waitForTimeout(50);const api=await(await fetch(BASE+'/a4/logs')).json();
   const paints=await page.evaluate(()=>({fcp:performance.getEntriesByType('paint').find(x=>x.name==='first-contentful-paint')?.startTime,lcp_entries:window.__a4paint}));
   const trial={run_id:id,pair,mode,start_epoch_ms:start,end_epoch_ms:Date.now(),initial_batch_ready_ms:initialReady,api_count:api.length,api_errors:api.filter(x=>x.status!==200).length,rendered_final_cards:all.at(-1).cards,total_records:responses.reduce((s,x)=>s+x.items,0),browser_errors:errors,paint:paints};
   trials.push(trial);fs.writeFileSync(path.join(out,id+'.json'),JSON.stringify({trial,api,responses,rows:all.filter(x=>x.run_id===id)},null,2));
   if(pair===1)await page.screenshot({path:path.join(out,id+'_final.png'),fullPage:false});
   await context.close();
   if(trial.api_count!==42||trial.total_records!==500||errors.length)throw new Error('Invalid trial: '+JSON.stringify(trial));
   console.log(id+' valid; API='+trial.api_count+'; records='+trial.total_records+'; retained='+trial.rendered_final_cards);
  }
  fs.writeFileSync(path.join(out,PILOT?'pilot_rows.json':'all_rows.json'),JSON.stringify(all));fs.writeFileSync(path.join(out,PILOT?'pilot_trials.json':'trials.json'),JSON.stringify(trials,null,2));
 }
 await browser.close();console.log('COMPLETE '+trials.length+' valid supplementary trials.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
