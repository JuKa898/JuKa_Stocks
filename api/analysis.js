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

const UA=()=>process.env.SEC_USER_AGENT||'JUKA research app contact@example.com';
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
  const priority={'10-K':4,'10-K/A':3,'20-F':2,'20-F/A':1},by={};
  for(const x of items||[]){
    if(!x.end||!priority[x.form])continue;
    if(x.start){
      const days=(Date.parse(x.end)-Date.parse(x.start))/86400000;
      if(!Number.isFinite(days)||days<300||days>430)continue;
    }
    const k=String(x.end),endYear=Number(k.slice(0,4)),fy=Number(x.fy);
    const distance=Number.isFinite(fy)?Math.abs(fy-endYear):99;
    const cur=by[k],curFy=cur?Number(cur.fy):NaN;
    const curDistance=cur&&Number.isFinite(curFy)?Math.abs(curFy-endYear):99;
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
    rd:candidates(f,['ResearchAndDevelopmentExpense','ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost','ResearchAndDevelopmentExpenseSoftwareExcludingAcquiredInProcessCost'],'USD'),
    interest:candidates(f,['InterestExpenseNonOperating','InterestAndDebtExpense'],'USD'),
    pretax:candidates(f,['IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest','IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments'],'USD'),
    tax:candidates(f,['IncomeTaxExpenseBenefit'],'USD'),
    equity:candidates(f,['StockholdersEquity','StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],'USD'),
    ffo:candidates(f,['FundsFromOperations','FundsFromOperationsAvailableToCommonStockholders'],'USD'),
    ar:candidates(f,['AccountsReceivableNetCurrent','AccountsNotesAndLoansReceivableNetCurrent'],'USD'),
    inv:candidates(f,['InventoryNet'],'USD'),
    ap:candidates(f,['AccountsPayableCurrent'],'USD')
  };
  const periods=[...new Set([sets.rev,sets.op,sets.ni,sets.cfo].flat().map(x=>x.end).filter(Boolean))].sort();
  let priorNwc=null;
  const annual=periods.map(date=>{
    const g=k=>closest(sets[k],date);
    const R=g('rev'),O=g('op'),N=g('ni'),E=g('eps'),C=g('cfo'),X=g('capex'),Ca=g('cash'),Dc=g('debtCur'),Dn=g('debtNon'),S=g('shares'),D=g('da'),Sb=g('sbc'),Rd=g('rd'),I=g('interest'),P=g('pretax'),T=g('tax'),Eq=g('equity'),Ffo=g('ffo'),Ar=g('ar'),Inv=g('inv'),Ap=g('ap');
    const revenue=R?.val??null,operatingIncome=O?.val??null,cfo=C?.val??null,capex=X?.val??null;
    const cash=Ca?.val??null,debt=(Dc?.val??0)+(Dn?.val??0);
    const nwc=(Ar||Inv||Ap)?(Ar?.val??0)+(Inv?.val??0)-(Ap?.val??0):null;
    const deltaNwc=nwc!=null&&priorNwc!=null?nwc-priorNwc:null;
    if(nwc!=null)priorNwc=nwc;
    const filed=[R,O,N,C,X].filter(Boolean).map(x=>x.filed).filter(Boolean).sort().at(-1)||null;
    const periodDate=R?.end||O?.end||N?.end||date;
    return {
      fy:Number(String(periodDate).slice(0,4)),date:periodDate,filed,
      revenue,operatingIncome,netIncome:N?.val??null,eps:E?.val??null,cfo,capex,
      fcf:cfo!=null&&capex!=null?cfo-capex:null,cash,debt,netCash:cash!=null?cash-debt:null,
      shares:S?.val??null,da:D?.val??null,sbc:Sb?.val??null,rd:Rd?.val??null,researchAndDevelopment:Rd?.val??null,interestExpense:I?.val??null,
      pretaxIncome:P?.val??null,incomeTax:T?.val??null,equity:Eq?.val??null,ffo:Ffo?.val??null,nwc,deltaNwc
    };
  }).filter(x=>x.date);
  return {symbol:stock.s,name:found.name,annual,source:'SEC companyfacts',status:'ok'};
}

async function fundamentalsAdapter(stock){
  const resolved=Symbols.resolveSymbol(stock);
  return resolved.region==='US'?secAdapter(stock):EU.alphaVantageFundamentals(stock);
}

function alphaError(j){return j?.['Error Message']||j?.Note||j?.Information||null}
function alphaRows(j,key){
  const series=j?.[key];if(!series||typeof series!=='object')return [];
  return Object.entries(series).map(([datetime,row])=>({
    datetime,open:row['1. open'],high:row['2. high'],low:row['3. low'],close:row['4. close'],volume:row['5. volume']
  })).filter(x=>x.datetime&&Number.isFinite(Number(x.close)));
}
function mergeAlphaMarket(weekly=[],daily=[]){
  const byDate=new Map();for(const row of weekly)byDate.set(String(row.datetime).slice(0,10),row);
  for(const row of daily)byDate.set(String(row.datetime).slice(0,10),row);
  return [...byDate.values()].sort((a,b)=>String(b.datetime).localeCompare(String(a.datetime)));
}
async function alphaRequest(fn,resolved,key,extra={}){
  const u=new URL('https://www.alphavantage.co/query');u.searchParams.set('function',fn);u.searchParams.set('symbol',resolved.alphaVantageSymbol);
  for(const [k,v] of Object.entries(extra))u.searchParams.set(k,v);u.searchParams.set('apikey',key);
  const r=await fetchWithTimeout(u,{},15000),j=await r.json();
  if(!r.ok||alphaError(j)){const e=new Error(alphaError(j)||`Alpha Vantage ${r.status}`);e.code='EU_MARKET_PROVIDER_ERROR';e.httpStatus=r.status||502;throw e}
  return j;
}
async function alphaDailyAnalysis(resolved){
  const key=process.env.ALPHA_VANTAGE_API_KEY;
  if(!key){const e=new Error('ALPHA_VANTAGE_API_KEY fehlt');e.code='NO_ALPHA_KEY';throw e}
  if(!resolved.alphaVantageSymbol){const e=new Error('Kein Alpha-Vantage-Symbol für diesen EU-Markt');e.code='EU_SYMBOL_UNMAPPED';throw e}
  // Free Alpha Vantage: daily "full" is premium. Use compact daily + free weekly history.
  const [dailyJson,weeklyJson]=await Promise.all([
    alphaRequest('TIME_SERIES_DAILY',resolved,key,{outputsize:'compact'}),
    alphaRequest('TIME_SERIES_WEEKLY',resolved,key)
  ]);
  const values=mergeAlphaMarket(alphaRows(weeklyJson,'Weekly Time Series'),alphaRows(dailyJson,'Time Series (Daily)'));
  if(!values.length){const e=new Error('Alpha-Vantage-Kursdaten fehlen');e.code='EU_MARKET_PROVIDER_ERROR';throw e}
  return {meta:{symbol:resolved.displaySymbol,exchange:resolved.exchangeHint||'Europe',interval:'daily+weekly',provider:'Alpha Vantage'},
    values,source:'Alpha Vantage',provider:'Alpha Vantage',status:'ok',resolvedSymbol:resolved.alphaVantageSymbol};
}
async function marketAdapter(stock){
  const resolved=Symbols.resolveSymbol(stock);
  // EU is deliberately routed to Alpha Vantage here as well as in /api/market.
  // This fixes the previous split-brain bug where the chart endpoint worked but full analysis still called Twelve Data.
  if(resolved.region==='EU')return alphaDailyAnalysis(resolved);
  const key=process.env.TWELVE_DATA_API_KEY;if(!key){const e=new Error('TWELVE_DATA_API_KEY fehlt');e.code='NO_MARKET_KEY';throw e;}
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
    out.engineVersion='JUKA-9.2.0-final-system-hardened';
    res.setHeader('Cache-Control',resolved.region==='EU'?'s-maxage=86400, stale-while-revalidate=604800':'s-maxage=21600, stale-while-revalidate=86400');
    if(String(q.history||'')==='1'){
      const rows=out.fundamentals?.annual||out.derived||[];
      const prices=(out.market?.prices||[]).map(x=>({date:x.date,close:x.close}));
      const requested=String(q.dates||'').split(',').map(x=>x.trim()).filter(Boolean);
      const publicationDates=rows.map(r=>r.accepted||r.filed||r.filedDate||r.publishedDate||r.availableFrom).filter(Boolean); const currentDate=out.market?.asOf?[out.market.asOf]:[]; const dates=requested.length?requested:[...new Set([...publicationDates.slice(-12),...currentDate])];
      const history=Core.jukaPointInTimeFairValue(stock,rows,prices,{dates,model:out.model});
      return res.status(200).json({engineVersion:out.engineVersion,symbol:out.stock?.s,currency:out.currency,history});
    }
    if(String(q.summary||'')==='1'){
      const l=out.latest||{};
      return res.status(200).json({
        engineVersion:out.engineVersion,
        symbol:out.stock?.s,
        analysisStatus:out.analysisStatus,
        valuationStatus:out.valuationStatus,
        model:out.model,
        modelReady:out.modelReadiness?.ready,
        modelReadiness:out.modelReadiness,
        modelLabel:out.model==='operating-company'?'Operatives Unternehmen':out.model==='bank-insurance'?'Bank / Versicherung':'REIT',
        price:out.price,
        currency:out.currency,
        exchange:out.exchange||out.market?.exchange||out.market?.meta?.exchange||null,
        marketAsOf:out.market?.asOf,
        fundamentalsAsOf:out.fundamentals?.asOf,
        latest:{fy:l.fy,date:l.date,filed:l.filed,revenue:l.revenue,operatingIncome:l.operatingIncome,netIncome:l.netIncome,eps:l.eps,cfo:l.cfo,capex:l.capex,fcf:l.fcf,cash:l.cash,debt:l.debt,netCash:l.netCash,shares:l.shares},
        quality:out.quality?{score:out.quality.score,grade:out.quality.grade,label:out.quality.label,coverage:out.quality.coverage,confidence:out.quality.confidence,verdict:out.quality.verdict,recommendation:out.quality.recommendation,strengths:out.quality.strengths,weaknesses:out.quality.weaknesses,parts:out.quality.parts}:null,
        valuation:out.valuation?{bear:out.valuation.bear,base:out.valuation.base,bull:out.valuation.bull}:null,
        release:out.release||out.fairValue2?.release||null,
        stability:out.stability||null,
        fairValue2:out.fairValue2?{version:out.fairValue2.version,model:out.fairValue2.model,confidence:out.fairValue2.confidence,checks:out.fairValue2.checks}:null,
        valuationMethods:out.valuationMethods||null,
        historicalPlausibility:out.historicalPlausibility||null,
        relative:out.relative,
        reality:out.reality,
        riskAudit:out.riskAudit,
        dataQuality:out.dataQuality,
        autoAssumptions:out.autoAssumptions?.assumptions||null,
        engineAssumptions:out.engineAssumptions||null,
        warnings:out.warnings,
        provenance:out.provenance
      });
    }
    return res.status(200).json(out);
  }catch(e){
    const status=e.httpStatus||(e.code==='NO_MARKET_KEY'?503:e.code==='NO_MARKET_DATA'?404:502);
    return res.status(status).json({error:e.message,code:e.code||'ANALYSIS_PIPELINE_ERROR'});
  }
};
