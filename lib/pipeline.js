(function(root,factory){
  if(typeof module==='object'&&module.exports){module.exports=factory();}
  else{root.JuKaPipeline=factory();}
})(typeof self!=='undefined'?self:this,function(){
  function n(v,fallback=null){if(v===null||v===undefined||v==='')return fallback;const x=Number(v);return Number.isFinite(x)?x:fallback;}
  function normalizeMarket(raw={},stock={}){
    const values=(raw.values||raw.prices||[]).map(x=>({date:String(x.datetime||x.date||'').slice(0,10),open:n(x.open),high:n(x.high),low:n(x.low),close:n(x.close??x.price),volume:n(x.volume)})).filter(x=>x.date&&Number.isFinite(x.close)).sort((a,b)=>a.date.localeCompare(b.date));
    return {symbol:stock.s||stock.symbol||raw.meta?.symbol||raw.symbol||null,currency:raw.meta?.currency||stock.currency||null,exchange:raw.meta?.exchange||stock.m||null,prices:values,source:raw.source||'market-adapter',status:raw.status||'ok',asOf:values.at(-1)?.date||null};
  }
  function normalizeFundamentals(raw={},stock={}){
    const annual=(raw.annual||[]).map(x=>({...x,fy:x.fy??(x.date?Number(String(x.date).slice(0,4)):null),date:x.date||null,filed:x.filed||null,accepted:x.accepted||null,publishedDate:x.publishedDate||null,availableFrom:x.availableFrom||null,revenue:n(x.revenue),operatingIncome:n(x.operatingIncome),netIncome:n(x.netIncome),eps:n(x.eps),cfo:n(x.cfo),capex:n(x.capex),fcf:n(x.fcf),cash:n(x.cash),debt:n(x.debt),shares:n(x.shares),da:n(x.da),sbc:n(x.sbc),interestExpense:n(x.interestExpense),pretaxIncome:n(x.pretaxIncome),incomeTax:n(x.incomeTax),equity:n(x.equity),netCash:n(x.netCash),nwc:n(x.nwc),deltaNwc:n(x.deltaNwc),rd:n(x.rd),researchAndDevelopment:n(x.researchAndDevelopment),affo:n(x.affo),ffo:n(x.ffo),isTTM:!!x.isTTM,ttmSource:x.ttmSource||null,isOverviewFallback:!!x.isOverviewFallback})).filter(x=>x.date).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    return {symbol:stock.s||stock.symbol||raw.symbol||null,name:raw.name||stock.n||null,annual,source:raw.source||'fundamentals-adapter',status:raw.status||'ok',warning:raw.warning||null,providerCode:raw.providerCode||null,
      asOf:annual.at(-1)?.accepted||annual.at(-1)?.filed||annual.at(-1)?.publishedDate||annual.at(-1)?.availableFrom||null};
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
    const historical=core.buildHistoricalValuationSeries
      ? core.buildHistoricalValuationSeries(stock,m.prices.map(x=>({date:x.date,price:x.close})),derived,stock.overrides||{})
      : (model==='operating-company'?core.buildHistoricalJukaFairSeries(m.prices.map(x=>({date:x.date,price:x.close})),derived,{wacc:.09,terminalGrowth:.025}):[]);
    const historicalPlausibility=core.jukaHistoricalValuationAudit?core.jukaHistoricalValuationAudit(historical):null;
    const historicalIntegrity=core.jukaHistoricalIntegrityAudit?core.jukaHistoricalIntegrityAudit(historical):null;
    const fairValueIntegrity={
      dataStatus:dataQuality?.score>=80?'gut':dataQuality?.score>=60?'mittel':'schwach',
      currentBasis:latest?.isTTM?'TTM':'FY',
      releaseStatus:engine.release?.status||null,
      liveReady:engine.release?.liveReady===true,
      historicalStatus:historicalIntegrity?.status||null,
      crossCheckDispersion:engine.fairValue2?.checks?.crossCheckDispersion??null,
      cashConversion:engine.fairValue2?.checks?.cashConversion??null,
      status:historicalIntegrity?.status==='nicht belastbar'?'nicht belastbar':engine.release?.liveReady===true?'belastbar':'prüfen'
    };
    const fairValue=valuation?.base??null;
    const reality=core.jukaRealityCheck({model,price,fairValue,qualityScore:quality?.score,relative,reverse});
    const riskAudit=core.jukaRiskAudit({model,price,valuation,quality,readiness:modelReadiness,dataQuality,reverse});
    const warnings=[];
    if(!m.prices.length)warnings.push('Keine Marktdaten');
    if(!latest)warnings.push(f.warning||'Keine Fundamentaldaten');
    if(f.status&&f.status!=='ok')warnings.push(`Fundamentals: ${f.status}`);
    if(latest&&!modelReadiness.ready)warnings.push(`Modell ${model} nicht bewertungsbereit: ${modelReadiness.missingRequired.join(', ')}`);
    if(historicalIntegrity?.status==='nicht belastbar')warnings.push('Historische Fair-Value-Reihe hat einen Integritätsfehler.');
    else if(historicalIntegrity?.status==='prüfen')warnings.push('Historische Fair-Value-Reihe enthält ungewöhnlich große Sprünge.');
    const analysisStatus=!m.prices.length?(latest?'fundamentals-only':'unavailable'):!latest?'market-only':modelReadiness.ready?'complete':'partial';
    const valuationStatus=valuation&&Number.isFinite(Number(valuation.base))?'ready':modelReadiness.ready?'calculation-unavailable':'missing-model-data';
    return {stock:{...stock},model,modelReadiness,valuationStatus,price,currency:m.currency,exchange:m.exchange,market:m,fundamentals:f,derived,latest,quality,valuation,relative,reverse,dataQuality,companyProfile,autoAssumptions,forecast,forecastScenarios,returnBridge,returnMatrix,multiples,historical,historicalPlausibility,historicalIntegrity,fairValueIntegrity,reality,riskAudit,engineAssumptions:engine.assumptions,
      fairValue2:engine.fairValue2||null,valuationMethods:engine.valuationMethods||null,release:engine.release||null,stability:engine.stability||null,
      plausibility:engine.plausibility||null,audit:engine.audit||null,economicAudit:engine.economicAudit||null,forecastFeasibility:engine.forecastFeasibility||null,
      excessReturn:engine.excessReturn||null,engineDiagnostics:engine.diagnostics||[],
      analysisStatus,warnings:[...new Set(warnings)],provenance:{market:{source:m.source,asOf:m.asOf,status:m.status},fundamentals:{source:f.source,asOf:f.asOf,status:f.status,providerCode:f.providerCode}},
      dataCoverage:{annualYears:derived.length,pricePoints:m.prices.length,hasPrice:Number.isFinite(price),hasFundamentals:!!latest,modelReady:modelReadiness.ready}};
  }
  function createPipeline({marketAdapter,fundamentalsAdapter,profileAdapter=null,cache=new Map(),ttlMs=21600000,core,allowPartial=true}={}){
    if(typeof marketAdapter!=='function'||typeof fundamentalsAdapter!=='function')throw new Error('marketAdapter und fundamentalsAdapter sind erforderlich');
    async function load(stock,{force=false}={}){
      const key=[
        String(stock.s||stock.symbol||'').toUpperCase(),
        String(stock.region||'').toUpperCase(),
        String(stock.marketSymbol||stock.market_symbol||'').toUpperCase(),
        String(stock.currency||'').toUpperCase(),
        String(stock.valuationModel||stock.model||'').toLowerCase()
      ].join('|'),now=Date.now(),hit=cache.get(key);
      if(!force&&hit&&now-hit.time<ttlMs)return {...hit.value,cacheHit:true};
      const started=Date.now();
      const marketStarted=Date.now();
      const marketPromise=Promise.resolve().then(()=>marketAdapter(stock)).then(value=>({value,ms:Date.now()-marketStarted}));
      const fundamentalsStarted=Date.now();
      const fundamentalsPromise=Promise.resolve().then(()=>fundamentalsAdapter(stock))
        .then(value=>({value,ms:Date.now()-fundamentalsStarted}))
        .catch(e=>{
          if(!allowPartial)throw e;
          return {value:{symbol:stock.s||stock.symbol,name:stock.n||stock.name,annual:[],source:'fundamentals unavailable',status:'unavailable',warning:e.message||String(e),providerCode:e.code||'FUNDAMENTALS_ERROR'},ms:Date.now()-fundamentalsStarted,error:e};
        });
      const profileStarted=Date.now();
      const profilePromise=profileAdapter
        ? Promise.resolve().then(()=>profileAdapter(stock)).then(value=>({value,ms:Date.now()-profileStarted})).catch(e=>({value:{status:'unavailable',warning:e.message||String(e)},ms:Date.now()-profileStarted,error:e}))
        : Promise.resolve({value:null,ms:0});
      let marketResult;
      try{marketResult=await marketPromise;}
      catch(e){
        if(!allowPartial)throw e;
        marketResult={value:{values:[],source:'market unavailable',status:'unavailable',warning:e.message||String(e),providerCode:e.code||'MARKET_ERROR'},ms:Date.now()-marketStarted,error:e};
      }
      const [fundamentalsResult,profileResult]=await Promise.all([fundamentalsPromise,profilePromise]);
      const market=marketResult.value,fundamentals=fundamentalsResult.value,profile=profileResult.value;
      const value=buildSnapshot(stock,market,fundamentals,core);if(profile)value.profile=profile;
      value.timings={marketMs:marketResult.ms,fundamentalsMs:fundamentalsResult.ms,profileMs:profileResult.ms,totalMs:Date.now()-started,parallelAdapters:true};
      cache.set(key,{time:now,value});return {...value,cacheHit:false};
    }
    return {load,cache,clear:(symbol)=>{
      if(!symbol)return cache.clear();
      const prefix=String(symbol).toUpperCase()+'|';
      for(const k of cache.keys())if(String(k).startsWith(prefix))cache.delete(k);
    }};
  }
  return {normalizeMarket,normalizeFundamentals,buildSnapshot,createPipeline};
});
