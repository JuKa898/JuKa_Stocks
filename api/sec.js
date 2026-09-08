const tickerCache={time:0,map:null};
async function tickerMap(){
  if(tickerCache.map && Date.now()-tickerCache.time<86400000)return tickerCache.map;
  const r=await fetch('https://www.sec.gov/files/company_tickers.json',{headers:{'User-Agent':process.env.SEC_USER_AGENT||'JuKa Stocks research app contact@example.com','Accept-Encoding':'gzip, deflate'}});
  if(!r.ok)throw new Error('SEC ticker map '+r.status); const j=await r.json(); const map={}; Object.values(j).forEach(x=>map[String(x.ticker).toUpperCase()]={cik:String(x.cik_str).padStart(10,'0'),name:x.title});tickerCache.map=map;tickerCache.time=Date.now();return map;
}
function units(facts,tag,unit){return facts?.['us-gaap']?.[tag]?.units?.[unit]||[]}
function annualRows(items){
  const priority={"10-K":3,"10-K/A":2,"20-F":1}; const by={};
  for(const x of items||[]){if(!x.fy||!priority[x.form])continue; const k=String(x.fy); if(!by[k]||String(x.filed)>String(by[k].filed))by[k]=x;}
  return Object.values(by).sort((a,b)=>String(a.end).localeCompare(String(b.end)));
}
function closest(rows,fy){return rows.find(x=>String(x.fy)===String(fy))||null}
module.exports = async function handler(req,res){
  try{
    const symbol=String(req.query?.symbol||'META').toUpperCase().replace('.','-'); const map=await tickerMap(); const found=map[symbol]; if(!found)return res.status(404).json({error:'Ticker nicht in SEC gefunden',code:'SEC_NOT_FOUND'});
    const r=await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${found.cik}.json`,{headers:{'User-Agent':process.env.SEC_USER_AGENT||'JuKa Stocks research app contact@example.com','Accept-Encoding':'gzip, deflate'}}); if(!r.ok)return res.status(r.status).json({error:'SEC companyfacts Fehler '+r.status});
    const j=await r.json(),f=j.facts||{};
    const rev=annualRows(units(f,'RevenueFromContractWithCustomerExcludingAssessedTax','USD').concat(units(f,'Revenues','USD')));
    const op=annualRows(units(f,'OperatingIncomeLoss','USD')); const ni=annualRows(units(f,'NetIncomeLoss','USD')); const eps=annualRows(units(f,'EarningsPerShareDiluted','USD/shares'));
    const cfo=annualRows(units(f,'NetCashProvidedByUsedInOperatingActivities','USD')); const capex=annualRows(units(f,'PaymentsToAcquirePropertyPlantAndEquipment','USD')); const cash=annualRows(units(f,'CashAndCashEquivalentsAtCarryingValue','USD'));
    const debtCur=annualRows(units(f,'LongTermDebtCurrent','USD').concat(units(f,'LongTermDebtAndFinanceLeaseObligationsCurrent','USD'))); const debtNon=annualRows(units(f,'LongTermDebtNoncurrent','USD')); const shares=annualRows(units(f,'WeightedAverageNumberOfDilutedSharesOutstanding','shares').concat(units(f,'CommonStockSharesOutstanding','shares')));
    const fys=[...new Set(rev.map(x=>x.fy))].sort((a,b)=>a-b); const annual=fys.map((fy,i)=>{const R=closest(rev,fy),O=closest(op,fy),N=closest(ni,fy),E=closest(eps,fy),C=closest(cfo,fy),X=closest(capex,fy),Ca=closest(cash,fy),Dc=closest(debtCur,fy),Dn=closest(debtNon,fy),S=closest(shares,fy); const revenue=R?.val??null, oper=O?.val??null, fcf=(C&&X)?C.val-X.val:null; const r3=i>=3&&rev[i-3]?.val>0?Math.pow(revenue/rev[i-3].val,1/3)-1:null;return {fy,date:R?.end||O?.end||N?.end,revenue,operatingIncome:oper,netIncome:N?.val??null,eps:E?.val??null,cfo:C?.val??null,capex:X?.val??null,fcf,cash:Ca?.val??0,debt:(Dc?.val??0)+(Dn?.val??0),netCash:(Ca?.val??0)-((Dc?.val??0)+(Dn?.val??0)),shares:S?.val??null,operatingMargin:(revenue&&oper!=null)?oper/revenue:null,fcfMargin:(revenue&&fcf!=null)?fcf/revenue:null,revenueCagr3y:r3};}).filter(x=>x.date);
    res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400'); return res.status(200).json({symbol,name:j.entityName||found.name,cik:found.cik,annual,source:'SEC companyfacts'});
  }catch(e){return res.status(500).json({error:e.message,code:'SEC_PROXY_ERROR'});}
}
