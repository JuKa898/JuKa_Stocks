const assert=require('assert'),fs=require('fs'),path=require('path');
const h=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
for(const id of ['investmentSummary','summaryFair','summaryValuation','summaryQuality','summaryReturn','summaryRisk','summaryModel','valuationSection','qualitySection','fundamentalsSection','businessSection'])assert.ok(h.includes(`id="${id}"`),id);
for(const href of ['#valuationSection','#qualitySection','#fundamentalsSection','#businessSection','#motorAuditDetails','#historyDetails'])assert.ok(h.includes(`href="${href}"`),href);
assert.ok(h.includes('syncInvestmentSummary'));assert.ok(h.includes('MutationObserver'));
assert.ok(!h.includes('<details id="motorAuditDetails" open>'));
assert.ok(!h.includes('<details id="profileDetails" open>'));
console.log('product-layout.test.js: OK');
