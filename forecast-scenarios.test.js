const assert=require('assert'); const C=require('../core');
const annual=[
 {fy:2021,date:'2021-12-31',revenue:100,operatingIncome:20,netIncome:16,eps:1.6,fcf:14,shares:10,debt:10,cash:5,equity:50,da:5,capex:4,pretaxIncome:20,incomeTax:4},
 {fy:2022,date:'2022-12-31',revenue:112,operatingIncome:24,netIncome:19,eps:1.94,fcf:16,shares:9.8,debt:10,cash:7,equity:56,da:5.5,capex:4.5,pretaxIncome:24,incomeTax:5},
 {fy:2023,date:'2023-12-31',revenue:128,operatingIncome:30,netIncome:24,eps:2.5,fcf:20,shares:9.6,debt:9,cash:9,equity:64,da:6,capex:5,pretaxIncome:30,incomeTax:6},
 {fy:2024,date:'2024-12-31',revenue:145,operatingIncome:36,netIncome:29,eps:3.05,fcf:25,shares:9.5,debt:8,cash:12,equity:72,da:6.5,capex:5.5,pretaxIncome:36,incomeTax:7},
 {fy:2025,date:'2025-12-31',revenue:165,operatingIncome:43,netIncome:34,eps:3.62,fcf:30,shares:9.4,debt:7,cash:15,equity:81,da:7,capex:6,pretaxIncome:43,incomeTax:8}
];
const s=C.jukaForecastScenarios(annual,{growthY1:.12,growthY5:.05,targetEbitMarginY5:.28,targetFcfMarginY5:.20,taxRate:.20,shareGrowth:-.01});
assert.ok(s.bear&&s.base&&s.bull);
assert.ok(s.bear.summary.epsY5 < s.base.summary.epsY5);
assert.ok(s.base.summary.epsY5 < s.bull.summary.epsY5);
assert.ok(s.bear.summary.marginY5 < s.base.summary.marginY5);
assert.ok(s.base.summary.marginY5 < s.bull.summary.marginY5);
const m=C.jukaExpectedReturnMatrix({price:100,epsTtm:5,scenarios:s,fairValues:{bear:80,base:100,bull:130}});
assert.equal(m.matrix.length,9);
assert.ok(m.exitPes.bear < m.exitPes.base && m.exitPes.base < m.exitPes.bull);
const lookup=Object.fromEntries(m.matrix.map(x=>[x.forecast+'-'+x.exitMultiple,x.returnCagr]));
assert.ok(lookup['bear-bear'] < lookup['base-base']);
assert.ok(lookup['base-base'] < lookup['bull-bull']);
console.log('forecast-scenarios.test.js: OK');
