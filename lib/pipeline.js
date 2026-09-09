(function(root,factory){
  if(typeof module==='object'&&module.exports){module.exports=factory();}
  else{root.JuKaPipeline=factory();}
})(typeof self!=='undefined'?self:this,function(){
  function n(v,fallback=null){const x=Number(v);return Number.isFinite(x)?x:fallback;}
  function normalizeMarket(raw={},stock={}){
    const values=(raw.values||raw.prices||[]).map(x=>({date:String(x.datetime||x.date||'').slice(0,10),open:n(x.open),high:n(x.high),low:n(x.low),close:n(x.close??x.price),volume:n(x.volume)})).filter(x=>x.date&&Number.isFinite(x.close)).sort((a,b)=>a.date.localeCompare(b.date));
    return {symbol:stock.s||stock.symbol||raw.meta?.symbol||raw.symbol||null,currency:raw.meta?.currency||stock.currency||null,exchange:raw.meta?.exchange||stock.m||null,prices:values,source:raw.source||'market-adapter',status:raw.status||'ok',asOf:values.at(-1)?.date||null};
  }
  function normalizeFundamentals(raw={},stock={}){
    const annual=(raw.annual||[]).map(x=>({...x,fy:x.fy??(x.date?Number(String(x.date).slice(0,4)):null),date:x.date||null,filed:x.filed||x.date||null,revenue:n(x.revenue),operatingIncome:n(x.operatingIncome),netIncome:n(x.netIncome),eps:n(x.eps),cfo:n(x.cfo),capex:n(x.capex),fcf:n(x.fcf),cash:n(x.cash),debt:n(x.debt),shares:n(x.shares),da:n(x.da),sbc:n(x.sbc),interestExpense:n(x.interestExpense),pretaxIncome:n(x.pretaxIncome),incomeTax:n(x.incomeTax),equity:n(x.equity),deltaNwc:n(x.deltaNwc),affo:n(x.affo),ffo:n(x.ffo)})).filter(x=>x.date).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    return {symbol:stock.s||stock.symbol||raw.symbol||null,name:raw.name||stock.n||null,annual,source:raw.source||'fundamentals-adapter',status:raw.status||'ok',warning:raw.warning||null,providerCode:raw.providerCode||null,asOf:annual.at(-1)?.filed||annual.at(-1)?.date||null};
  }
  function buildSnapshot(stock={},market={},fundamentals={},core){
    if(!core)throw new Error('JuKaCore wird benötigt');
    const m=normalizeMarket(market,stock),f=normalizeFundamentals(fundamentals,stock),derived=core.deriveFundamentals(f.annual),latest=derived.at(-1)||null,price=m.prices.at(-1)?.close??null,model=core.classifyValuationModel(stock);
    const engine=core.jukaValuationEngine(stock,derived,price,stock.overrides||{});
    const modelReadiness=engine.readiness,quality=engine.quality,valuation=engine.valuation,relativeEngine=engine.relative,reverse=engine.reverse;
    let relative=relativeEngine;
    const dataQuality=core.jukaDataQuality(derived);
    const companyProfile=core.jukaCompanyProfile(derived);
    const autoAssumptions=model==='operating-company'&&modelReadiness.ready?core.jukaAutoAssumptions(derived,stock.overrides||{}):null;
    const forecast=model==='operating-company'&&modelReadiness.ready?core.jukaForecast5Y(derived,autoAssumptions?.assumptions||{}):null;
    const forecastScenarios=model==='operating-company'&&modelReadiness.ready?core.jukaForecastScenarios(derived,autoAssumptions?.assumptions||{}):null;
    if(model==='operating-company'&&forecast?.summary?.epsY5){
      relative=core.jukaRelativeByModel(model,{price,epsTtm:latest?.eps,epsY5:forecast.summary.epsY5,fairValue:valuation?.base});
    }
    const returnBridge=model==='operating-company'&&forecast?.summary?.epsY5?core.jukaReturnBridge({price,epsTtm:latest?.eps,epsY5:forecast.summary.epsY5,fairValue:valuation?.base}):null;
    const returnMatrix=model==='operating-company'&&forecastScenarios?core.jukaExpectedReturnMatrix({price,epsTtm:latest?.eps,scenarios:forecastScenarios,fairValues:{bear:valuation?.bear,base:valuation?.base,bull:valuation?.bull}}):null;
    const multiples=core.valuationMultiplesFromSnapshot({price,latest});
    const historical=model==='operating-company'
      ? core.buildHistoricalJukaFairSeries(m.prices.map(x=>({date:x.date,price:x.close})),derived,{wacc:.09,terminalGrowth:.025})
      : [];
    const fairValue=valuation?.base??null;
    const reality=core.jukaRealityCheck({model,price,fairValue,qualityScore:model==='operating-company'?quality?.score:null,relative,reverse});
    const riskAudit=core.jukaRiskAudit({model,price,valuation,quality,readiness:modelReadiness,dataQuality,reverse});
    const warnings=[];
    if(!m.prices.length)warnings.push('Keine Marktdaten');
    if(!latest)warnings.push(f.warning||'Keine Fundamentaldaten');
    if(f.status&&f.status!=='ok')warnings.push(`Fundamentals: ${f.status}`);
    if(latest&&!modelReadiness.ready)warnings.push(`Modell ${model} nicht bewertungsbereit: ${modelReadiness.missingRequired.join(', ')}`);
    const analysisStatus=!m.prices.length?'unavailable':!latest?'market-only':modelReadiness.ready?'complete':'partial';
    const valuationStatus=valuation&&Number.isFinite(Number(valuation.base))?'ready':modelReadiness.ready?'calculation-unavailable':'missing-model-data';
    return {stock:{...stock},model,modelReadiness,valuationStatus,price,currency:m.currency,exchange:m.exchange,market:m,fundamentals:f,derived,latest,quality,valuation,relative,reverse,dataQuality,companyProfile,autoAssumptions,forecast,forecastScenarios,returnBridge,returnMatrix,multiples,historical,reality,riskAudit,engineAssumptions:engine.assumptions,
      analysisStatus,warnings:[...new Set(warnings)],provenance:{market:{source:m.source,asOf:m.asOf,status:m.status},fundamentals:{source:f.source,asOf:f.asOf,status:f.status,providerCode:f.providerCode}},
      dataCoverage:{annualYears:derived.length,pricePoints:m.prices.length,hasPrice:Number.isFinite(price),hasFundamentals:!!latest,modelReady:modelReadiness.ready}};
  }
  function createPipeline({marketAdapter,fundamentalsAdapter,profileAdapter=null,cache=new Map(),ttlMs=21600000,core,allowPartial=true}={}){
    if(typeof marketAdapter!=='function'||typeof fundamentalsAdapter!=='function')throw new Error('marketAdapter und fundamentalsAdapter sind erforderlich');
    async function load(stock,{force=false}={}){
      const key=String(stock.s||stock.symbol||'').toUpperCase(),now=Date.now(),hit=cache.get(key);
      if(!force&&hit&&now-hit.time<ttlMs)return {...hit.value,cacheHit:true};
      const market=await marketAdapter(stock); // price history is mandatory
      let fundamentals,profile=null;
      try{fundamentals=await fundamentalsAdapter(stock);}
      catch(e){
        if(!allowPartial)throw e;
        fundamentals={symbol:stock.s||stock.symbol,name:stock.n||stock.name,annual:[],source:'fundamentals unavailable',status:'unavailable',warning:e.message||String(e),providerCode:e.code||'FUNDAMENTALS_ERROR'};
      }
      if(profileAdapter){try{profile=await profileAdapter(stock)}catch(e){profile={status:'unavailable',warning:e.message||String(e)}}}
      const value=buildSnapshot(stock,market,fundamentals,core);if(profile)value.profile=profile;
      cache.set(key,{time:now,value});return {...value,cacheHit:false};
    }
    return {load,cache,clear:(symbol)=>symbol?cache.delete(String(symbol).toUpperCase()):cache.clear()};
  }
  return {normalizeMarket,normalizeFundamentals,buildSnapshot,createPipeline};
});
