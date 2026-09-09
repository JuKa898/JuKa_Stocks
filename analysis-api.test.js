const assert=require('assert');
function res(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(v){this.body=v;return this}}}
(async()=>{
 const oldTD=process.env.TWELVE_DATA_API_KEY,oldAV=process.env.ALPHA_VANTAGE_API_KEY;
 delete process.env.TWELVE_DATA_API_KEY; delete require.cache[require.resolve('../api/analysis')];
 let handler=require('../api/analysis'),r=res();
 await handler({query:{symbol:'META',region:'US',currency:'USD'}},r);
 assert.equal(r.statusCode,503); assert.equal(r.body.code,'NO_MARKET_KEY');

 process.env.TWELVE_DATA_API_KEY='x'; delete process.env.ALPHA_VANTAGE_API_KEY;
 global.fetch=async url=>{
   const s=String(url);
   if(s.includes('time_series'))return {ok:true,status:200,json:async()=>({meta:{symbol:'SAP:XETR',currency:'EUR',exchange:'Xetra'},values:[{datetime:'2025-01-02',close:'195'},{datetime:'2026-01-02',close:'200'}]})};
   throw new Error('unexpected '+s);
 };
 delete require.cache[require.resolve('../api/analysis')]; handler=require('../api/analysis'); r=res();
 await handler({query:{symbol:'SAP',region:'EU',currency:'EUR',market_symbol:'SAP:XETR',sector:'Software'}},r);
 assert.equal(r.statusCode,200); assert.equal(r.body.analysisStatus,'market-only');
 assert.equal(r.body.symbolResolution.alphaVantageSymbol,'SAP.DEX');
 assert.equal(r.body.fundamentals.providerCode,'NO_ALPHA_VANTAGE_KEY');

 process.env.ALPHA_VANTAGE_API_KEY='y';
 const av=fn=>{
   const base={fiscalDateEnding:'2025-12-31'};
   if(fn==='INCOME_STATEMENT')return {symbol:'SAP.DEX',annualReports:[{...base,totalRevenue:'1000',operatingIncome:'250',netIncome:'180',interestExpense:'10',incomeBeforeTax:'220',incomeTaxExpense:'40'}]};
   if(fn==='BALANCE_SHEET')return {annualReports:[{...base,cashAndCashEquivalentsAtCarryingValue:'200',shortLongTermDebtTotal:'50',commonStockSharesOutstanding:'100',totalShareholderEquity:'500'}]};
   if(fn==='CASH_FLOW')return {annualReports:[{...base,operatingCashflow:'210',capitalExpenditures:'-60',depreciationDepletionAndAmortization:'30'}]};
 };
 global.fetch=async url=>{
   const s=String(url);
   if(s.includes('time_series'))return {ok:true,status:200,json:async()=>({meta:{symbol:'SAP:XETR',currency:'EUR',exchange:'Xetra'},values:[{datetime:'2026-01-02',close:'200'}]})};
   if(s.includes('alphavantage.co')){const u=new URL(s);return {ok:true,status:200,json:async()=>av(u.searchParams.get('function'))};}
   throw new Error('unexpected '+s);
 };
 delete require.cache[require.resolve('../api/analysis')]; delete require.cache[require.resolve('../lib/eu-fundamentals')];
 handler=require('../api/analysis'); r=res();
 await handler({query:{symbol:'SAP2',name:'SAP SE',region:'EU',currency:'EUR',market_symbol:'SAP:XETR',sector:'Software'}},r);
 assert.equal(r.statusCode,200); assert.equal(r.body.analysisStatus,'complete');
 assert.equal(r.body.fundamentals.providerCode,'ALPHA_VANTAGE'); assert.equal(r.body.latest.revenue,1000);

 if(oldTD)process.env.TWELVE_DATA_API_KEY=oldTD; else delete process.env.TWELVE_DATA_API_KEY;
 if(oldAV)process.env.ALPHA_VANTAGE_API_KEY=oldAV; else delete process.env.ALPHA_VANTAGE_API_KEY;
 console.log('analysis-api.test.js: OK');
})().catch(e=>{console.error(e);process.exit(1)});
