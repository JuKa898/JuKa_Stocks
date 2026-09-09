const assert=require('assert');
function res(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(v){this.body=v;return this}}}
(async()=>{
 delete process.env.ALPHA_VANTAGE_API_KEY;
 const h=require('../api/eu-fundamentals');let r=res();
 await h({query:{symbol:'SAP',market_symbol:'SAP:XETR'}},r);
 assert.equal(r.statusCode,200);assert.equal(r.body.providerCode,'NO_ALPHA_VANTAGE_KEY');assert.equal(r.body.symbolResolution.alphaVantageSymbol,'SAP.DEX');
 console.log('eu-api.test.js: OK');
})().catch(e=>{console.error(e);process.exit(1)});
