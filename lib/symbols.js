const EU_EXCHANGE_SUFFIX={
  XETR:'Xetra',EPA:'Euronext Paris',AMS:'Euronext Amsterdam',CPH:'Nasdaq Copenhagen',
  SIX:'SIX Swiss Exchange',LSE:'London Stock Exchange'
};
const ALPHA_VANTAGE_SUFFIX={
  XETR:'DEX', EPA:'PAR', AMS:'AMS', CPH:'CPH', SIX:'SWX', LSE:'LON'
};
// Provider-specific symbols verified/retained for important curated EU names.
// Unknown names still use exchange suffix mapping and can be resolved by SYMBOL_SEARCH fallback.
const ALPHA_VANTAGE_OVERRIDES={
  'ENR:XETR':'ENR.DEX',
  'MBG:XETR':'MBG.DEX',
  'ASML:AMS':'ASML.AMS',
  'NOVO-B:CPH':'NOVO-B.CPH'
};
function upper(v){return String(v||'').trim().toUpperCase()}
function secSymbol(symbol){return upper(symbol).replace(/\./g,'-')}
function normalizeRegion(region,marketSymbol=''){
  const r=upper(region); if(r)return r;
  return upper(marketSymbol).includes(':')?'EU':'US';
}

function alphaVantageSymbol(input={}){
  const display=upper(input.s||input.symbol);
  const market=upper(input.marketSymbol||input.market_symbol||display);
  if(!market.includes(':'))return display;
  if(ALPHA_VANTAGE_OVERRIDES[market])return ALPHA_VANTAGE_OVERRIDES[market];
  const [ticker,exchange]=market.split(':');
  const suffix=ALPHA_VANTAGE_SUFFIX[exchange];
  return suffix?`${ticker}.${suffix}`:null;
}

function resolveSymbol(input={}){
  const display=upper(input.s||input.symbol);
  const market=String(input.marketSymbol||input.market_symbol||display).trim().toUpperCase();
  const region=normalizeRegion(input.region,market);
  const suffix=market.includes(':')?market.split(':').at(-1):null;
  return {
    displaySymbol:display,
    marketSymbol:market,
    secSymbol:region==='US'?secSymbol(display):null,
    region,
    exchangeHint:suffix?EU_EXCHANGE_SUFFIX[suffix]||suffix:null,
    fundamentalsProvider:region==='US'?'SEC':'ALPHA_VANTAGE',
    alphaVantageSymbol:region==='EU'?alphaVantageSymbol(input):null,
    marketProvider:'TWELVE_DATA'
  };
}
module.exports={resolveSymbol,secSymbol,normalizeRegion,alphaVantageSymbol,EU_EXCHANGE_SUFFIX,ALPHA_VANTAGE_SUFFIX,ALPHA_VANTAGE_OVERRIDES};
