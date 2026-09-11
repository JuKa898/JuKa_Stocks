async function fetchWithTimeout(url,options={},ms=10000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{return await fetch(url,{...options,signal:controller.signal});}
  catch(e){
    if(e?.name==='AbortError'){const err=new Error(`Alpha Vantage Timeout nach ${Math.round(ms/1000)}s`);err.code='ALPHA_TIMEOUT';throw err;}
    throw e;
  }finally{clearTimeout(timer)}
}
const Symbols=require('./symbols');
const statementCache=new Map();
const CACHE_MS=24*60*60*1000;
const resolvedSymbolCache=new Map();

function num(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
function absCapex(v){const n=num(v);return n==null?null:Math.abs(n)}
function byDate(reports=[]){const m=new Map();for(const x of reports||[]){if(x.fiscalDateEnding)m.set(x.fiscalDateEnding,x)}return m}

async function fetchJson(url){
  const r=await fetchWithTimeout(url),j=await r.json();
  if(!r.ok){const e=new Error(`Alpha Vantage HTTP ${r.status}`);e.code='ALPHA_HTTP_ERROR';throw e;}
  if(j.Note||j.Information){const e=new Error(j.Note||j.Information);e.code='ALPHA_RATE_LIMIT';throw e;}
  if(j['Error Message']){const e=new Error(j['Error Message']);e.code='ALPHA_SYMBOL_ERROR';throw e;}
  return j;
}
async function resolveAlphaSymbol(query,current,key,ticker=query){
  const ck=String(ticker||query||current||'').toUpperCase(),hit=resolvedSymbolCache.get(ck);if(hit)return hit;
  const u=new URL('https://www.alphavantage.co/query');u.searchParams.set('function','SYMBOL_SEARCH');u.searchParams.set('keywords',query||ticker||current);u.searchParams.set('apikey',key);
  const j=await fetchJson(u),matches=j.bestMatches||[],wanted=String(ticker||'').toUpperCase().replace(/[:.-].*$/,'');
  const equities=matches.filter(x=>!x['3. type']||/equity|stock/i.test(String(x['3. type']))),pool=equities.length?equities:matches;
  const best=pool.find(x=>String(x['1. symbol']||'').toUpperCase().split('.')[0].replace('-','').startsWith(wanted.replace('-','')))||pool[0];
  const symbol=best?.['1. symbol']||current;if(symbol)resolvedSymbolCache.set(ck,symbol);return symbol;
}
async function statement(fn,symbol,key){
  const ck=`${fn}:${symbol}:${key}`,now=Date.now(),hit=statementCache.get(ck);
  if(hit&&now-hit.time<CACHE_MS)return hit.value;
  const u=new URL('https://www.alphavantage.co/query');
  u.searchParams.set('function',fn);u.searchParams.set('symbol',symbol);u.searchParams.set('apikey',key);
  const v=await fetchJson(u);statementCache.set(ck,{time:now,value:v});return v;
}
function pending(stock,resolved,code='NO_ALPHA_VANTAGE_KEY',warning='ALPHA_VANTAGE_API_KEY fehlt'){
  return {symbol:stock.s||stock.symbol,name:stock.n||stock.name,annual:[],source:'Alpha Vantage EU fundamentals',status:'pending',warning,providerCode:code,resolvedSymbol:resolved.alphaVantageSymbol};
}
async function alphaVantageFundamentals(stock,opts={}){
  const resolved=Symbols.resolveSymbol(stock);
  if(resolved.region==='US'){const e=new Error('EU-Adapter nur für EU-Titel');e.code='EU_ADAPTER_REGION';throw e;}
  const key=opts.apiKey||process.env.ALPHA_VANTAGE_API_KEY;
  if(!resolved.alphaVantageSymbol)return pending(stock,resolved,'EU_SYMBOL_UNMAPPED','Börsenkürzel noch nicht für Alpha Vantage gemappt');
  if(!key)return pending(stock,resolved);

  let sym=resolved.alphaVantageSymbol,income,balance,cashflow;
  // For EU listings, time-series coverage and fundamental coverage can use
  // different vendor symbols. Resolve once through Alpha's own search first.
  try{sym=await resolveAlphaSymbol(stock.n||stock.name||stock.s||stock.symbol,sym,key,stock.s||stock.symbol)||sym}catch(_){}
  try{
    [income,balance,cashflow]=await Promise.all([statement('INCOME_STATEMENT',sym,key),statement('BALANCE_SHEET',sym,key),statement('CASH_FLOW',sym,key)]);
  }catch(err){
    if(err?.code!=='ALPHA_SYMBOL_ERROR')throw err;
    const fallback=await resolveAlphaSymbol(stock.s||stock.symbol,sym,key,stock.s||stock.symbol);
    if(!fallback||fallback===sym)throw err;
    sym=fallback;
    [income,balance,cashflow]=await Promise.all([statement('INCOME_STATEMENT',sym,key),statement('BALANCE_SHEET',sym,key),statement('CASH_FLOW',sym,key)]);
  }
  const hasReports=()=>[income,balance,cashflow].some(x=>(x?.annualReports?.length||0)+(x?.quarterlyReports?.length||0)>0);
  if(!hasReports()){
    const fallback=await resolveAlphaSymbol(stock.s||stock.symbol,sym,key,stock.s||stock.symbol);
    if(fallback&&fallback!==sym){
      sym=fallback;
      [income,balance,cashflow]=await Promise.all([statement('INCOME_STATEMENT',sym,key),statement('BALANCE_SHEET',sym,key),statement('CASH_FLOW',sym,key)]);
    }
  }
  // EARNINGS costs an additional provider request. Only fetch it when strict
  // point-in-time history was explicitly requested. Current EU valuation must
  // not spend scarce free-tier calls on optional publication metadata.
  let earnings=null;
  if(opts.includeHistoryMetadata===true){
    try{earnings=await statement('EARNINGS',sym,key)}catch(_){earnings=null}
  }
  const reportDateByFiscal=new Map();
  for(const q of earnings?.quarterlyEarnings||[]){
    if(q?.fiscalDateEnding&&q?.reportedDate){
      const old=reportDateByFiscal.get(q.fiscalDateEnding);
      if(!old||String(q.reportedDate)>String(old))reportDateByFiscal.set(q.fiscalDateEnding,q.reportedDate);
    }
  }
  const im=byDate(income.annualReports),bm=byDate(balance.annualReports),cm=byDate(cashflow.annualReports);
  const dates=[...new Set([...im.keys(),...bm.keys(),...cm.keys()])].sort();
  const annual=dates.map(date=>{
    const i=im.get(date)||{},b=bm.get(date)||{},c=cm.get(date)||{};
    const revenue=num(i.totalRevenue),operatingIncome=num(i.operatingIncome),netIncome=num(i.netIncome);
    const cfo=num(c.operatingCashflow),capex=absCapex(c.capitalExpenditures);
    const shares=num(b.commonStockSharesOutstanding);
    const eps=netIncome!=null&&shares>0?netIncome/shares:null;
    const cash=num(b.cashAndCashEquivalentsAtCarryingValue)??num(b.cashAndShortTermInvestments);
    const explicitDebt=num(b.shortLongTermDebtTotal),currentDebt=num(b.currentDebt),longDebt=num(b.longTermDebt)??num(b.longTermDebtNoncurrent);
    const debt=explicitDebt??((currentDebt!==null||longDebt!==null)?(currentDebt??0)+(longDebt??0):null);
    const reportedDate=reportDateByFiscal.get(date)||null;
    return {
      fy:Number(date.slice(0,4)),date,filed:reportedDate,availableFrom:reportedDate,revenue,operatingIncome,netIncome,eps,cfo,capex,
      fcf:cfo!=null&&capex!=null?cfo-capex:null,
      cash,debt,shares,
      da:num(c.depreciationDepletionAndAmortization)??num(c.depreciation),
      sbc:null,interestExpense:num(i.interestExpense),pretaxIncome:num(i.incomeBeforeTax),
      incomeTax:num(i.incomeTaxExpense),equity:num(b.totalShareholderEquity),affo:null,ffo:null,deltaNwc:null
    };
  }).filter(x=>x.date&&(x.revenue!=null||x.netIncome!=null||x.equity!=null));

  // Current valuation should not be almost a year stale when quarterly data is
  // available. Build a current TTM row from Alpha's normalized quarterly reports.
  const iq=(income.quarterlyReports||[]).slice().sort((a,b)=>String(b.fiscalDateEnding||'').localeCompare(String(a.fiscalDateEnding||''))).slice(0,4);
  const cq=(cashflow.quarterlyReports||[]).slice().sort((a,b)=>String(b.fiscalDateEnding||'').localeCompare(String(a.fiscalDateEnding||''))).slice(0,4);
  const bq=(balance.quarterlyReports||[]).slice().sort((a,b)=>String(b.fiscalDateEnding||'').localeCompare(String(a.fiscalDateEnding||'')));
  if(iq.length===4&&bq.length){
    const sumComplete=(rows,key)=>{
      if(rows.length!==4)return null;
      const vals=rows.map(r=>num(r?.[key]));
      if(vals.some(v=>v==null))return null;
      return vals.reduce((a,v)=>a+v,0);
    };
    const latestQ=iq[0],latestDate=latestQ.fiscalDateEnding;
    const latestB=bq.find(x=>String(x.fiscalDateEnding||'')<=String(latestDate))||bq[0]||{};
    const revenue=sumComplete(iq,'totalRevenue'),operatingIncome=sumComplete(iq,'operatingIncome'),netIncome=sumComplete(iq,'netIncome');
    const cfo=sumComplete(cq,'operatingCashflow'),capexRaw=sumComplete(cq,'capitalExpenditures'),capex=capexRaw==null?null:Math.abs(capexRaw);
    const shares=num(latestB.commonStockSharesOutstanding),cash=num(latestB.cashAndCashEquivalentsAtCarryingValue)??num(latestB.cashAndShortTermInvestments);
    const explicitDebt=num(latestB.shortLongTermDebtTotal),currentDebt=num(latestB.currentDebt),longDebt=num(latestB.longTermDebt)??num(latestB.longTermDebtNoncurrent);
    const debt=explicitDebt??((currentDebt!==null||longDebt!==null)?(currentDebt??0)+(longDebt??0):null);
    const ttm={fy:Number(String(latestDate||'').slice(0,4)),date:latestDate,filed:null,availableFrom:null,isTTM:true,revenue,operatingIncome,netIncome,
      eps:netIncome!=null&&shares>0?netIncome/shares:null,cfo,capex,fcf:cfo!=null&&capex!=null?cfo-capex:null,cash,debt,shares,
      da:sumComplete(cq,'depreciationDepletionAndAmortization'),sbc:null,interestExpense:sumComplete(iq,'interestExpense'),pretaxIncome:sumComplete(iq,'incomeBeforeTax'),
      incomeTax:sumComplete(iq,'incomeTaxExpense'),equity:num(latestB.totalShareholderEquity),affo:null,ffo:null,deltaNwc:null};
    if(ttm.date&&(ttm.revenue!=null||ttm.netIncome!=null))annual.push(ttm);
  }

  let overview=null;
  if(!annual.length){
    try{overview=await statement('OVERVIEW',sym,key)}catch(_){overview=null}
    const date=overview?.LatestQuarter||null,revenue=num(overview?.RevenueTTM),shares=num(overview?.SharesOutstanding),eps=num(overview?.DilutedEPSTTM);
    const margin=num(overview?.OperatingMarginTTM),profit=num(overview?.ProfitMargin);
    if(date&&(revenue!=null||eps!=null)){
      annual.push({fy:Number(String(date).slice(0,4)),date,filed:null,availableFrom:null,isTTM:true,isOverviewFallback:true,revenue,
        operatingIncome:revenue!=null&&margin!=null?revenue*margin:null,netIncome:revenue!=null&&profit!=null?revenue*profit:null,eps,
        cfo:null,capex:null,fcf:null,cash:null,debt:null,shares,da:null,sbc:null,interestExpense:null,pretaxIncome:null,incomeTax:null,
        equity:num(overview?.BookValue)!=null&&shares>0?num(overview.BookValue)*shares:null,affo:null,ffo:null,deltaNwc:null});
    }
  }

  return {
    symbol:stock.s||stock.symbol,name:stock.n||stock.name||sym,annual,
    source:'Alpha Vantage fundamentals',status:annual.length?'ok':'unavailable',
    warning:annual.length?(annual.some(x=>x.isOverviewFallback)?'Nur Basis-Fundamentals verfügbar; für robusten Fair Value fehlen Cashflow-/Bilanzdetails.':null):'Keine Fundamentals vom EU-Provider für dieses Listing',
    providerCode:annual.length?(annual.some(x=>x.isOverviewFallback)?'ALPHA_OVERVIEW_ONLY':'ALPHA_VANTAGE'):'ALPHA_NO_FUNDAMENTALS',
    historyAvailability:annual.some(x=>x.filed)?'reported-date':'current-only',
    resolvedSymbol:sym
  };
}
function clearCache(){statementCache.clear();resolvedSymbolCache.clear()}
module.exports={alphaVantageFundamentals,clearCache,statementCache};
