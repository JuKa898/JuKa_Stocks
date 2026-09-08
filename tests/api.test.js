const assert=require('assert'); const path=require('path');
function mockRes(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(v){this.body=v;return this}}}
(async()=>{
  delete process.env.TWELVE_DATA_API_KEY; const market=require('../api/market.js'); let res=mockRes(); await market({query:{}},res); assert.strictEqual(res.statusCode,503); assert.strictEqual(res.body.code,'NO_MARKET_KEY');
  process.env.TWELVE_DATA_API_KEY='x'; global.fetch=async(url)=>({ok:true,status:200,json:async()=>({status:'ok',meta:{symbol:'AAPL'},values:[{datetime:'2026-09-07',close:'100'}]})}); res=mockRes(); await market({query:{action:'time_series',symbol:'AAPL'}},res); assert.strictEqual(res.statusCode,200); assert.strictEqual(res.body.meta.symbol,'AAPL');
  console.log('api.test.js: OK');
})().catch(e=>{console.error(e);process.exit(1)});
