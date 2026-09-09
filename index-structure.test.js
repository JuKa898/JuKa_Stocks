const assert=require('assert'),fs=require('fs');const s=fs.readFileSync('index.html','utf8');
for(const token of ['id="peerDetails"','function renderPeerComparison','/api/analysis?','function updateFromSnapshot','MVP 1.4'])assert.ok(s.includes(token),token);
const prep=s.slice(s.indexOf('function prepareStock'),s.indexOf('const q=document.getElementById'));
assert.ok(!prep.includes('last.price'),'prepareStock darf keine alte last-Variable benutzen');
assert.ok(!prep.includes('price:last'),'prepareStock darf keine alte Kursvariable benutzen');
console.log('index-structure.test.js: OK');