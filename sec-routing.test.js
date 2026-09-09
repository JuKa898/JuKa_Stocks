const assert=require('assert');
function res(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(v){this.body=v;return this}}}
(async()=>{
 const sec=require('../api/sec.js'); let r=res();
 await sec({query:{symbol:'SAP',region:'EU',market_symbol:'SAP:XETR',name:'SAP SE'}},r);
 assert.equal(r.statusCode,200); assert.equal(r.body.status,'pending'); assert.equal(r.body.providerCode,'EU_FUNDAMENTALS_PENDING');
 console.log('sec-routing.test.js: OK');
})().catch(e=>{console.error(e);process.exit(1)});
