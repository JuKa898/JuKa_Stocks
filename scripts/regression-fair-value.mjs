import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const core=require('../core.js');
const pipeline=require('../lib/pipeline.js');

const raw={annual:[{date:'2025-12-31',revenue:1000,operatingIncome:200,netIncome:120,fcf:100,shares:100,cash:100,debt:500,equity:600,capex:50,da:null,sbc:null,cfo:null}]};
const normalized=pipeline.normalizeFundamentals(raw,{s:'TEST'});
assert.equal(normalized.annual[0].da,null,'Pipeline must preserve missing D&A as null');
assert.equal(normalized.annual[0].sbc,null,'Pipeline must preserve missing SBC as null');
const derived=core.deriveFundamentals(normalized.annual);
assert.equal(derived[0].ebitda,null,'Missing D&A must not silently become zero in EBITDA');
assert.equal(derived[0].sbcToRevenue,null,'Missing SBC must not look like 0% SBC/revenue');
assert.equal(derived[0].netDebt,400,'Net debt must use reported debt minus cash');

const rows=[
  {date:'2022-12-31',revenue:800,operatingIncome:120,netIncome:80,fcf:90,cfo:130,capex:40,da:35,cash:80,debt:420,equity:500,shares:100,deltaNwc:5,pretaxIncome:100,incomeTax:21},
  {date:'2023-12-31',revenue:880,operatingIncome:140,netIncome:90,fcf:100,cfo:145,capex:45,da:40,cash:90,debt:430,equity:540,shares:100,deltaNwc:6,pretaxIncome:115,incomeTax:24},
  {date:'2024-12-31',revenue:970,operatingIncome:160,netIncome:105,fcf:115,cfo:165,capex:50,da:45,cash:100,debt:450,equity:590,shares:100,deltaNwc:7,pretaxIncome:135,incomeTax:28},
  {date:'2025-12-31',revenue:1070,operatingIncome:180,netIncome:120,fcf:130,cfo:null,capex:55,da:50,cash:110,debt:470,equity:640,shares:100,deltaNwc:8,pretaxIncome:150,incomeTax:31}
];
const inp=core.dcfInputFromAnnual(rows,rows.length-1,{wacc:.09,terminalGrowth:.025,terminalRoic:.13,growthY1:.07,growthY5:.04,targetEbitMarginY5:.18});
assert.equal(inp.netDebt,360,'DCF input must expose netDebt');
assert.equal(inp.netFinancialPosition,360,'Legacy netFinancialPosition alias must stay consistent');

const adaptive={assumptions:{wacc:.09,terminalGrowth:.025,terminalRoic:.13,growthY1:.07,growthY5:.04,targetEbitMarginY5:.18},metrics:{roicMedian:.14},dataQuality:{score:80}};
const economic=core.jukaEconomicDcf({...inp,annualFacts:core.deriveFundamentals(rows)},adaptive);
assert.ok(economic,'Economic DCF should calculate');
assert.ok(Math.abs((economic.enterprise-economic.equity)-360)<1e-8,'Economic DCF equity bridge must deduct net debt');

const primary=core.jukaSimpleIntrinsicOperating(rows,adaptive,'base');
assert.ok(primary,'Primary owner-earnings valuation should calculate');
assert.ok(Math.abs((primary.enterprise-primary.equity)-360)<1e-8,'Primary fair value must deduct net debt');
assert.equal(primary.cashConversion,null,'Missing CFO must not be converted into a false zero cash-conversion ratio');

const audit=core.jukaSimpleIntrinsicAudit(rows,adaptive,primary);
assert.equal(audit.auditedMethod,primary.method,'Stability audit must rerun the same primary valuation method');
assert.ok(Number.isFinite(audit.deltas.waccPlus1),'Primary-method WACC sensitivity must be available');
assert.ok(Number.isFinite(audit.deltas.growthY5Plus2),'Primary-method growth sensitivity must be available');
console.log('Fair-value regression tests: OK');

// Fair Value 8.2: mature ROIC may fall below WACC; perpetuity must not receive a free moat.
const mature=core.jukaMatureTerminalPolicy({assumptions:{wacc:.10,terminalGrowth:.02,terminalRoic:.07},metrics:{roicStability:.4}});
assert.ok(mature.terminalRoic<.10,'Mature terminal ROIC must be allowed below WACC');
assert.ok(mature.terminalRoic>.02,'Terminal ROIC must still support perpetual growth mathematically');

const fv82=core.jukaFairValue2Operating({s:'TEST'},rows,15,{});
assert.equal(fv82.version,'JUKA Fair Value 8.2');
assert.equal(fv82.framework.primary,'buffett-owner-earnings');
assert.ok(fv82.framework.marginOfSafety>=.15&&fv82.framework.marginOfSafety<=.40,'Margin of safety must stay conservative and bounded');
assert.ok(fv82.framework.buyBelow<fv82.valuation.base,'Buy-below price must be below intrinsic value');
