const base=(process.argv[2]||process.env.JUKA_BASE_URL||'').replace(/\/$/,'');
if(!base){console.error('Usage: node scripts/smoke-live.mjs https://deployment.example');process.exit(2)}
async function get(path){
 const r=await fetch(base+path,{headers:{'User-Agent':'JUKA release smoke test'}});
 let j;try{j=await r.json()}catch{j={}};
 return {status:r.status,json:j};
}
const checks=[];
const health=await get('/api/health');
checks.push(['health',health.status===200,health]);
const cases=[
 ['operating','META','technology','operating-company'],
 ['bank','JPM','bank','bank-insurance'],
 ['reit','O','reit','reit']
];
for(const [name,symbol,sector,model] of cases){
 const x=await get(`/api/analysis?summary=1&symbol=${encodeURIComponent(symbol)}&sector=${encodeURIComponent(sector)}&model=${encodeURIComponent(model)}`);
 const ok=x.status===200 && x.json?.valuation && x.json?.release && typeof x.json.release.liveReady==='boolean';
 checks.push([name,ok,x]);
}
for(const [name,ok,x] of checks)console.log(`${ok?'PASS':'FAIL'} ${name} HTTP ${x.status}`,JSON.stringify(x.json?.release||x.json?.providerReadiness||x.json?.error||{}));
if(checks.some(x=>!x[1]))process.exit(1);
