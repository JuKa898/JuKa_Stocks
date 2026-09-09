const assert=require('assert');const C=require('../core');
const rows=[
 {fy:2023,date:'2023-12-31',revenue:100,operatingIncome:20,netIncome:15,eps:1.5,cfo:20,capex:8,fcf:12,cash:10,debt:5,shares:10,da:5,pretaxIncome:19,incomeTax:4,equity:50},
 {fy:2024,date:'2024-12-31',revenue:110,operatingIncome:22,netIncome:16,eps:1.62,cfo:22,capex:8,fcf:14,cash:11,debt:5,shares:9.9,da:5,pretaxIncome:20,incomeTax:4,equity:55},
 {fy:2025,date:'2025-12-31',revenue:121,operatingIncome:25,netIncome:18,eps:1.84,cfo:25,capex:9,fcf:16,cash:12,debt:5,shares:9.8,da:6,pretaxIncome:23,incomeTax:5,equity:61}
];
const a=C.jukaAutoAssumptions(rows,{growthY1:.123,targetEbitMarginY5:.333});
assert.equal(a.assumptions.growthY1,.123);assert.equal(a.assumptions.targetEbitMarginY5,.333);
const e=C.jukaValuationEngine({s:'OP',sector:'Software'},rows,50,{growthY1:.123,targetEbitMarginY5:.333,wacc:.101});
assert.equal(e.assumptions.dcf.growthY1,.123);assert.equal(e.assumptions.dcf.targetEbitMarginY5,.333);assert.equal(e.assumptions.dcf.wacc,.101);
console.log('override-precedence.test.js: OK');
