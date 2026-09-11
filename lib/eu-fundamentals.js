function fetchWithTimeout(url,options={},ms=12000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));
}
const Symbols=require('./symbols');
const statementCache=new Map();
const CACHE_MS=24*60*60*1000;

function num(v){const n=Number(v);return Number.isFinite(n)?n:null}
function absCapex(v){const n=num(v);return n==null?null:Math.abs(n)}
function byDate(reports=[]){const m=new Map();for(const x of reports||[]){if(x.fiscalDateEnding)m.set(x.fiscalDateEnding,x)}return m}

async function fetchJson(url){
  const r=await fetchWithTimeout(url),j=await r.json();
  if(!r.ok){const e=new Error(`Alpha Vantage HTTP ${r.status}`);e.code='ALPHA_HTTP_ERROR';throw e;}
  if(j.Note||j.Information){const e=new Error(j.Note||j.Information);e.code='ALPHA_RATE_LIMIT';throw e;}
  if(j['Error Message']){const e=new Error(j['Error Message']);e.code='ALPHA_SYMBOL_ERROR';throw e;}
  return j;
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

  const sym=resolved.alphaVantageSymbol;
  const [income,balance,cashflow]=await Promise.all([
    statement('INCOME_STATEMENT',sym,key),
    statement('BALANCE_SHEET',sym,key),
    statement('CASH_FLOW',sym,key)
  ]);
  // EARNINGS is optional: current valuation must still work if this extra history call is unavailable.
  let earnings=null;
  try{earnings=await statement('EARNINGS',sym,key)}catch(_){earnings=null}
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
    const explicitDebt=num(b.shortLongTermDebtTotal);
    const debt=explicitDebt??((num(b.currentDebt)??0)+(num(b.longTermDebt)??num(b.longTermDebtNoncurrent)??0));
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

  return {
    symbol:stock.s||stock.symbol,name:stock.n||stock.name||sym,annual,
    source:'Alpha Vantage fundamentals',status:annual.length?'ok':'unavailable',
    warning:annual.length?null:'Keine jährlichen Fundamentals vom EU-Provider',
    providerCode:annual.length?'ALPHA_VANTAGE':'ALPHA_NO_ANNUAL',
    historyAvailability:annual.some(x=>x.filed)?'reported-date':'current-only',
    resolvedSymbol:sym
  };
}
function clearCache(){statementCache.clear()}
module.exports={alphaVantageFundamentals,clearCache,statementCache};
