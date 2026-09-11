function fetchWithTimeout(url,options={},ms=12000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));
}
const Symbols=require('../lib/symbols');

function alphaError(j){
  return j?.['Error Message']||j?.Note||j?.Information||null;
}
function alphaSeriesRows(j,key){
  const series=j?.[key];
  if(!series||typeof series!=='object')return [];
  return Object.entries(series).map(([datetime,row])=>({
    datetime,open:row['1. open'],high:row['2. high'],low:row['3. low'],close:row['4. close'],volume:row['5. volume']
  })).filter(x=>x.datetime&&Number.isFinite(Number(x.close)));
}
function mergeAlphaRows(weekly=[],daily=[]){
  const byDate=new Map();
  for(const row of weekly)byDate.set(String(row.datetime).slice(0,10),row);
  for(const row of daily)byDate.set(String(row.datetime).slice(0,10),row);
  return [...byDate.values()].sort((a,b)=>String(b.datetime).localeCompare(String(a.datetime)));
}
function alphaToMarket(dailyJson,weeklyJson,resolved){
  const daily=alphaSeriesRows(dailyJson,'Time Series (Daily)');
  const weekly=alphaSeriesRows(weeklyJson,'Weekly Time Series');
  const values=mergeAlphaRows(weekly,daily);
  if(!values.length)throw new Error(alphaError(dailyJson)||alphaError(weeklyJson)||'Alpha-Vantage-Kursdaten fehlen');
  return {meta:{symbol:resolved.displaySymbol,exchange:resolved.exchangeHint||'Europe',currency:null,interval:'daily+weekly',provider:'Alpha Vantage'},
    values,status:'ok',provider:'Alpha Vantage',resolvedSymbol:resolved.alphaVantageSymbol};
}
async function alphaFetch(fn,resolved,key,extra={}){
  const url=new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function',fn);url.searchParams.set('symbol',resolved.alphaVantageSymbol);
  for(const [k,v] of Object.entries(extra))url.searchParams.set(k,v);
  url.searchParams.set('apikey',key);
  const r=await fetchWithTimeout(url,{},15000),j=await r.json();
  if(!r.ok||alphaError(j)){const e=new Error(alphaError(j)||`Alpha Vantage ${r.status}`);e.status=r.status||502;e.provider='Alpha Vantage';throw e;}
  return j;
}
async function alphaDaily(resolved){
  const key=process.env.ALPHA_VANTAGE_API_KEY;
  if(!key)throw Object.assign(new Error('ALPHA_VANTAGE_API_KEY fehlt'),{code:'NO_ALPHA_KEY'});
  if(!resolved.alphaVantageSymbol)throw new Error('Kein Alpha-Vantage-Symbol für diesen Markt');
  const [daily,weekly]=await Promise.all([
    alphaFetch('TIME_SERIES_DAILY',resolved,key,{outputsize:'compact'}),
    alphaFetch('TIME_SERIES_WEEKLY',resolved,key)
  ]);
  return alphaToMarket(daily,weekly,resolved);
}
async function twelveDaily(resolved,key,start_date,end_date){
  const url=new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol',resolved.marketSymbol);
  url.searchParams.set('interval','1day');
  url.searchParams.set('adjust','all');
  url.searchParams.set('outputsize',start_date?'1500':'5000');
  if(start_date)url.searchParams.set('start_date',start_date);
  if(end_date)url.searchParams.set('end_date',end_date);
  const r=await fetchWithTimeout(url,{headers:{Authorization:`apikey ${key}`}});
  const data=await r.json();
  if(!r.ok||data?.status==='error'){
    const e=new Error(data?.message||'Marktdatenfehler');
    e.status=r.status||502;e.provider='Twelve Data';throw e;
  }
  return {...data,provider:'Twelve Data',resolvedSymbol:resolved.marketSymbol};
}

module.exports = async function handler(req,res){
  try{
    const {action='time_series',symbol='META',query='',start_date='',end_date='',market_symbol='',region=''}=req.query||{};
    const resolved=Symbols.resolveSymbol({symbol,market_symbol:market_symbol||symbol,region});
    res.setHeader('Cache-Control',action==='search'?'s-maxage=86400, stale-while-revalidate=86400':'s-maxage=21600, stale-while-revalidate=86400');

    if(action==='search'){
      const key=process.env.TWELVE_DATA_API_KEY;
      if(!key)return res.status(503).json({error:'TWELVE_DATA_API_KEY fehlt',code:'NO_MARKET_KEY'});
      const url=new URL('https://api.twelvedata.com/symbol_search');
      url.searchParams.set('symbol',query||symbol);url.searchParams.set('outputsize','12');
      const r=await fetchWithTimeout(url,{headers:{Authorization:`apikey ${key}`}});
      const data=await r.json();
      if(!r.ok||data?.status==='error')return res.status(r.status||502).json({error:data?.message||'Marktdatenfehler',code:'MARKET_PROVIDER_ERROR'});
      return res.status(200).json(data);
    }

    // Twelve Data Basic does not cover ordinary European exchanges.
    // Route EU daily prices directly through Alpha Vantage.
    if(resolved.region==='EU'){
      try{
        const data=await alphaDaily(resolved);
        return res.status(200).json(data);
      }catch(e){
        return res.status(502).json({
          error:e.message,
          code:e.code||'EU_MARKET_PROVIDER_ERROR',
          provider:'Alpha Vantage',
          resolvedSymbol:resolved.alphaVantageSymbol
        });
      }
    }

    const key=process.env.TWELVE_DATA_API_KEY;
    if(!key)return res.status(503).json({error:'TWELVE_DATA_API_KEY fehlt',code:'NO_MARKET_KEY'});
    try{
      const data=await twelveDaily(resolved,key,start_date,end_date);
      return res.status(200).json(data);
    }catch(e){
      return res.status(e.status||502).json({error:e.message,code:'MARKET_PROVIDER_ERROR',provider:'Twelve Data'});
    }
  }catch(e){
    return res.status(500).json({error:e.message,code:'MARKET_PROXY_ERROR'});
  }
};

module.exports._test={alphaError,alphaSeriesRows,mergeAlphaRows,alphaToMarket};
