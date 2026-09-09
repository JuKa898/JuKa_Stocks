const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const files=fs.readdirSync(__dirname).filter(x=>x.endsWith('.test.js')).sort();
for(const f of files){
  const r=spawnSync(process.execPath,[path.join(__dirname,f)],{stdio:'inherit',cwd:path.join(__dirname,'..'),env:process.env});
  if(r.status!==0)process.exit(r.status||1);
}
console.log(`run-all.js: ${files.length} test files OK`);
