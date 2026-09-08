const assert=require('assert');
function mockRes(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(v){this.body=v;return this}}}
const fact=(val,fy,end,unit='USD')=>({val,fy,end,filed:end,form:'10-K',unit});
(async()=>{
  let calls=0;
  global.fetch=async url=>{
    calls++;
    if(String(url).includes('company_tickers.json')) return {ok:true,status:200,json:async()=>({0:{ticker:'TEST',cik_str:123,name:'Test Corp',title:'Test Corp'}})};
    return {ok:true,status:200,json:async()=>({entityName:'Test Corp',facts:{'us-gaap':{
      RevenueFromContractWithCustomerExcludingAssessedTax:{units:{USD:[fact(1000,2023,'2023-12-31'),fact(1200,2024,'2024-12-31')]}},
      OperatingIncomeLoss:{units:{USD:[fact(200,2024,'2024-12-31')]}},
      NetIncomeLoss:{units:{USD:[fact(150,2024,'2024-12-31')]}},
      EarningsPerShareDiluted:{units:{'USD/shares':[fact(3,2024,'2024-12-31','USD/shares')]}},
      NetCashProvidedByUsedInOperatingActivities:{units:{USD:[fact(250,2024,'2024-12-31')]}},
      PaymentsToAcquirePropertyPlantAndEquipment:{units:{USD:[fact(50,2024,'2024-12-31')]}},
      CashAndCashEquivalentsAtCarryingValue:{units:{USD:[fact(400,2024,'2024-12-31')]}},
      LongTermDebtCurrent:{units:{USD:[fact(50,2024,'2024-12-31')]}},
      LongTermDebtNoncurrent:{units:{USD:[fact(100,2024,'2024-12-31')]}},
      WeightedAverageNumberOfDilutedSharesOutstanding:{units:{shares:[fact(50,2024,'2024-12-31','shares')]}}
    }}})};
  };
  const sec=require('../api/sec.js'); const res=mockRes(); await sec({query:{symbol:'TEST'}},res);
  assert.strictEqual(res.statusCode,200); assert.strictEqual(res.body.name,'Test Corp');
  const y=res.body.annual.find(x=>x.fy===2024); assert.ok(y); assert.strictEqual(y.fcf,200); assert.strictEqual(y.netCash,250); assert.strictEqual(y.shares,50); assert.strictEqual(y.operatingMargin,200/1200);
  console.log('sec.test.js: OK');
})().catch(e=>{console.error(e);process.exit(1)});
