function fetchWithTimeout(url,options={},ms=12000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));
}
const Symbols=require('../lib/symbols');
const Core=require('../core');
const Pipeline=require('../lib/pipeline');
const EU=require('../lib/eu-fundamentals');
const ANALYSIS_CACHE=new Map();

const UA=()=>process.env.SEC_USER_AGENT||'JuKa Stocks research app contact@example.com';
let tickerCache={time:0,map:null};
async function secTickerMap(){
  if(tickerCache.map&&Date.now()-tickerCache.time<86400000)return tickerCache.map;
  const r=await fetchWithTimeout('https://www.sec.gov/files/company_tickers.json',{headers:{'User-Agent':UA(),'Accept-Encoding':'gzip, deflate'}});
  if(!r.ok)throw new Error('SEC ticker map '+r.status);
  const j=await r.json(),map={};
  Object.values(j).forEach(x=>map[String(x.ticker).toUpperCase()]={cik:String(x.cik_str).padStart(10,'0'),name:x.title});
  tickerCache={time:Date.now(),map};return map;
}
function units(facts,tag,unit){return facts?.['us-gaap']?.[tag]?.units?.[unit]||[]}
function annualRows(items){
  const p={'10-K':4,'10-K/A':3,'20-F':2,'20-F/A':1},by={};
  for(const x of items||[]){if(x.fy==null||!p[x.form])continue;const k=String(x.fy),c=by[k];if(!c||p[x.form]>p[c.form]||(p[x.form]===p[c.form]&&String(x.filed)>String(c.filed)))by[k]=x;}
  return Object.values(by).sort((a,b)=>Number(a.fy)-Number(b.fy));
}
function candidates(facts,tags,unit){
  const maps=tags.map(t=>annualRows(units(facts,t,unit))),fys=[...new Set(maps.flat().map(x=>x.fy))].sort((a,b)=>a-b),o=[];
  for(const fy of fys){for(const rows of maps){const x=rows.find(r=>String(r.fy)===String(fy));if(x){o.push(x);break;}}}
  return o;
}
function closest(rows,fy){return rows.find(x=>String(x.fy)===String(fy))||null}

