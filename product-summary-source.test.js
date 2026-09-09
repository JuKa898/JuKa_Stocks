const assert=require('assert'),fs=require('fs'),path=require('path');
const h=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
for(const source of ["get('fvMetric')","get('valuationMetric')","get('qualityScore')","get('scenarioBaseReturn')","get('motorRisk')","get('motorModel')","get('motorReady')"])assert.ok(h.includes(source),source);
console.log('product-summary-source.test.js: OK');
