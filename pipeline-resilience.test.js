const assert=require('assert');const C=require('../core');const P=require('../lib/pipeline');
const market={meta:{currency:'EUR',exchange:'Xetra'},values:[{datetime:'2026-01-02',close:'200'}]};
const stock={s:'SAP',n:'SAP SE',region:'EU',currency:'EUR',marketSymbol:'SAP:XETR',sector:'Software'};
(async()=>{
 let f=0;
 const pipe=P.createPipeline({core:C,marketAdapter:async()=>market,fundamentalsAdapter:async()=>{f++;throw Object.assign(new Error('EU pending'),{code:'EU_PENDING'})}});
 const s=await pipe.load(stock);
 assert.equal(s.analysisStatus,'market-only'); assert.equal(s.price,200); assert.equal(s.currency,'EUR'); assert.equal(s.dataCoverage.hasFundamentals,false); assert.ok(s.warnings.some(x=>x.includes('EU pending'))); assert.equal(f,1);
 let failed=false;
 const strict=P.createPipeline({core:C,allowPartial:false,marketAdapter:async()=>market,fundamentalsAdapter:async()=>{throw new Error('boom')}});
 try{await strict.load(stock)}catch(e){failed=true} assert.ok(failed);
 console.log('pipeline-resilience.test.js: OK');
})().catch(e=>{console.error(e);process.exit(1)});
