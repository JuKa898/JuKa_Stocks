const assert=require('assert');const C=require('../core');
const op=C.jukaPeerComparison({pe:15,evEbit:12,pFcf:18},[
 {symbol:'A',pe:20,evEbit:15,pFcf:22},{symbol:'B',pe:22,evEbit:16,pFcf:24},{symbol:'C',pe:18,evEbit:14,pFcf:20}
],'operating-company');
assert.equal(op.available,3);assert.equal(op.medians.pe,20);assert.ok(op.score>0);assert.ok(op.label.includes('günstiger'));
const bank=C.jukaPeerComparison({pe:11,pb:1.2},[{pe:12,pb:1.5},{pe:14,pb:1.7}],'bank-insurance');assert.equal(bank.available,2);
const reit=C.jukaPeerComparison({paFFO:14},[{paFFO:18},{paFFO:20}],'reit');assert.ok(reit.score>0);
const mult=C.valuationMultiplesFromSnapshot({price:50,latest:{shares:10,debt:100,cash:20,eps:5,operatingIncome:40,fcf:25,equity:250,affo:30}});
assert.equal(mult.pe,10);assert.equal(mult.pb,2);assert.equal(mult.pFcf,20);assert.equal(mult.evEbit,14.5);
console.log('peer.test.js: OK');