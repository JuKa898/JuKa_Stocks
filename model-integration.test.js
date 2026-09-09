const assert=require('assert');const C=require('../core');const P=require('../lib/pipeline');
const market={meta:{currency:'USD',exchange:'NYSE'},values:[{datetime:'2026-01-02',close:'50'}]};
const bank={s:'BANK',sector:'Bank',valuationModel:'bank-insurance',region:'US',currency:'USD'};
const bankFacts={annual:[
 {fy:2024,date:'2024-12-31',revenue:80,operatingIncome:20,netIncome:10,eps:1,shares:10,equity:90,cash:20,debt:30},
 {fy:2025,date:'2025-12-31',revenue:85,operatingIncome:22,netIncome:12,eps:1.2,shares:10,equity:100,cash:22,debt:31}
],source:'test',status:'ok'};
let s=P.buildSnapshot(bank,market,bankFacts,C);
assert.equal(s.model,'bank-insurance');assert.ok(s.modelReadiness.ready);assert.equal(s.analysisStatus,'complete');assert.ok(s.valuation&&s.valuation.base>0);
assert.equal(s.quality,null);assert.deepEqual(s.historical,[]);
const reit={s:'REIT',sector:'REIT',valuationModel:'reit',region:'US',currency:'USD'};
const reitFacts={annual:[{fy:2025,date:'2025-12-31',revenue:100,netIncome:20,eps:2,shares:10,equity:150,cash:5,debt:80}],source:'test',status:'ok'};
s=P.buildSnapshot(reit,market,reitFacts,C);
assert.equal(s.model,'reit');assert.ok(!s.modelReadiness.ready);assert.equal(s.analysisStatus,'partial');assert.equal(s.valuation,null);assert.ok(s.warnings.some(x=>x.includes('affo')));assert.deepEqual(s.historical,[]);
const op={s:'OP',sector:'Software',region:'US',currency:'USD'};
const opFacts={annual:[
 {fy:2024,date:'2024-12-31',filed:'2025-02-01',revenue:100,operatingIncome:20,netIncome:15,eps:1.5,cfo:20,capex:8,fcf:12,cash:15,debt:5,shares:10,da:5,pretaxIncome:19,incomeTax:4,equity:50},
 {fy:2025,date:'2025-12-31',filed:'2026-02-01',revenue:115,operatingIncome:24,netIncome:18,eps:1.82,cfo:24,capex:9,fcf:15,cash:18,debt:5,shares:9.9,da:6,pretaxIncome:23,incomeTax:5,equity:58}
],source:'test',status:'ok'};
s=P.buildSnapshot(op,market,opFacts,C);assert.ok(s.modelReadiness.ready);assert.ok(Array.isArray(s.historical));assert.ok(s.historical.length===1);
console.log('model-integration.test.js: OK');
