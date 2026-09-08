module.exports = async function handler(req,res){
  try{
    const key=process.env.TWELVE_DATA_API_KEY;
    if(!key) return res.status(503).json({error:'TWELVE_DATA_API_KEY fehlt',code:'NO_MARKET_KEY'});
    const {action='time_series',symbol='META',query='',start_date='',end_date=''}=req.query||{};
    const base='https://api.twelvedata.com'; let url;
    if(action==='search'){
      url=new URL(base+'/symbol_search'); url.searchParams.set('symbol',query||symbol); url.searchParams.set('outputsize','12');
    }else{
      url=new URL(base+'/time_series'); url.searchParams.set('symbol',symbol); url.searchParams.set('interval','1day'); url.searchParams.set('adjust','all'); url.searchParams.set('outputsize','5000');
      if(start_date)url.searchParams.set('start_date',start_date); if(end_date)url.searchParams.set('end_date',end_date);
    }
    const r=await fetch(url,{headers:{Authorization:`apikey ${key}`}}); const data=await r.json();
    res.setHeader('Cache-Control',action==='search'?'s-maxage=86400, stale-while-revalidate=86400':'s-maxage=21600, stale-while-revalidate=86400');
    return res.status(r.ok?200:r.status).json(data);
  }catch(e){return res.status(500).json({error:e.message,code:'MARKET_PROXY_ERROR'});}
}
