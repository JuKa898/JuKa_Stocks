const assert=require('assert'); const EU=require('../lib/eu-fundamentals');
(async()=>{
 EU.clearCache();
 const stock={s:'SAP',n:'SAP SE',region:'EU',marketSymbol:'SAP:XETR'};
 delete process.env.ALPHA_VANTAGE_API_KEY;
 let p=await EU.alphaVantageFundamentals(stock);
 assert.equal(p.status,'pending'); assert.equal(p.providerCode,'NO_ALPHA_VANTAGE_KEY'); assert.equal(p.resolvedSymbol,'SAP.DEX');

 process.env.ALPHA_VANTAGE_API_KEY='x'; let calls=0;
 global.fetch=async url=>{
   calls++; const u=new URL(String(url)),fn=u.searchParams.get('function'),base={fiscalDateEnding:'2025-12-31'};
   if(fn==='INCOME_STATEMENT')return {ok:true,status:200,json:async()=>({symbol:'SAP.DEX',annualReports:[{...base,totalRevenue:'1000',operatingIncome:'250',netIncome:'180',interestExpense:'10',incomeBeforeTax:'220',incomeTaxExpense:'40'}]})};
   if(fn==='BALANCE_SHEET')return {ok:true,status:200,json:async()=>({annualReports:[{...base,cashAndCashEquivalentsAtCarryingValue:'200',shortLongTermDebtTotal:'50',commonStockSharesOutstanding:'100',totalShareholderEquity:'500'}]})};
   if(fn==='CASH_FLOW')return {ok:true,status:200,json:async()=>({annualReports:[{...base,operatingCashflow:'210',capitalExpenditures:'-60',depreciationDepletionAndAmortization:'30'}]})};
   throw new Error('unexpected');
 };
 const out=await EU.alphaVantageFundamentals(stock);
 assert.equal(out.status,'ok'); assert.equal(out.annual.length,1); assert.equal(out.annual[0].revenue,1000);
 assert.equal(out.annual[0].fcf,150); assert.equal(out.annual[0].eps,1.8); assert.equal(out.annual[0].debt,50); assert.equal(calls,3);
 const out2=await EU.alphaVantageFundamentals(stock); assert.equal(calls,3); assert.equal(out2.annual[0].fcf,150);
 console.log('eu-fundamentals.test.js: OK');
})().catch(e=>{console.error(e);process.exit(1)});
