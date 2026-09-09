const assert=require('assert');const C=require('../core');
let r=C.jukaRiskAudit({model:'operating-company',price:140,valuation:{base:100},quality:{score:40},readiness:{ready:true,missingRequired:[]},dataQuality:{score:40},reverse:{impliedGrowthAdjustment:.08,waccGap:-.03}});
assert.equal(r.severity,'hoch');assert.ok(r.issues.length>=5);
r=C.jukaRiskAudit({model:'operating-company',price:70,valuation:{base:100},quality:{score:80},readiness:{ready:true,missingRequired:[]},dataQuality:{score:90}});
assert.equal(r.severity,'niedrig');assert.ok(r.positives.length>=3);
console.log('risk-audit.test.js: OK');
