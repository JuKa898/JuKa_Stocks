import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Core=require('../core.js');

// 1) Nulls must never become economic zero inside historical statistics.
const missingRows=[
  {date:'2021-12-31',revenue:100,operatingIncome:null,fcf:null,shares:10,cash:20,debt:5,equity:50},
  {date:'2022-12-31',revenue:110,operatingIncome:11,fcf:8,shares:10,cash:21,debt:5,equity:55},
  {date:'2023-12-31',revenue:120,operatingIncome:null,fcf:null,shares:10,cash:22,debt:5,equity:60},
  {date:'2024-12-31',revenue:130,operatingIncome:26,fcf:13,shares:10,cash:23,debt:5,equity:65},
];
const profile=Core.jukaCompanyProfile(missingRows);
assert.ok(profile);
assert.ok(profile.marginMedian>0.15, 'missing operating margins must not be counted as 0 in the median');

// 2) Invested capital must be unavailable if equity/debt are missing, not silently zero.
assert.equal(Core.jukaNormalizedInvestedCapital({equity:null,debt:null,cash:10}).value,null);
assert.equal(Core.jukaNormalizedInvestedCapital({equity:100,debt:null,cash:10}).value,null);

// 3) Equity valuation requires a known debt/cash bridge.
const robustRows=Array.from({length:5},(_,i)=>({
  fy:2020+i,date:`${2020+i}-12-31`,revenue:100+20*i,operatingIncome:20+4*i,netIncome:15+3*i,
  cfo:20+4*i,capex:5+i,fcf:15+3*i,shares:10,da:5+i,sbc:1,pretaxIncome:18+3*i,incomeTax:4+0.6*i,
  equity:70+10*i,cash:20+2*i,debt:10
}));
const missingBridge=robustRows.map(x=>({...x,cash:null,debt:null}));
assert.equal(Core.jukaModelReadiness('operating-company',missingBridge.at(-1),missingBridge).ready,false);
assert.equal(Core.dcfInputFromAnnual(missingBridge),null);
assert.equal(Core.jukaSimpleIntrinsicOperating(missingBridge,{assumptions:{wacc:.09,terminalGrowth:.025,terminalRoic:.12}}),null);

// 4) Relative EV multiples must not pretend cash/debt are zero when unknown.
const multiples=Core.valuationMultiplesFromSnapshot({price:50,latest:{shares:10,operatingIncome:20,eps:5,fcf:15,equity:100,debt:null,cash:null}});
assert.equal(multiples.evEbit,null);
assert.equal(multiples.pe,10);

// 5) Return windows must not label a short history as a full 1Y/3Y return.
const prices=[
  {date:'2026-07-01',close:100},
  {date:'2026-08-01',close:110},
  {date:'2026-09-01',close:120},
];
const perf=Core.jukaPerformanceWindows(prices);
assert.equal(perf.year.pct,null);
assert.equal(perf.threeYears.pct,null);
assert.ok(Number.isFinite(perf.month.pct));

// 6) Period filters are date-based, not "N rows = N months".
const daily=Array.from({length:900},(_,i)=>{const d=new Date('2024-01-01T00:00:00Z');d.setUTCDate(d.getUTCDate()+i);return {date:d.toISOString().slice(0,10),close:100+i};});
const oneYear=Core.filterPeriod(daily,'1Y');
assert.ok(oneYear.length>=365 && oneYear.length<=367, `unexpected 1Y length ${oneYear.length}`);

// 7) Triangulation must preserve unavailable cross-checks as null, never as 0.
const tri=Core.jukaFairValueTriangulation({valuePerShare:100},null,{valuePerShare:null},null);
assert.equal(tri.values.economicDcf,null);
assert.equal(tri.values.earningsPower,null);
assert.equal(tri.values.legacyDcf,null);

// 8) Plausibility audit must not manufacture terminal-spread warnings from null values.
const plaus=Core.jukaFairValuePlausibilityAudit({valuation:{},checks:{},triangulation:{},adaptive:{assumptions:{}},stability:{}},[]);
assert.equal(plaus.flags.some(x=>x.code==='terminal-spread'),false);

console.log('System regression tests: OK');
