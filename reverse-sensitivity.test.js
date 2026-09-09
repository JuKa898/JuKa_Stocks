const assert=require('assert'); const C=require('../core');
const input={revenue:228247,ebit:86926,taxRate:.18,da:29663,capex:72470,deltaNwc:-5577,shares:2567,netFinancialPosition:-6596,growthY1:.18,growthY5:.10,targetEbitMarginY5:.40,wacc:.095,terminalGrowth:.03,terminalRoic:.326345,capexPctY5:.18,daPctY5:.12,nwcPctY5:0};
const base=C.jukaDcf10Y(input); assert.ok(base&&base.fairValue>0);
const r=C.jukaReverseDcf(input,base.fairValue); assert.ok(Math.abs(r.impliedMargin-input.targetEbitMarginY5)<1e-7); assert.ok(Math.abs(r.impliedWacc-input.wacc)<1e-7);
const s=C.jukaSensitivity(input); assert.equal(s.values.length,5); assert.equal(s.values[0].length,5); assert.ok(Math.abs(s.values[2][2]-base.fairValue)<1e-8);
console.log('reverse-sensitivity.test.js: OK');
