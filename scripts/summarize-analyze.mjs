// usage: node analyze-summary.mjs <repo> ; summarize `next experimental-analyze -o` output for the learn route
import fs from 'fs';
const d=process.argv[2]+'/.next/diagnostics/analyze/data/';
const rd=f=>{const b=fs.readFileSync(f,'utf8');const s=b.indexOf('{');let dep=0,str=false,esc=false;
 for(let i=s;i<b.length;i++){const c=b[i];if(str){if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')str=false;continue;}
  if(c==='"')str=true;else if(c==='{')dep++;else if(c==='}'&&--dep===0)return JSON.parse(b.slice(s,i+1));}};
const a=rd(d+'courses/[courseId]/learn/analyze.data');
const full=i=>{const p=[];for(let s=a.sources[i];s;s=a.sources[s.parent_source_index]){p.unshift(s.path);if(s.parent_source_index==null)break;}return p.join('').replace(/\/\/+/g,'/');};
const cache=new Map();const fp=i=>cache.get(i)??(cache.set(i,full(i)),cache.get(i));
const client=a.output_files.map(f=>/static\/chunks|\/chunks\/[^s]/.test(f.filename)&&!/server/.test(f.filename));
const pkg=p=>{const m=[...p.matchAll(/node_modules\/(@[^/]+\/[^/]+|[^/@.][^/]*)/g)];return m.length?m[m.length-1][1]:(p.match(/^\/?(?:\[project\]\/)?(app|components|lib|hooks)\b/)?.[1]?'app code ('+RegExp.$1+')':'other');};
const agg=new Map();let tot=0,totc=0;
for(const c of a.chunk_parts){if(!client[c.output_file_index])continue;const k=pkg(fp(c.source_index));const e=agg.get(k)||[0,0];e[0]+=c.size;e[1]+=c.compressed_size;agg.set(k,e);tot+=c.size;totc+=c.compressed_size;}
console.log(`\nClient output (learn route analysis): ${(tot/1024).toFixed(0)}KB raw, ${(totc/1024).toFixed(0)}KB compressed (per-module est.)`);
[...agg].sort((x,y)=>y[1][1]-x[1][1]).slice(0,+process.argv[3]||25).forEach(([k,[s,c]])=>console.log(`${(c/1024).toFixed(1).padStart(7)}KB gz ${(s/1024).toFixed(1).padStart(7)}KB raw  ${k}`));
