// AST-497 interaction harness. All non-GET calls to beblocky API hosts (except auth sign-in) are answered locally with {} so nothing is written to prod.
// Usage: BEBLOCKY_CLIENT_EMAIL=... BEBLOCKY_CLIENT_PASSWORD=... node scripts/perf/ide-interactions.mjs <learn url>
// Needs puppeteer-core resolvable (e.g. npm i -g puppeteer-core and NODE_PATH=$(npm root -g)). A localhost URL reuses the prod IDE session cookie.
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome', headless:'new', args:['--no-sandbox'], defaultViewport:{width:1500,height:900}});
let page = await b.newPage();
await page.goto('https://code.beblocky.com/', {waitUntil:'networkidle2', timeout:60000});
const tv = async (s,v)=>{for(const h of await page.$$(s)) if(await h.isVisible()){await h.type(v);return}};
await tv('input[type=email]', process.env.BEBLOCKY_CLIENT_EMAIL); await tv('input[type=password]', process.env.BEBLOCKY_CLIENT_PASSWORD);
for (const h of await page.$$('button[type=submit]')) if (await h.isVisible()) { await h.click(); break; }
await page.waitForFunction(()=>location.hostname==='code.beblocky.com',{timeout:30000}).catch(()=>{});
await page.waitForNetworkIdle({idleTime:1500,timeout:30000}).catch(()=>{});
const mocked=[];
const guard = async p => { await p.setRequestInterception(true); p.on('request', r=>{ const u=new URL(r.url());
  if (r.method()!=='GET' && r.method()!=='OPTIONS' && /beblocky\.com$/.test(u.hostname) && !/sign-in|signin|login/.test(u.pathname) && u.hostname!=='code.beblocky.com' && u.hostname!=='ide.beblocky.com') {
    mocked.push(`${r.method()} ${u.host}${u.pathname.replace(/[0-9a-f]{24}/g,':id')}`); return r.respond({status:200, contentType:'application/json', headers:{'access-control-allow-origin':r.headers().origin||'*','access-control-allow-credentials':'true'}, body:'{}'}); }
  r.continue(); }); };
const url = process.argv[2] || process.env.IDE_LEARN_URL;
if (/localhost/.test(url)) { // reuse the prod IDE session on a local build: open prod IDE once to get its cookies, copy them to localhost
  const p2=await b.newPage(); await p2.goto(process.env.IDE_PROD_URL||'https://ide.beblocky.com/',{waitUntil:'networkidle2',timeout:60000}).catch(()=>{});
  const ck=await p2.cookies('https://ide.beblocky.com'); await p2.close();
  await page.setCookie(...ck.map(c=>({name:c.name,value:c.value,domain:'localhost',path:'/',httpOnly:c.httpOnly,secure:false,sameSite:'Lax'})));
  console.log('copied ide cookies:', ck.map(c=>c.name).join(',')); }
await guard(page);
const T0=Date.now(); await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForSelector('.ace_editor',{timeout:60000}).catch(()=>{}); const tEd=Date.now()-T0;
await page.waitForNetworkIdle({idleTime:1500,timeout:60000}).catch(()=>{});
const perf = await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0]; const js=performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.js')); const fcp=performance.getEntriesByName('first-contentful-paint')[0]; return {ttfb:Math.round(n.responseStart-n.requestStart), fcp:Math.round(fcp?.startTime||0), jsCount:js.length, jsKB:Math.round(js.reduce((a,r)=>a+(r.transferSize||0),0)/1024)}});
console.log(`LOAD direct learn url: editor visible ${tEd}ms`, JSON.stringify(perf));
await page.evaluate(()=>{window.__lt=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(Math.round(e.duration)))).observe({type:'longtask'});});
const lts = ()=>page.evaluate(()=>{const x=window.__lt;window.__lt=[];return x.join(',')});
const btn = async (pred)=>{ for (const h of await page.$$('button')) { if (!(await h.isVisible())) continue; if (await h.evaluate(pred)) return h; } return null; };
const res={};
console.log('buttons:', await page.$$eval('button',bs=>bs.filter(x=>x.offsetParent).map(x=>(x.innerText||x.title||'').trim().replace(/\s+/g,' ')).filter(Boolean).join(' | ')));
// Run/Preview: refresh button rebuilds the sandboxed iframe doc (cross-origin, so time click -> two painted frames + long tasks)
{ const h = await btn(e=>!!e.querySelector('svg.lucide-refresh-cw'));
  if (!h) res.preview='button not found'; else {
    const s=Date.now(); await h.click(); await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    res.preview = `${Date.now()-s}ms (click->2 frames painted) longtasks=[${await lts()}]`; } }
{ const back = await btn(e=>/^back$/i.test(e.innerText.trim())); if (back) { await back.click(); await new Promise(r=>setTimeout(r,1500)); await lts(); } }
// Next Step
{ const h = await btn(e=>/next step|^next$/i.test(e.innerText.trim()));
  if (!h) res.next='button not found'; else {
    const before = await page.evaluate(()=>document.body.innerText);
    const s=Date.now(); await h.click();
    const ok = await page.waitForFunction(b=>document.body.innerText!==b,{timeout:8000,polling:'mutation'},before).then(()=>true).catch(()=>false);
    const t=Date.now()-s; await new Promise(r=>setTimeout(r,1500));
    res.next = ok? `${t}ms (click->slide content changed) longtasks=[${await lts()}]` : 'content change not detected'; } }
// Save Code (write mocked)
{ const h = await btn(e=>/save code/i.test(e.innerText.trim()) || e.title==='Save Code');
  if (!h) res.save='button not found'; else {
    const s=Date.now(); await h.click();
    const c = await page.waitForFunction(()=>[...document.querySelectorAll('[role=alertdialog] button,[role=dialog] button')].find(x=>x.innerText.trim()==='Save'),{timeout:5000}).catch(()=>null);
    const tDlg=Date.now()-s;
    if (!c) res.save='confirm dialog not found'; else { const s2=Date.now(); await c.asElement().click();
      const ok = await page.waitForFunction(()=>![...document.querySelectorAll('[role=alertdialog],[role=dialog]')].some(d=>/Save Code/.test(d.innerText)),{timeout:15000,polling:'mutation'}).then(()=>true).catch(()=>false);
      
      res.save = ok? `dialog ${tDlg}ms; confirm->dialog closed (save done) ${Date.now()-s2}ms longtasks=[${await lts()}]` : 'no toast'; } } }
for (const [k,v] of Object.entries(res)) console.log(`${k}: ${v}`);
console.log('mocked writes (not sent to prod):', [...new Set(mocked)].join(' | ')||'none');
await b.close();
