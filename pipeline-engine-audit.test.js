const assert=require('assert');const C=require('../core');const P=require('../lib/pipeline');
const market={meta:{currency:'USD',exchange:'NYSE'},values:[{datetime:'2026-01-02',close:'100'}]};
const facts={annual:[
 {fy:2024,date:'2024-12-31',filed:'2025-02-01',revenue:100,operatingIncome:20,netIncome:15,eps:1.5,cfo:20,capex:8,fcf:12,cash:15,debt:5,shares:10,da:5,pretaxIncome:19,incomeTax:4,equity:50},
 {fy:2025,date:'2025-12-31',filed:'2026-02-01',revenue:115,operatingIncome:24,netIncome:18,eps:1.82,cfo:24,capex:9,fcf:15,cash:18,debt:5,shares:9.9,da:6,pretaxIncome:23,incomeTax:5,equity:58}
],source:'test',status:'ok'};
const s=P.buildSnapshot({s:'OP',sector:'Software'},market,facts,C);
assert.ok(s.modelReadiness);assert.ok(s.riskAudit);assert.ok('engineAssumptions' in s);assert.ok(s.valuation?.base>0);
console.log('pipeline-engine-audit.test.js: OK');
