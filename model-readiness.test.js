const assert=require('assert');const C=require('../core');
let r=C.jukaModelReadiness('operating-company',{revenue:100,operatingIncome:20,da:5,capex:8,shares:10,cash:4,debt:2,pretaxIncome:18,incomeTax:4,fcf:12},[{date:'2025'}]);
assert.ok(r.ready);assert.equal(r.missingRequired.length,0);
r=C.jukaModelReadiness('bank-insurance',{equity:100,shares:10,netIncome:12,eps:1.2},[{date:'2025'}]);assert.ok(r.ready);
r=C.jukaModelReadiness('bank-insurance',{equity:100,netIncome:12},[{date:'2025'}]);assert.ok(!r.ready);assert.ok(r.missingRequired.includes('shares'));
r=C.jukaModelReadiness('reit',{shares:10,affo:null},[{date:'2025'}]);assert.ok(!r.ready);assert.ok(r.missingRequired.includes('affo'));
assert.deepEqual(C.modelDataRequirements('reit').required,['affo','shares']);
console.log('model-readiness.test.js: OK');
