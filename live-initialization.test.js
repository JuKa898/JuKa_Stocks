const assert=require('assert'),fs=require('fs'),path=require('path');
const h=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
assert.ok(h.includes("let activeSymbol='META';"),'activeSymbol initialized');
assert.ok(h.includes("async function select(s){activeSymbol=s;"),'selection updates activeSymbol');
const summary=h.indexOf('installSummarySync();'), initial=h.indexOf("select('META');",summary);
assert.ok(summary>=0 && initial>summary,'initial META live load occurs after UI setup');
assert.strictEqual((h.match(/select\('META'\);/g)||[]).length,1,'single explicit initial live load');
console.log('live-initialization.test.js: OK');
