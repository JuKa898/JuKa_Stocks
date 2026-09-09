const assert=require('assert'); const C=require('../core.js');
const us=C.dataRoute({region:'US',currency:'USD'}); assert.strictEqual(us.fundamentals,'sec'); assert.strictEqual(us.market,'twelve-data');
const eu=C.dataRoute({region:'EU',currency:'EUR'}); assert.strictEqual(eu.fundamentals,'eu-adapter'); assert.strictEqual(eu.currency,'EUR');
const ch=C.dataRoute({region:'EU',currency:'CHF'}); assert.strictEqual(ch.currency,'CHF');
console.log('routing.test.js: OK');
