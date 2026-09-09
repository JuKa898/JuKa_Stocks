const EU=require('../lib/eu-fundamentals');
const Symbols=require('../lib/symbols');
module.exports=async function handler(req,res){
  try{
    const q=req.query||{};
    const stock={s:String(q.symbol||'SAP').toUpperCase(),n:q.name||undefined,region:'EU',marketSymbol:q.market_symbol||q.symbol||'SAP:XETR'};
    const resolved=Symbols.resolveSymbol(stock),out=await EU.alphaVantageFundamentals(stock);
    out.symbolResolution=resolved;
    res.setHeader('Cache-Control','s-maxage=86400, stale-while-revalidate=172800');
    return res.status(200).json(out);
  }catch(e){
    const status=e.code==='ALPHA_RATE_LIMIT'?429:e.code==='ALPHA_SYMBOL_ERROR'?404:502;
    return res.status(status).json({error:e.message,code:e.code||'EU_FUNDAMENTALS_ERROR'});
  }
};
