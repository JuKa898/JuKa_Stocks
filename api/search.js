function fetchWithTimeout(url,options={},ms=15000){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
  return fetch(url,{...options,signal:c.signal}).finally(()=>clearTimeout(t));
}
const cache={time:0,rows:null,source:null},TTL=86400000;
const UA=()=>process.env.SEC_USER_AGENT||'JUKA research app contact@example.com';

function cleanStockRows(j){
  const raw=Array.isArray(j?.data)?j.data:[];
  const allowedType=x=>{
    const t=String(x?.type||x?.instrument_type||'').toLowerCase();
    return !t||t.includes('common stock')||t==='stock'||t.includes('reit')||t.includes('depositary receipt')||t.includes('adr');
  };
  return raw.filter(x=>x?.symbol&&x?.name&&allowedType(x))
    .filter(x=>['united states','usa','us'].includes(String(x.country||'').toLowerCase()))
    .filter(x=>{const a=x.access||{},p=String(a.plan||a.global||'Basic').toLowerCase();return !p||p==='basic'})
    .map(x=>({symbol:String(x.symbol).toUpperCase(),name:String(x.name).trim(),exchange:String(x.exchange||'US'),country:'USA',currency:String(x.currency||'USD'),region:'US',marketSymbol:String(x.symbol).toUpperCase()}));
}
function cleanSecRows(j){
  if(!Array.isArray(j?.fields)||!Array.isArray(j?.data))return [];
  const ix=Object.fromEntries(j.fields.map((f,i)=>[String(f).toLowerCase(),i]));
  const allowedEx=e=>/NASDAQ|NYSE|AMEX|CBOE|IEX/i.test(String(e||''));
  const bad=s=>/(?:-WT|-W|-UN|-RI|-WS)$/.test(s)||(/[WUR]$/.test(s)&&s.length>5)||/\^/.test(s);
  return j.data.map(r=>({cik:r[ix.cik],name:r[ix.name],symbol:String(r[ix.ticker]||'').toUpperCase(),exchange:r[ix.exchange]}))
    .filter(x=>x.symbol&&x.name&&allowedEx(x.exchange)&&!bad(x.symbol))
    .map(x=>({symbol:x.symbol,name:String(x.name).trim(),exchange:String(x.exchange||'US'),country:'USA',currency:'USD',region:'US',marketSymbol:x.symbol,cik:x.cik}));
}
function dedupe(rows){const seen=new Set(),out=[];for(const x of rows){if(!seen.has(x.symbol)){seen.add(x.symbol);out.push(x)}}return out}
async function loadUniverse(){
  if(cache.rows&&Date.now()-cache.time<TTL)return cache;
  const key=process.env.TWELVE_DATA_API_KEY;
  if(key){
    try{
      const u=new URL('https://api.twelvedata.com/stocks');u.searchParams.set('country','United States');u.searchParams.set('show_plan','true');
      const r=await fetchWithTimeout(u,{headers:{Authorization:`apikey ${key}`}}),j=await r.json();
      if(r.ok&&j?.status!=='error'){const rows=dedupe(cleanStockRows(j));if(rows.length){cache.rows=rows;cache.source='Twelve Data Basic /stocks';cache.time=Date.now();return cache}}
    }catch(e){console.warn('Twelve Data catalog fallback:',e.message)}
  }
  const r=await fetchWithTimeout('https://www.sec.gov/files/company_tickers_exchange.json',{headers:{'User-Agent':UA(),'Accept-Encoding':'gzip, deflate'}});
  if(!r.ok)throw new Error('SEC ticker directory '+r.status);
  cache.rows=dedupe(cleanSecRows(await r.json()));cache.source='SEC exchange directory fallback';cache.time=Date.now();return cache;
}

const KNOWN_BANKS=new Set(['JPM','BAC','C','WFC','GS','MS','USB','PNC','TFC','BK','STT','FITB','HBAN','RF','CFG','KEY','MTB','NTRS','ZION','CMA']);
const KNOWN_REITS=new Set(['O','PLD','AMT','EQIX','WELL','SPG','PSA','DLR','VICI','CCI','AVB','EQR','ESS','MAA','CPT','INVH','EXR','CUBE','REG','FRT','KIM','NNN','ADC','WPC','ARE','REXR','TRNO']);
function inferModel(x){
  const s=String(x?.symbol||'').toUpperCase(),n=String(x?.name||'').toLowerCase();
  if(KNOWN_BANKS.has(s)||/\b(bank|bancorp|bancshares)\b/.test(n))return 'bank-insurance';
  if(KNOWN_REITS.has(s)||/\breit\b/.test(n))return 'reit';
  return '';
}
function withModelHint(x){const model=inferModel(x);return model?{...x,valuationModel:model,sector:model==='reit'?'REIT':'Bank'}:x}

function rank(x,q){const s=x.symbol.toLowerCase(),n=x.name.toLowerCase();if(s===q)return 0;if(s.startsWith(q))return 1;if(n.startsWith(q))return 2;if(s.includes(q))return 3;if(n.includes(q))return 4;return 99}
module.exports=async function handler(req,res){
  try{
    const u=await loadUniverse(),q=String(req.query?.q||'').trim().toLowerCase(),limit=Math.max(1,Math.min(20,Number(req.query?.limit)||12));
    res.setHeader('Cache-Control','s-maxage=86400, stale-while-revalidate=86400');
    if(req.query?.action==='count'||!q)return res.status(200).json({count:u.rows.length,source:u.source,scope:'US equities available to free catalog'});
    const data=u.rows.map(x=>({x,score:rank(x,q)})).filter(v=>v.score<99).sort((a,b)=>a.score-b.score||a.x.symbol.localeCompare(b.x.symbol)).slice(0,limit).map(v=>withModelHint(v.x));
    return res.status(200).json({count:u.rows.length,data,source:u.source});
  }catch(e){return res.status(500).json({error:e.message,code:'SEARCH_UNIVERSE_ERROR'});}
};
module.exports._test={cleanStockRows,cleanSecRows,dedupe,rank,inferModel,withModelHint};
