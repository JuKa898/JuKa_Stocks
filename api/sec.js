function fetchWithTimeout(url,options={},ms=12000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));
}
const Symbols=require('../lib/symbols');
const EU=require('../lib/eu-fundamentals');
const tickerCache={time:0,map:null};
const UA=()=>process.env.SEC_USER_AGENT||'JUKA research app contact@example.com';
async function tickerMap(){
  if(tickerCache.map&&Date.now()-tickerCache.time<86400000)return tickerCache.map;
  const r=await fetchWithTimeout('https://www.sec.gov/files/company_tickers.json',{headers:{'User-Agent':UA(),'Accept-Encoding':'gzip, deflate'}});
  if(!r.ok)throw new Error('SEC ticker map '+r.status); const j=await r.json(),map={};
  Object.values(j).forEach(x=>map[String(x.ticker).toUpperCase()]={cik:String(x.cik_str).padStart(10,'0'),name:x.title}); tickerCache.map=map;tickerCache.time=Date.now();return map;
}
function units(facts,tag,unit){return facts?.['us-gaap']?.[tag]?.units?.[unit]||[]}
function annualRows(items){
  const priority={'10-K':4,'10-K/A':3,'20-F':2,'20-F/A':1},by={};
  for(const x of items||[]){
    if(!x.end||!priority[x.form])continue;
    if(x.start){
      const days=(Date.parse(x.end)-Date.parse(x.start))/86400000;
      if(!Number.isFinite(days)||days<300||days>430)continue;
    }
    const k=String(x.end), endYear=Number(k.slice(0,4)), fy=Number(x.fy);
    const distance=Number.isFinite(fy)?Math.abs(fy-endYear):99;
    const cur=by[k];
    const curFy=cur?Number(cur.fy):NaN, curDistance=cur&&Number.isFinite(curFy)?Math.abs(curFy-endYear):99;
    const better=!cur
      || distance<curDistance
      || (distance===curDistance&&String(x.filed)<String(cur.filed))
      || (distance===curDistance&&String(x.filed)===String(cur.filed)&&priority[x.form]>priority[cur.form]);
    if(better)by[k]=x;
  }
  return Object.values(by).sort((a,b)=>String(a.end).localeCompare(String(b.end)));
}
function candidates(facts,tags,unit){
  const maps=tags.map(tag=>annualRows(units(facts,tag,unit)));
  const dates=[...new Set(maps.flat().map(x=>x.end).filter(Boolean))].sort(),out=[];
  for(const date of dates){
    const choices=maps.flatMap(rows=>rows.filter(r=>String(r.end)===String(date)));
    if(!choices.length)continue;
    choices.sort((a,b)=>String(a.filed).localeCompare(String(b.filed)));
    out.push(choices[0]);
  }
  return out;
}
function closest(rows,date){return rows.find(x=>String(x.end)===String(date))||null}
module.exports=async function handler(req,res){
  try{
    const resolved=Symbols.resolveSymbol({symbol:req.query?.symbol||'META',region:req.query?.region||'US',market_symbol:req.query?.market_symbol});
    if(resolved.region!=='US'){
      const stock={s:resolved.displaySymbol,n:req.query?.name||undefined,region:'EU',marketSymbol:req.query?.market_symbol||req.query?.symbol};
      const out=await EU.alphaVantageFundamentals(stock,{includeHistoryMetadata:String(req.query?.history||'')==='1'});
      res.setHeader('Cache-Control','s-maxage=86400, stale-while-revalidate=172800');
      return res.status(200).json(out);
    }
    const symbol=resolved.secSymbol,map=await tickerMap(),found=map[symbol]; if(!found)return res.status(404).json({error:'Ticker nicht in SEC gefunden',code:'SEC_NOT_FOUND'});
    const r=await fetchWithTimeout(`https://data.sec.gov/api/xbrl/companyfacts/CIK${found.cik}.json`,{headers:{'User-Agent':UA(),'Accept-Encoding':'gzip, deflate'}}); if(!r.ok)return res.status(r.status).json({error:'SEC companyfacts Fehler '+r.status});
    const j=await r.json(),f=j.facts||{};
    const rev=candidates(f,['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet'],'USD');
    const op=candidates(f,['OperatingIncomeLoss'],'USD'),ni=candidates(f,['NetIncomeLoss','ProfitLoss'],'USD'),eps=candidates(f,['EarningsPerShareDiluted'],'USD/shares');
    const cfo=candidates(f,['NetCashProvidedByUsedInOperatingActivities'],'USD'),capex=candidates(f,['PaymentsToAcquirePropertyPlantAndEquipment','PaymentsForAdditionsToPropertyPlantAndEquipment'],'USD');
    const cash=candidates(f,['CashAndCashEquivalentsAtCarryingValue','CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'],'USD');
    const debtCur=candidates(f,['LongTermDebtCurrent','LongTermDebtAndFinanceLeaseObligationsCurrent','ShortTermBorrowings'],'USD'),debtNon=candidates(f,['LongTermDebtNoncurrent','LongTermDebtAndFinanceLeaseObligationsNoncurrent'],'USD');
    const shares=candidates(f,['WeightedAverageNumberOfDilutedSharesOutstanding','CommonStockSharesOutstanding'],'shares');
    const da=candidates(f,['DepreciationDepletionAndAmortization','DepreciationDepletionAndAmortizationPropertyPlantAndEquipment'],'USD');
    const sbc=candidates(f,['ShareBasedCompensation'],'USD'),rd=candidates(f,['ResearchAndDevelopmentExpense','ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost','ResearchAndDevelopmentExpenseSoftwareExcludingAcquiredInProcessCost'],'USD'),interest=candidates(f,['InterestExpenseNonOperating','InterestAndDebtExpense'],'USD');
    const pretax=candidates(f,['IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest','IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments'],'USD');
    const tax=candidates(f,['IncomeTaxExpenseBenefit'],'USD'),equity=candidates(f,['StockholdersEquity','StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],'USD');
    const ar=candidates(f,['AccountsReceivableNetCurrent','AccountsNotesAndLoansReceivableNetCurrent'],'USD'),inventory=candidates(f,['InventoryNet'],'USD'),ap=candidates(f,['AccountsPayableCurrent'],'USD');
    const periods=[...new Set([rev,op,ni,cfo].flat().map(x=>x.end).filter(Boolean))].sort(); let priorNwc=null;
    const annual=periods.map(date=>{
      const R=closest(rev,date),O=closest(op,date),N=closest(ni,date),E=closest(eps,date),C=closest(cfo,date),X=closest(capex,date),Ca=closest(cash,date),Dc=closest(debtCur,date),Dn=closest(debtNon,date),S=closest(shares,date),D=closest(da,date),Sb=closest(sbc,date),Rd=closest(rd,date),I=closest(interest,date),P=closest(pretax,date),T=closest(tax,date),Eq=closest(equity,date),Ar=closest(ar,date),Inv=closest(inventory,date),Ap=closest(ap,date);
      const revenue=R?.val??null,operatingIncome=O?.val??null,cfoVal=C?.val??null,capexVal=X?.val??null,fcf=(cfoVal!=null&&capexVal!=null)?cfoVal-capexVal:null,cashVal=Ca?.val??null;
      const debt=(Dc||Dn)?(Dc?.val??0)+(Dn?.val??0):null;
      const nwc=(Ar||Inv||Ap)?(Ar?.val??0)+(Inv?.val??0)-(Ap?.val??0):null,deltaNwc=(nwc!=null&&priorNwc!=null)?nwc-priorNwc:null; if(nwc!=null)priorNwc=nwc;
      const filed=[R,O,N,C,X].filter(Boolean).map(x=>x.filed).filter(Boolean).sort().at(-1)||R?.filed||O?.filed||N?.filed||null;
      const periodDate=R?.end||O?.end||N?.end||date;
      const fy=Number(String(periodDate).slice(0,4));
      return {fy,date:periodDate,filed,revenue,operatingIncome,netIncome:N?.val??null,eps:E?.val??null,cfo:cfoVal,capex:capexVal,fcf,cash:cashVal,debt,netCash:cashVal!=null&&debt!=null?cashVal-debt:null,shares:S?.val??null,da:D?.val??null,sbc:Sb?.val??null,rd:Rd?.val??null,researchAndDevelopment:Rd?.val??null,interestExpense:I?.val??null,pretaxIncome:P?.val??null,incomeTax:T?.val??null,equity:Eq?.val??null,nwc,deltaNwc};
    }).filter(x=>x.date);
    for(let i=0;i<annual.length;i++){const x=annual[i];x.operatingMargin=(x.revenue&&x.operatingIncome!=null)?x.operatingIncome/x.revenue:null;x.fcfMargin=(x.revenue&&x.fcf!=null)?x.fcf/x.revenue:null;const p=i>=3?annual[i-3]:null;x.revenueCagr3y=(p?.revenue>0&&x.revenue>0)?Math.pow(x.revenue/p.revenue,1/(i-(i-3)))-1:null;}
    res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400'); return res.status(200).json({symbol,name:j.entityName||found.name,cik:found.cik,annual,source:'SEC companyfacts',engine:'fundamentals-v2-annual-endpoint'});
  }catch(e){return res.status(500).json({error:e.message,code:'SEC_PROXY_ERROR'});}
};
