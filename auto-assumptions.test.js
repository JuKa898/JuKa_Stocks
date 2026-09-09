const assert=require('assert'); const C=require('../core');
const stable=[
 {fy:2021,date:'2021-12-31',revenue:100,operatingIncome:25,netIncome:18,eps:1.8,fcf:20,shares:10,cash:15,debt:5,equity:60,capex:5,pretaxIncome:23,incomeTax:5},
 {fy:2022,date:'2022-12-31',revenue:112,operatingIncome:29,netIncome:21,eps:2.1,fcf:23,shares:9.9,cash:17,debt:5,equity:67,capex:5.5,pretaxIncome:27,incomeTax:6},
 {fy:2023,date:'2023-12-31',revenue:126,operatingIncome:34,netIncome:25,eps:2.55,fcf:27,shares:9.8,cash:20,debt:5,equity:75,capex:6,pretaxIncome:31,incomeTax:6},
 {fy:2024,date:'2024-12-31',revenue:142,operatingIncome:39,netIncome:29,eps:3.0,fcf:31,shares:9.7,cash:24,debt:5,equity:84,capex:6.5,pretaxIncome:36,incomeTax:7},
 {fy:2025,date:'2025-12-31',revenue:160,operatingIncome:45,netIncome:34,eps:3.54,fcf:36,shares:9.6,cash:28,debt:5,equity:94,capex:7,pretaxIncome:42,incomeTax:8}
];
const q=C.jukaDataQuality(stable); assert.ok(q.score>=80); assert.equal(q.years,5);
const p=C.jukaCompanyProfile(stable); assert.ok(p.highMargin); assert.ok(p.cashRich); assert.ok(!p.cyclical);
const a=C.jukaAutoAssumptions(stable); assert.ok(a.assumptions.growthY1>0); assert.ok(a.assumptions.growthY5<a.assumptions.growthY1); assert.equal(a.confidence,'hoch');
const f=C.jukaForecast5Y(stable); assert.equal(f.rows.length,5); assert.ok(f.assumptions.growthY1>0);
const cyc=stable.map((r,i)=>({...r,revenue:[100,150,105,165,115][i],operatingIncome:[20,45,10,50,12][i]}));
const cp=C.jukaCompanyProfile(cyc); assert.ok(cp.cyclical);
const ca=C.jukaAutoAssumptions(cyc); assert.ok(ca.assumptions.growthY1<=.25);
console.log('auto-assumptions.test.js: OK');
