(function(root,factory){
  if(typeof module==='object'&&module.exports){module.exports=factory();}
  else{root.JuKaCore=factory();}
})(typeof self!=='undefined'?self:this,function(){
  function n(v,fallback=0){const x=Number(v);return Number.isFinite(x)?x:fallback;}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  function median(values){const a=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
  function cagr(start,end,years){start=n(start);end=n(end);years=n(years);if(start<=0||end<=0||years<=0)return null;return Math.pow(end/start,1/years)-1;}
  function valuationPct(price,fair){price=n(price,NaN);fair=n(fair,NaN);if(!Number.isFinite(price)||!Number.isFinite(fair)||fair===0)return null;return (price/fair-1)*100;}

  // 10-point generic quality engine. Max 100. Transparent and intentionally conservative.
  function qualityScore(m={}){
    const parts=[]; let score=0;
    function add(label,points,max,reason){points=clamp(n(points),0,max);score+=points;parts.push({label,points,max,reason});}
    const roic=n(m.roic,NaN), opm=n(m.operatingMargin,NaN), rg=n(m.revenueCagr3y,NaN), eg=n(m.epsCagr3y,NaN), fcfm=n(m.fcfMargin,NaN), nde=n(m.netDebtToEbit,NaN), dilution=n(m.shareCagr3y,NaN);
    add('ROIC / Kapitalrendite',Number.isFinite(roic)?(roic>=.20?20:roic>=.12?16:roic>=.08?11:roic>=.04?6:2):8,20,Number.isFinite(roic)?`${(roic*100).toFixed(1)}%`:'nicht verfügbar');
    add('EBIT-Marge',Number.isFinite(opm)?(opm>=.30?15:opm>=.20?13:opm>=.12?10:opm>=.06?6:3):7,15,Number.isFinite(opm)?`${(opm*100).toFixed(1)}%`:'nicht verfügbar');
    add('Umsatzwachstum',Number.isFinite(rg)?(rg>=.15?15:rg>=.08?12:rg>=.03?9:rg>=0?6:2):7,15,Number.isFinite(rg)?`${(rg*100).toFixed(1)}% CAGR`:'nicht verfügbar');
    add('Gewinnwachstum',Number.isFinite(eg)?(eg>=.15?15:eg>=.08?12:eg>=.03?9:eg>=0?6:2):7,15,Number.isFinite(eg)?`${(eg*100).toFixed(1)}% CAGR`:'nicht verfügbar');
    add('Cashflow-Qualität',Number.isFinite(fcfm)?(fcfm>=.20?15:fcfm>=.12?12:fcfm>=.06?9:fcfm>0?6:1):7,15,Number.isFinite(fcfm)?`${(fcfm*100).toFixed(1)}% FCF-Marge`:'nicht verfügbar');
    add('Bilanzqualität',Number.isFinite(nde)?(nde<=0?10:nde<=1?9:nde<=2?7:nde<=3?5:2):5,10,Number.isFinite(nde)?`${nde.toFixed(1)}× Net Debt / EBIT`:'nicht verfügbar');
    add('Verwässerung',Number.isFinite(dilution)?(dilution<=0?10:dilution<=.01?8:dilution<=.03?5:2):5,10,Number.isFinite(dilution)?`${(dilution*100).toFixed(1)}% Aktien-CAGR`:'nicht verfügbar');
    const grade=score>=85?'A':score>=70?'B':score>=55?'C':score>=40?'D':'E';
    const label=score>=85?'Exzellent':score>=70?'Stark':score>=55?'Solide':score>=40?'Durchschnittlich':'Schwach';
    return {score:Math.round(score),grade,label,parts};
  }

  // Simplified FCFF DCF for generic cross-stock use. Assumptions are explicit and user-overridable.
  function dcfFairValue(input={}){
    const fcf0=n(input.fcf0), growth=n(input.growth,.08), fadeGrowth=n(input.fadeGrowth,.04), wacc=n(input.wacc,.09), terminalGrowth=n(input.terminalGrowth,.025), years=Math.max(1,Math.round(n(input.years,10))), netCash=n(input.netCash), shares=n(input.shares);
    if(fcf0<=0||shares<=0||wacc<=terminalGrowth)return null;
    let pv=0, fcf=fcf0;
    for(let y=1;y<=years;y++){
      const t=(y-1)/Math.max(1,years-1); const g=growth+(fadeGrowth-growth)*t; fcf*=1+g; pv+=fcf/Math.pow(1+wacc,y);
    }
    const terminal=fcf*(1+terminalGrowth)/(wacc-terminalGrowth); pv+=terminal/Math.pow(1+wacc,years);
    return (pv+netCash)/shares;
  }
  function scenarioValues(baseInput={}){
    const base=dcfFairValue(baseInput); if(base==null)return null;
    const bear=dcfFairValue({...baseInput,growth:n(baseInput.growth,.08)-.03,fadeGrowth:n(baseInput.fadeGrowth,.04)-.015,wacc:n(baseInput.wacc,.09)+.015,terminalGrowth:Math.max(.01,n(baseInput.terminalGrowth,.025)-.005)});
    const bull=dcfFairValue({...baseInput,growth:n(baseInput.growth,.08)+.03,fadeGrowth:n(baseInput.fadeGrowth,.04)+.015,wacc:Math.max(.055,n(baseInput.wacc,.09)-.01),terminalGrowth:Math.min(.04,n(baseInput.terminalGrowth,.025)+.005)});
    return {bear,base,bull};
  }
  function filterPeriod(rows,period){const months={"1Y":12,"3Y":36,"5Y":60,"MAX":9999}[period]||60;return rows.slice(Math.max(0,rows.length-months-1));}
  function buildFairSeries(priceRows, annualFacts, assumptions={}){
    if(!Array.isArray(priceRows)||!priceRows.length)return [];
    const facts=(annualFacts||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    return priceRows.map(row=>{
      const d=String(row.date); let fact=null; for(const f of facts){if(String(f.date)<=d)fact=f;else break;}
      if(!fact)return {...row,base:null,bear:null,bull:null};
      const growth=Number.isFinite(fact.revenueCagr3y)?clamp(fact.revenueCagr3y,-.02,.22):n(assumptions.growth,.08);
      const input={fcf0:n(fact.fcf),growth,fadeGrowth:n(assumptions.fadeGrowth,.04),wacc:n(assumptions.wacc,.09),terminalGrowth:n(assumptions.terminalGrowth,.025),years:n(assumptions.years,10),netCash:n(fact.netCash),shares:n(fact.shares)};
      const s=scenarioValues(input); return {...row,base:s?.base??null,bear:s?.bear??null,bull:s?.bull??null};
    });
  }
  return {n,clamp,median,cagr,valuationPct,qualityScore,dcfFairValue,scenarioValues,filterPeriod,buildFairSeries};
});
