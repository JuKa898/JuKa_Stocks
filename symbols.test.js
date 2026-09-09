const assert=require('assert'); const S=require('../lib/symbols');
let x=S.resolveSymbol({symbol:'BRK.B',region:'US'}); assert.equal(x.secSymbol,'BRK-B'); assert.equal(x.marketSymbol,'BRK.B'); assert.equal(x.region,'US');
x=S.resolveSymbol({symbol:'SAP',market_symbol:'SAP:XETR'}); assert.equal(x.region,'EU'); assert.equal(x.marketSymbol,'SAP:XETR'); assert.equal(x.fundamentalsProvider,'ALPHA_VANTAGE'); assert.equal(x.exchangeHint,'Xetra'); assert.equal(x.alphaVantageSymbol,'SAP.DEX');
x=S.resolveSymbol({symbol:'AZN',market_symbol:'AZN:LSE'}); assert.equal(x.alphaVantageSymbol,'AZN.LON');
console.log('symbols.test.js: OK');