async function secAdapter(stock){
  const resolved=Symbols.resolveSymbol(stock);
  if(resolved.region!=='US'){const e=new Error('SEC-Adapter nur für US-Titel');e.code='SEC_REGION';throw e;}
  const map=await secTickerMap(),sym=resolved.secSymbol,found=map[sym];
  if(!found){const e=new Error('Ticker nicht in SEC gefunden');e.code='SEC_NOT_FOUND';throw e;}
  const r=await fetchWithTimeout(`https://data.sec.gov/api/xbrl/companyfacts/CIK${found.cik}.json`,{headers:{'User-Agent':UA(),'Accept-Encoding':'gzip, deflate'}});
  if(!r.ok)throw new Error('SEC companyfacts '+r.status);
  const j=await r.json(),f=j.facts||{};
  const sets={
    rev:candidates(f,['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet'],'USD'),
    op:candidates(f,['OperatingIncomeLoss'],'USD'),
    ni:candidates(f,['NetIncomeLoss','ProfitLoss'],'USD'),
    eps:candidates(f,['EarningsPerShareDiluted'],'USD/shares'),
    cfo:candidates(f,['NetCashProvidedByUsedInOperatingActivities'],'USD'),
    capex:candidates(f,['PaymentsToAcquirePropertyPlantAndEquipment','PaymentsForAdditionsToPropertyPlantAndEquipment'],'USD'),
    cash:candidates(f,['CashAndCashEquivalentsAtCarryingValue','CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'],'USD'),
    debtCur:candidates(f,['LongTermDebtCurrent','LongTermDebtAndFinanceLeaseObligationsCurrent','ShortTermBorrowings'],'USD'),
    debtNon:candidates(f,['LongTermDebtNoncurrent','LongTermDebtAndFinanceLeaseObligationsNoncurrent'],'USD'),
    shares:candidates(f,['WeightedAverageNumberOfDilutedSharesOutstanding','CommonStockSharesOutstanding'],'shares'),
    da:candidates(f,['DepreciationDepletionAndAmortization','DepreciationDepletionAndAmortizationPropertyPlantAndEquipment'],'USD'),
    sbc:candidates(f,['ShareBasedCompensation'],'USD'),
    interest:candidates(f,['InterestExpenseNonOperating','InterestAndDebtExpense'],'USD'),
    pretax:candidates(f,['IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest','IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments'],'USD'),
    tax:candidates(f,['IncomeTaxExpenseBenefit'],'USD'),
    equity:candidates(f,['StockholdersEquity','StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],'USD'),
    ar:candidates(f,['AccountsReceivableNetCurrent','AccountsNotesAndLoansReceivableNetCurrent'],'USD'),
    inv:candidates(f,['InventoryNet'],'USD'),
    ap:candidates(f,['AccountsPayableCurrent'],'USD')
  };
  const fys=[...new Set(Object.values(sets).flat().map(x=>x.fy))].sort((a,b)=>a-b);let priorNwc=null;
  const annual=fys.map(fy=>{
    const g=k=>closest(sets[k],fy),R=g('rev'),O=g('op'),N=g('ni'),E=g('eps'),C=g('cfo'),X=g('capex'),Ca=g('cash'),Dc=g('debtCur'),Dn=g('debtNon'),S=g('shares'),D=g('da'),Sb=g('sbc'),I=g('interest'),P=g('pretax'),T=g('tax'),Eq=g('equity'),Ar=g('ar'),Inv=g('inv'),Ap=g('ap');
    const revenue=R?.val??null,cfo=C?.val??null,capex=X?.val??null,cash=Ca?.val??null,debt=(Dc?.val??0)+(Dn?.val??0);
    const nwc=(Ar||Inv||Ap)?(Ar?.val??0)+(Inv?.val??0)-(Ap?.val??0):null,deltaNwc=nwc!=null&&priorNwc!=null?nwc-priorNwc:null;if(nwc!=null)priorNwc=nwc;
    return {fy,date:R?.end||O?.end||N?.end,filed:[R,O,N,C,X].filter(Boolean).map(x=>x.filed).filter(Boolean).sort().at(-1)||null,revenue,operatingIncome:O?.val??null,netIncome:N?.val??null,eps:E?.val??null,cfo,capex,fcf:cfo!=null&&capex!=null?cfo-capex:null,cash,debt,shares:S?.val??null,da:D?.val??null,sbc:Sb?.val??null,interestExpense:I?.val??null,pretaxIncome:P?.val??null,incomeTax:T?.val??null,equity:Eq?.val??null,deltaNwc};
  }).filter(x=>x.date);
  return {symbol:stock.s,name:j.entityName||found.name,annual,source:'SEC companyfacts'};
}

async function fundamentalsAdapter(stock){
  const resolved=Symbols.resolveSymbol(stock);
  return resolved.region==='US'?secAdapter(stock):EU.alphaVantageFundamentals(stock);
}

async function marketAdapter(stock){
  const key=process.env.TWELVE_DATA_API_KEY;if(!key){const e=new Error('TWELVE_DATA_API_KEY fehlt');e.code='NO_MARKET_KEY';throw e;}
  const resolved=Symbols.resolveSymbol(stock);
  const start=new Date();start.setFullYear(start.getFullYear()-10);
  const u=new URL('https://api.twelvedata.com/time_series');
  u.searchParams.set('symbol',resolved.marketSymbol);u.searchParams.set('interval','1day');u.searchParams.set('adjust','all');u.searchParams.set('outputsize','5000');u.searchParams.set('start_date',start.toISOString().slice(0,10));
  const r=await fetchWithTimeout(u,{headers:{Authorization:`apikey ${key}`}}),j=await r.json();
  if(!r.ok||j.status==='error'){const e=new Error(j.message||'Marktdatenfehler');e.code='MARKET_PROVIDER_ERROR';e.httpStatus=r.status||502;throw e;}
  if(!Array.isArray(j.values)||!j.values.length){const e=new Error('Keine Kursdaten vom Marktprovider');e.code='NO_MARKET_DATA';e.httpStatus=404;throw e;}
  return {...j,source:'Twelve Data',status:'ok',resolvedSymbol:resolved.marketSymbol};
}

module.exports=async function handler(req,res){
  try{
    const q=req.query||{},base={s:String(q.symbol||'META').toUpperCase(),n:q.name||undefined,region:String(q.region||'').toUpperCase(),currency:q.currency||'USD',marketSymbol:q.market_symbol||q.symbol||'META',sector:q.sector||'',valuationModel:q.model||''};
    const resolved=Symbols.resolveSymbol(base),stock={...base,region:resolved.region,marketSymbol:resolved.marketSymbol,resolved};
    const pipe=Pipeline.createPipeline({marketAdapter,fundamentalsAdapter,core:Core,cache:ANALYSIS_CACHE,ttlMs:21600000,allowPartial:true});
    const out=await pipe.load(stock);
    out.symbolResolution=resolved;
    res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json(out);
  }catch(e){
    const status=e.httpStatus||(e.code==='NO_MARKET_KEY'?503:e.code==='NO_MARKET_DATA'?404:502);
    return res.status(status).json({error:e.message,code:e.code||'ANALYSIS_PIPELINE_ERROR'});
  }
};
