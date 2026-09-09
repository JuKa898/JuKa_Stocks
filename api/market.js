function fetchWithTimeout(url,options={},ms=12000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));
}
const Symbols=require('../lib/symbols');
module.exports = async function handler(req,res){
  try{
    const key=process.env.TWELVE_DATA_API_KEY;
    if(!key) return res.status(503).json({error:'TWELVE_DATA_API_KEY fehlt',code:'NO_MARKET_KEY'});
    const {action='time_series',symbol='META',query='',start_date='',end_date='',market_symbol='',region=''}=req.query||{};
    const resolved=Symbols.resolveSymbol({symbol,market_symbol:market_symbol||symbol,region});
    const base='https://api.twelvedata.com'; let url;
    if(action==='search'){
      url=new URL(base+'/symbol_search'); url.searchParams.set('symbol',query||symbol); url.searchParams.set('outputsize','12');
    }else{
      url=new URL(base+'/time_series'); url.searchParams.set('symbol',resolved.marketSymbol); url.searchParams.set('interval','1day'); url.searchParams.set('adjust','all');
      url.searchParams.set('outputsize',start_date?'1500':'5000');
      if(start_date)url.searchParams.set('start_date',start_date); if(end_date)url.searchParams.set('end_date',end_date);
    }
    const r=await fetchWithTimeout(url,{headers:{Authorization:`apikey ${key}`}}); const data=await r.json();
    res.setHeader('Cache-Control',action==='search'?'s-maxage=86400, stale-while-revalidate=86400':'s-maxage=21600, stale-while-revalidate=86400');
    if(!r.ok||data?.status==='error')return res.status(r.status||502).json({error:data?.message||'Marktdatenfehler',code:'MARKET_PROVIDER_ERROR'});
    return res.status(200).json({...data,resolvedSymbol:resolved.marketSymbol});
  }catch(e){return res.status(500).json({error:e.message,code:'MARKET_PROXY_ERROR'});}
}
