const assert=require('assert'); const C=require('../core.js');
assert.ok(Math.abs(C.valuationPct(90,100)+10)<1e-9);
assert.strictEqual(C.filterPeriod(Array.from({length:100},(_,i)=>i),'1Y').length,13);
const fv=C.dcfFairValue({fcf0:100,growth:.08,fadeGrowth:.04,wacc:.09,terminalGrowth:.025,years:10,netCash:20,shares:10}); assert.ok(Number.isFinite(fv)&&fv>0);
const sc=C.scenarioValues({fcf0:100,growth:.08,fadeGrowth:.04,wacc:.09,terminalGrowth:.025,years:10,netCash:20,shares:10}); assert.ok(sc.bear<sc.base&&sc.base<sc.bull);
const qs=C.qualityScore({roic:.25,operatingMargin:.35,revenueCagr3y:.16,epsCagr3y:.16,fcfMargin:.22,netDebtToEbit:-1,shareCagr3y:-.01}); assert.ok(qs.score>=85&&qs.grade==='A');
const prices=[{date:'2023-12-31',price:100},{date:'2024-12-31',price:120}]; const facts=[{date:'2023-01-01',fcf:100,netCash:20,shares:10,revenueCagr3y:.08},{date:'2024-01-01',fcf:120,netCash:25,shares:10,revenueCagr3y:.09}]; const series=C.buildFairSeries(prices,facts,{}); assert.strictEqual(series.length,2); assert.ok(series[0].base>0&&series[1].base>0);
console.log('core.test.js: OK');
