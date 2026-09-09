const assert=require('assert');
const C=require('../core.js');
const annual=[];
for(let y=2019;y<=2024;y++){
  const t=y-2019,revenue=1000*Math.pow(1.10,t),operatingIncome=revenue*.25,netIncome=revenue*.18,cfo=revenue*.24,capex=revenue*.06,fcf=cfo-capex,da=revenue*.05;
  annual.push({fy:y,date:`${y}-12-31`,filed:`${y+1}-02-15`,revenue,operatingIncome,netIncome,eps:5*Math.pow(1.09,t),cfo,capex,fcf,da,sbc:revenue*.02,interestExpense:20,pretaxIncome:netIncome/.8,incomeTax:(netIncome/.8)*.2,cash:300+t*20,debt:200,equity:700+t*60,shares:100*Math.pow(.995,t),deltaNwc:revenue*.01});
}
const d=C.deriveFundamentals(annual),last=d.at(-1);
assert.ok(Math.abs(last.operatingMargin-.25)<1e-12);
assert.ok(last.revenueCagr5y>.099&&last.revenueCagr5y<.101);
assert.ok(last.fcfConversion>.99&&last.fcfConversion<1.01);
assert.ok(last.netDebtToEbitda<0);
const qi=C.qualityInputFromAnnual(annual); assert.ok(qi&&Number.isFinite(qi.roic)&&Number.isFinite(qi.dilutionPa));
const inp=C.dcfInputFromAnnual(annual); assert.ok(inp&&inp.revenue>0&&inp.shares>0&&inp.availableFrom==='2025-02-15');
const sc=C.jukaDcfScenarios(inp); assert.ok(sc&&sc.bear<sc.base&&sc.base<sc.bull);
const prices=[{date:'2024-01-15',price:100},{date:'2024-03-01',price:105},{date:'2025-03-01',price:110}];
const hs=C.buildHistoricalJukaFairSeries(prices,annual,{wacc:.09,terminalGrowth:.025});
assert.strictEqual(hs[0].sourceFy,2022); // 2023 filing not public yet on Jan 15 2024
assert.strictEqual(hs[1].sourceFy,2023);
assert.strictEqual(hs[2].sourceFy,2024);
assert.ok(hs[2].base>0&&hs[2].model==='juka-10y');
console.log('fundamentals.test.js: OK');
