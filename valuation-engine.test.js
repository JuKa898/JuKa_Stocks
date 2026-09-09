const assert=require('assert');const C=require('../core');
const op=[
 {fy:2021,date:'2021-12-31',revenue:100,operatingIncome:20,netIncome:14,eps:1.4,cfo:20,capex:8,fcf:12,cash:15,debt:5,shares:10,da:6,pretaxIncome:18,incomeTax:4,equity:50},
 {fy:2022,date:'2022-12-31',revenue:112,operatingIncome:23,netIncome:16,eps:1.62,cfo:23,capex:9,fcf:14,cash:17,debt:5,shares:9.9,da:7,pretaxIncome:21,incomeTax:4,equity:57},
 {fy:2023,date:'2023-12-31',revenue:126,operatingIncome:27,netIncome:19,eps:1.94,cfo:27,capex:10,fcf:17,cash:20,debt:5,shares:9.8,da:8,pretaxIncome:25,incomeTax:5,equity:65},
 {fy:2024,date:'2024-12-31',revenue:141,operatingIncome:31,netIncome:22,eps:2.27,cfo:31,capex:11,fcf:20,cash:23,debt:5,shares:9.7,da:9,pretaxIncome:29,incomeTax:6,equity:74},
 {fy:2025,date:'2025-12-31',revenue:158,operatingIncome:36,netIncome:26,eps:2.71,cfo:36,capex:12,fcf:24,cash:27,debt:5,shares:9.6,da:10,pretaxIncome:33,incomeTax:7,equity:84}
];
let e=C.jukaValuationEngine({s:'OP',sector:'Software'},op,100);
assert.equal(e.model,'operating-company');assert.ok(e.readiness.ready);assert.ok(e.valuation?.base>0);assert.ok(e.reverse);assert.ok(e.quality);
const bank=[
 {fy:2023,date:'2023-12-31',netIncome:9,shares:10,equity:90,eps:.9},
 {fy:2024,date:'2024-12-31',netIncome:10,shares:10,equity:95,eps:1},
 {fy:2025,date:'2025-12-31',netIncome:12,shares:10,equity:100,eps:1.2}
];
e=C.jukaValuationEngine({s:'BANK',sector:'Bank'},bank,12);
assert.equal(e.model,'bank-insurance');assert.ok(e.readiness.ready);assert.ok(e.valuation?.base>0);assert.equal(e.quality,null);
e=C.jukaValuationEngine({s:'REIT',sector:'REIT'},[{fy:2025,date:'2025-12-31',netIncome:10,shares:10,equity:100,affo:20}],25);
assert.ok(e.readiness.ready);assert.ok(e.valuation?.base>0);
e=C.jukaValuationEngine({s:'REIT',sector:'REIT'},[{fy:2025,date:'2025-12-31',netIncome:10,shares:10,equity:100}],25);
assert.ok(!e.readiness.ready);assert.equal(e.valuation,null);
console.log('valuation-engine.test.js: OK');
