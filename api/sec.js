const Symbols=require('../lib/symbols');
const tickerCache={time:0,map:null};
const UA=()=>process.env.SEC_USER_AGENT||'JuKa Stocks research app contact@example.com';
async function tickerMap(){
  if(tickerCache.map&&Date.now()-tickerCache.time<86400000)return tickerCache.map;
  const r=await fetch('https://www.sec.gov/files/company_tickers.json',{headers:{'User-Agent':UA(),'Accept-Encoding':'gzip, deflate'}});
  if(!r.ok)throw new Error('SEC ticker map '+r.status); const j=await r.json(),map={};
  Object.values(j).forEach(x=>map[String(x.ticker).toUpperCase()]={cik:String(x.cik_str).padStart(10,'0'),name:x.title}); tickerCache.map=map;tickerCache.time=Date.now();return map;
}
function units(facts,tag,unit){return facts?.['us-gaap']?.[tag]?.units?.[unit]||[]}
function annualRows(items){
  const priority={'10-K':4,'10-K/A':3,'20-F':2,'20-F/A':1},by={};
  for(const x of items||[]){if(x.fy==null||!priority[x.form])continue;const k=String(x.fy),cur=by[k];if(!cur||priority[x.form]>priority[cur.form]||(priority[x.form]===priority[cur.form]&&String(x.filed)>String(cur.filed)))by[k]=x;}
  return Object.values(by).sort((a,b)=>Number(a.fy)-Number(b.fy));
}
function candidates(facts,tags,unit){
  const maps=tags.map(tag=>annualRows(units(facts,tag,unit))); const fys=[...new Set(maps.flat().map(x=>x.fy))].sort((a,b)=>a-b),out=[];
  for(const fy of fys){for(const rows of maps){const x=rows.find(r=>String(r.fy)===String(fy));if(x){out.push(x);break;}}} return out;
}
function closest(rows,fy){return rows.find(x=>String(x.fy)===String(fy))||null}
module.exports=async function handler(req,res){
  try{
    const resolved=Symbols.resolveSymbol({symbol:req.query?.symbol||'META',region:req.query?.region||'US',market_symbol:req.query?.market_symbol});
    if(resolved.region!=='US')return res.status(200).json({symbol:resolved.displaySymbol,name:req.query?.name||resolved.displaySymbol,annual:[],source:'EU fundamentals adapter pending',status:'pending',warning:'EU-Fundamentaldatenquelle noch nicht aktiviert',providerCode:'EU_FUNDAMENTALS_PENDING'});
    const symbol=resolved.secSymbol,map=await tickerMap(),found=map[symbol]; if(!found)return res.status(404).json({error:'Ticker nicht in SEC gefunden',code:'SEC_NOT_FOUND'});
    const r=await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${found.cik}.json`,{headers:{'User-Agent':UA(),'Accept-Encoding':'gzip, deflate'}}); if(!r.ok)return res.status(r.status).json({error:'SEC companyfacts Fehler '+r.status});
    const j=await r.json(),f=j.facts||{};
    const rev=candidates(f,['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet'],'USD');
    const op=candidates(f,['OperatingIncomeLoss'],'USD'),ni=candidates(f,['NetIncomeLoss','ProfitLoss'],'USD'),eps=candidates(f,['EarningsPerShareDiluted'],'USD/shares');
    const cfo=candidates(f,['NetCashProvidedByUsedInOperatingActivities'],'USD'),capex=candidates(f,['PaymentsToAcquirePropertyPlantAndEquipment','PaymentsForAdditionsToPropertyPlantAndEquipment'],'USD');
    const cash=candidates(f,['CashAndCashEquivalentsAtCarryingValue','CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'],'USD');
    const debtCur=candidates(f,['LongTermDebtCurrent','LongTermDebtAndFinanceLeaseObligationsCurrent','ShortTermBorrowings'],'USD'),debtNon=candidates(f,['LongTermDebtNoncurrent','LongTermDebtAndFinanceLeaseObligationsNoncurrent'],'USD');
    const shares=candidates(f,['WeightedAverageNumberOfDilutedSharesOutstanding','CommonStockSharesOutstanding'],'shares');
    const da=candidates(f,['DepreciationDepletionAndAmortization','DepreciationDepletionAndAmortizationPropertyPlantAndEquipment'],'USD');
    const sbc=candidates(f,['ShareBasedCompensation'],'USD'),interest=candidates(f,['InterestExpenseNonOperating','InterestAndDebtExpense'],'USD');
    const pretax=candidates(f,['IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest','IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments'],'USD');
    const tax=candidates(f,['IncomeTaxExpenseBenefit'],'USD'),equity=candidates(f,['StockholdersEquity','StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],'USD');
    const ar=candidates(f,['AccountsReceivableNetCurrent','AccountsNotesAndLoansReceivableNetCurrent'],'USD'),inventory=candidates(f,['InventoryNet'],'USD'),ap=candidates(f,['AccountsPayableCurrent'],'USD');
    const fys=[...new Set([rev,op,ni,cfo].flat().map(x=>x.fy))].sort((a,b)=>a-b); let priorNwc=null;
    const annual=fys.map(fy=>{
      const R=closest(rev,fy),O=closest(op,fy),N=closest(ni,fy),E=closest(eps,fy),C=closest(cfo,fy),X=closest(capex,fy),Ca=closest(cash,fy),Dc=closest(debtCur,fy),Dn=closest(debtNon,fy),S=closest(shares,fy),D=closest(da,fy),Sb=closest(sbc,fy),I=closest(interest,fy),P=closest(pretax,fy),T=closest(tax,fy),Eq=closest(equity,fy),Ar=closest(ar,fy),Inv=closest(inventory,fy),Ap=closest(ap,fy);
      const revenue=R?.val??null,operatingIncome=O?.val??null,cfoVal=C?.val??null,capexVal=X?.val??null,fcf=(cfoVal!=null&&capexVal!=null)?cfoVal-capexVal:null,cashVal=Ca?.val??null,debt=(Dc?.val??0)+(Dn?.val??0);
      const nwc=(Ar||Inv||Ap)?(Ar?.val??0)+(Inv?.val??0)-(Ap?.val??0):null,deltaNwc=(nwc!=null&&priorNwc!=null)?nwc-priorNwc:null; if(nwc!=null)priorNwc=nwc;
      const filed=[R,O,N,C,X].filter(Boolean).map(x=>x.filed).filter(Boolean).sort().at(-1)||R?.filed||O?.filed||N?.filed||null;
      return {fy,date:R?.end||O?.end||N?.end,filed,revenue,operatingIncome,netIncome:N?.val??null,eps:E?.val??null,cfo:cfoVal,capex:capexVal,fcf,cash:cashVal,debt,netCash:cashVal!=null?cashVal-debt:null,shares:S?.val??null,da:D?.val??null,sbc:Sb?.val??null,interestExpense:I?.val??null,pretaxIncome:P?.val??null,incomeTax:T?.val??null,equity:Eq?.val??null,nwc,deltaNwc};
    }).filter(x=>x.date);
    for(let i=0;i<annual.length;i++){const x=annual[i];x.operatingMargin=(x.revenue&&x.operatingIncome!=null)?x.operatingIncome/x.revenue:null;x.fcfMargin=(x.revenue&&x.fcf!=null)?x.fcf/x.revenue:null;const p=i>=3?annual[i-3]:null;x.revenueCagr3y=(p?.revenue>0&&x.revenue>0)?Math.pow(x.revenue/p.revenue,1/(i-(i-3)))-1:null;}
    res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400'); return res.status(200).json({symbol,name:j.entityName||found.name,cik:found.cik,annual,source:'SEC companyfacts',engine:'fundamentals-v1'});
  }catch(e){return res.status(500).json({error:e.message,code:'SEC_PROXY_ERROR'});}
};
