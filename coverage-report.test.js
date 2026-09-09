const assert=require('assert'),fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=path.join(__dirname,'..'),r=spawnSync(process.execPath,[path.join(root,'scripts','coverage-report.js')],{cwd:root,encoding:'utf8'});
assert.equal(r.status,0,r.stderr);const j=JSON.parse(fs.readFileSync(path.join(root,'reports','universe-coverage.json'),'utf8'));
assert.ok(j.total>=40);assert.ok(j.regions.US>0&&j.regions.EU>0);assert.ok(j.models.bankInsurance>=4);assert.ok(j.models.reit>=2);assert.equal(j.providerMapping.unmapped,0);
console.log('coverage-report.test.js: OK');
