const fs=require('fs'),path=require('path'),vm=require('vm');
const Core=require('../core'),Symbols=require('../lib/symbols');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const m=html.match(/const stocks=\[(.*?)\n\];/s);
if(!m)throw new Error('stocks array not found in index.html');
const stocks=vm.runInNewContext('(['+m[1]+'])');
const rows=stocks.map(s=>{
  const model=Core.classifyValuationModel(s),r=Symbols.resolveSymbol(s);
  return {symbol:s.s,name:s.n,region:s.region,country:s.country,currency:s.currency,marketSymbol:r.marketSymbol,
    fundamentalsProvider:r.fundamentalsProvider,fundamentalsSymbol:r.region==='US'?r.secSymbol:r.alphaVantageSymbol,
    model,exchange:r.exchangeHint||s.m,providerMapped:r.region==='US'?!!r.secSymbol:!!r.alphaVantageSymbol};
});
const count=(fn)=>rows.filter(fn).length;
const report={
  generatedAt:new Date().toISOString(),
  total:rows.length,
  regions:{US:count(x=>x.region==='US'),EU:count(x=>x.region==='EU')},
  models:{
    operatingCompany:count(x=>x.model==='operating-company'),
    bankInsurance:count(x=>x.model==='bank-insurance'),
    reit:count(x=>x.model==='reit')
  },
  providerMapping:{mapped:count(x=>x.providerMapped),unmapped:count(x=>!x.providerMapped)},
  unmapped:rows.filter(x=>!x.providerMapped),
  rows
};
const dir=path.join(root,'reports');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'universe-coverage.json'),JSON.stringify(report,null,2));
let md=`# JuKa Stocks Universe Coverage — MVP 2.0\n\n`;
md+=`Gesamt: **${report.total}** Titel · US: **${report.regions.US}** · EU: **${report.regions.EU}**\n\n`;
md+=`Modelle: Operating Company **${report.models.operatingCompany}** · Bank/Insurance **${report.models.bankInsurance}** · REIT **${report.models.reit}**\n\n`;
md+=`Provider-Symbol-Mapping: **${report.providerMapping.mapped}/${report.total}** syntaktisch gemappt. `;
md+=`Das ist ein Routing-/Formatcheck, kein Live-Verfügbarkeitstest beim externen Provider.\n\n`;
if(report.unmapped.length)md+=`## Noch nicht gemappt\n\n${report.unmapped.map(x=>`- ${x.symbol} — ${x.marketSymbol}`).join('\n')}\n\n`;
md+=`## Bewertungslogik\n\n- Operating Company: 10J-FCFF-DCF; benötigt Umsatz, EBIT, D&A, CapEx und Aktienzahl.\n- Bank/Insurance: Residual Income / justified P/B; benötigt Eigenkapital, Aktienzahl und Nettogewinn.\n- REIT: AFFO + Exit-Multiple; benötigt AFFO und Aktienzahl. SEC/Alpha-Vantage liefern AFFO nicht standardisiert, daher bleibt ein REIT ohne AFFO bewusst nicht bewertungsbereit.\n`;
fs.writeFileSync(path.join(dir,'universe-coverage.md'),md);
console.log(`coverage-report: ${report.total} titles, ${report.providerMapping.mapped} mapped, ${report.providerMapping.unmapped} unmapped`);
