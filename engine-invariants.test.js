const assert=require('assert');const C=require('../core');
const base={revenue:1000,ebit:200,taxRate:.21,da:80,capex:100,deltaNwc:5,shares:100,netFinancialPosition:0,growthY1:.10,growthY5:.05,targetEbitMarginY5:.22,wacc:.09,terminalGrowth:.025,terminalRoic:.18,capexPctY5:.09,daPctY5:.075,nwcPctY5:.005};
for(let i=0;i<50;i++){
 const x={...base,wacc:.075+Math.random()*.045,terminalGrowth:.015+Math.random()*.018,targetEbitMarginY5:.15+Math.random()*.20};
 if(x.wacc<=x.terminalGrowth+.005){i--;continue}
 const d=C.jukaDcf10Y(x);assert.ok(d&&Number.isFinite(d.fairValue)&&d.fairValue>0);
 const s=C.jukaSensitivity(x);assert.equal(s.values.length,5);assert.ok(s.values.every(row=>row.length===5));
 const sc=C.jukaDcfScenarios(x);assert.ok(sc.bear<sc.base&&sc.base<sc.bull);
}
console.log('engine-invariants.test.js: OK');
