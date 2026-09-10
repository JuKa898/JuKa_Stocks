(function(root,factory){
  if(typeof module==='object'&&module.exports){module.exports=factory();}
  else{root.JuKaCore=factory();}
})(typeof self!=='undefined'?self:this,function(){
  function n(v,fallback=0){const x=Number(v);return Number.isFinite(x)?x:fallback;}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  function median(values){const a=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
  function cagr(start,end,years){start=n(start);end=n(end);years=n(years);if(start<=0||end<=0||years<=0)return null;return Math.pow(end/start,1/years)-1;}
  function valuationPct(price,fair){price=n(price,NaN);fair=n(fair,NaN);if(!Number.isFinite(price)||!Number.isFinite(fair)||fair===0)return null;return (price/fair-1)*100;}

  // Generic score retained as a fallback for live datasets that do not yet expose all Excel inputs.
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

  // Exact score thresholds/weights from Aktienanalyse_1.0_JuKa_Meta.xlsx / Quality_Score.
  function jukaQualityScore(m={}){
    const defs=[
      {key:'roic',label:'ROIC TTM',weight:.15,fmt:'pct',score:v=>v>=.20?10:v>=.15?8:v>=.10?6:v>=.05?3:0},
      {key:'ebitMargin',label:'EBIT-Marge TTM',weight:.10,fmt:'pct',score:v=>v>=.20?10:v>=.15?8:v>=.10?6:v>=.05?3:0},
      {key:'revenueCagr5y',label:'Umsatz-CAGR 5J',weight:.10,fmt:'pct',score:v=>v>=.15?10:v>=.10?8:v>=.05?6:v>=0?3:0},
      {key:'fcfCagr5y',label:'FCF-CAGR 5J',weight:.10,fmt:'pct',score:v=>v>=.15?10:v>=.10?8:v>=.05?6:v>=0?3:0},
      {key:'fcfConversion',label:'FCF Conversion',weight:.10,fmt:'pct',score:v=>v>=1?10:v>=.8?8:v>=.6?6:v>=.4?3:0},
      {key:'sbcToRevenue',label:'SBC / Umsatz',weight:.08,fmt:'pct',lower:true,score:v=>v<=.01?10:v<=.02?8:v<=.04?6:v<=.07?3:0},
      {key:'netDebtToEbitda',label:'Net Debt / EBITDA',weight:.12,fmt:'x',lower:true,score:v=>v<=0?10:v<=1?8:v<=2?6:v<=3?3:0},
      {key:'interestCoverage',label:'Interest Coverage',weight:.08,fmt:'x',score:v=>v>=15?10:v>=8?8:v>=4?6:v>=2?3:0},
      {key:'dilutionPa',label:'Aktienverwässerung p.a.',weight:.10,fmt:'pct',lower:true,score:v=>v<=0?10:v<=.01?8:v<=.02?6:v<=.04?3:0},
      {key:'roicTrend',label:'ROIC-Trend',weight:.07,fmt:'pp',score:v=>v>=.05?10:v>=.02?8:v>=0?6:v>=-.02?3:0}
    ];
    let total=0; const parts=[];
    for(const d of defs){
      const rawValue=m[d.key]; const v=(rawValue===null||rawValue===undefined||rawValue==='')?NaN:Number(rawValue); const available=Number.isFinite(v); const raw=available?d.score(v):0; const weighted=raw*d.weight*10; total+=weighted;
      let reason='nicht verfügbar'; if(available){reason=d.fmt==='x'?`${v.toFixed(1)}×`:d.fmt==='pp'?`${(v*100).toFixed(1)} pp`:`${(v*100).toFixed(1)}%`;}
      parts.push({key:d.key,label:d.label,value:available?v:null,weight:d.weight,rawScore:raw,weightedScore:weighted,max:d.weight*100,reason});
    }
    const score=Math.round(total*10)/10;
    const grade=score>=85?'A':score>=70?'B':score>=55?'C':score>=40?'D':'E';
    const label=score>=85?'Exzellent':score>=70?'Stark':score>=55?'Solide':score>=40?'Schwach':'Problematisch';
    const interpretation=score>=70?'Starkes Unternehmen – historische Profitabilität, Wachstum, Cashflow und Bilanz sind insgesamt überzeugend.':score>=55?'Solides Unternehmen – Qualität ist ordentlich, aber einzelne Bereiche sollten geprüft werden.':'Qualität ist schwach oder uneinheitlich – Ursachen genauer prüfen.';
    return {score,grade,label,interpretation,parts};
  }


  // JuKa Quality 2.0: model-aware, coverage-aware and intentionally less punitive.
  // Missing metrics do not score zero; available factors are reweighted and confidence is shown separately.


  function jukaPerformanceWindows(prices=[]){
    const rows=(prices||[]).map(x=>({date:new Date(x.date||x.datetime),price:Number(x.price??x.close)}))
      .filter(x=>!Number.isNaN(x.date.getTime())&&Number.isFinite(x.price)&&x.price>0).sort((a,b)=>a.date-b.date);
    if(!rows.length)return {};
    const latest=rows.at(-1),day=86400000;
    const closestBefore=target=>{
      let best=rows[0];
      for(const r of rows){if(r.date<=target)best=r;else break;}
      return best;
    };
    const calc=(label,target)=>{
      const base=target==='MAX'?rows[0]:closestBefore(target);
      if(!base||base===latest||!Number.isFinite(base.price))return {label,value:null,pct:null,from:base?.date||null,to:latest.date};
      return {label,value:latest.price-base.price,pct:(latest.price/base.price-1)*100,from:base.date,to:latest.date};
    };
    const ago=(days,months=0,years=0)=>{let d=new Date(latest.date);if(years)d.setFullYear(d.getFullYear()-years);if(months)d.setMonth(d.getMonth()-months);if(days)d=new Date(d.getTime()-days*day);return d;};
    return {
      day:calc('1T',ago(1)),week:calc('1W',ago(7)),month:calc('1M',ago(0,1)),
      threeMonths:calc('3M',ago(0,3)),year:calc('1J',ago(0,0,1)),threeYears:calc('3J',ago(0,0,3)),max:calc('Max','MAX')
    };
  }
  function jukaChartSlice(rows=[],period='5Y'){
    const clean=(rows||[]).filter(x=>x&&x.date);
    if(!clean.length||period==='MAX')return clean;
    const years={Y1:1,Y3:3,Y5:5,'1Y':1,'3Y':3,'5Y':5}[period];
    if(!years)return clean;
    const last=new Date(clean.at(-1).date); if(Number.isNaN(last.getTime()))return clean;
    const from=new Date(last);from.setFullYear(from.getFullYear()-years);
    return clean.filter(x=>{const d=new Date(x.date);return !Number.isNaN(d.getTime())&&d>=from;});
  }

  function jukaInvestorFundamentals(stock={},annualFacts=[]){
    const model=classifyValuationModel(stock),rows=deriveFundamentals(annualFacts),latest=rows.at(-1)||{};
    const v=x=>(x===null||x===undefined||x===''?null:(Number.isFinite(Number(x))?Number(x):null));
    const growth=(field,years=5)=>fieldCagr(rows,field,rows.length-1,Math.min(years,rows.length-1));
    const metric=(key,label,value,format,priority=1)=>({key,label,value:Number.isFinite(value)?value:null,format,priority});
    let metrics=[];
    if(model==='operating-company'){
      const qi=qualityInputFromAnnual(rows)||{};
      metrics=[
        metric('revenue','Umsatz',v(latest.revenue),'money'),
        metric('revenueGrowth','Umsatzwachstum 5J',v(qi.revenueCagr5y),'percent'),
        metric('ebitMargin','EBIT-Marge',v(latest.ebitMargin),'percent'),
        metric('fcf','Free Cash Flow',v(latest.fcf),'money'),
        metric('fcfMargin','FCF-Marge',v(latest.fcfMargin),'percent'),
        metric('roic','ROIC',v(qi.roic),'percent'),
        metric('netDebtEbitda','Net Debt / EBITDA',v(qi.netDebtToEbitda),'multiple'),
        metric('eps','EPS',v(latest.eps),'perShare'),
        metric('sharesGrowth','Aktienanzahl CAGR',v(qi.dilutionPa),'percent')
      ];
    }else if(model==='bank-insurance'){
      const b=deriveBankInsuranceMetrics(rows)||{};
      metrics=[
        metric('roe','Normalisierte ROE',v(b.normalizedRoe),'percent'),
        metric('bookValuePerShare','Buchwert je Aktie',v(b.bookValuePerShare),'perShare'),
        metric('equityGrowth','Buchwertwachstum',v(b.equityCagr),'percent'),
        metric('eps','EPS',v(latest.eps),'perShare'),
        metric('epsGrowth','EPS-Wachstum',v(b.epsCagr),'percent'),
        metric('netIncome','Jahresüberschuss',v(latest.netIncome),'money')
      ];
    }else{
      const r=deriveReitMetrics(rows)||{};
      const affo=v(latest.affo),ffo=v(latest.ffo),sh=v(latest.shares),core=Number.isFinite(affo)?affo:ffo;
      metrics=[
        metric('affoFfo','AFFO / FFO',core,'money'),
        metric('affoFfoPerShare','AFFO / FFO je Aktie',sh>0&&Number.isFinite(core)?core/sh:null,'perShare'),
        metric('affoFfoGrowth','AFFO / FFO Wachstum',Number.isFinite(v(r.affoCagr))?v(r.affoCagr):v(r.ffoCagr),'percent'),
        metric('revenue','Umsatz',v(latest.revenue),'money'),
        metric('sharesGrowth','Aktienanzahl CAGR',growth('shares'),'percent'),
        metric('equityGrowth','Eigenkapital CAGR',growth('equity'),'percent')
      ];
    }
    return {model,asOf:latest.date||null,years:rows.length,primary:metrics.filter(x=>x.value!==null).slice(0,5),all:metrics,history:rows.slice(-8)};
  }

  function jukaQualityScoreV2(stock={},annualFacts=[]){
    const model=classifyValuationModel(stock);
    const rows=deriveFundamentals(annualFacts);
    const val=v=>(v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null));
    const clamp01=v=>clamp(v,0,1);
    const lerp=(v,a,b,lo=0,hi=100)=>{
      if(!Number.isFinite(v))return null;
      const t=clamp01((v-a)/(b-a));
      return lo+(hi-lo)*t;
    };
    const lowBetter=(v,best,worst)=>{
      if(!Number.isFinite(v))return null;
      if(v<=best)return 100;if(v>=worst)return 0;
      return 100*(worst-v)/(worst-best);
    };
    const stabilityScore=(vals,centerScale=.20)=>{
      const a=vals.filter(Number.isFinite); if(a.length<3)return null;
      const mean=a.reduce((s,x)=>s+x,0)/a.length;
      const dev=Math.sqrt(a.reduce((s,x)=>s+(x-mean)*(x-mean),0)/a.length);
      const scale=Math.max(Math.abs(mean),centerScale);
      return clamp(100-(dev/scale)*120,0,100);
    };
    const factors=[];
    const add=(key,label,group,weight,value,score,reason)=>{
      if(!Number.isFinite(score))return;
      factors.push({key,label,group,weight,value:Number.isFinite(value)?value:null,score:clamp(score,0,100),reason});
    };
    const pct=v=>Number.isFinite(v)?`${(v*100).toFixed(1)}%`:'n/v';
    const xx=v=>Number.isFinite(v)?`${v.toFixed(1)}×`:'n/v';

    if(model==='operating-company'){
      const qi=qualityInputFromAnnual(rows)||{};
      const rev=val(qi.revenueCagr5y),fcf=val(qi.fcfCagr5y),roic=val(qi.roic),margin=val(qi.ebitMargin),
            conv=val(qi.fcfConversion),sbc=val(qi.sbcToRevenue),nd=val(qi.netDebtToEbitda),
            dil=val(qi.dilutionPa),trend=val(qi.roicTrend);
      add('revenueGrowth','Umsatzwachstum 5J','Wachstum',12,rev,lerp(rev,-.02,.15,20,100),pct(rev)+' CAGR');
      add('fcfGrowth','FCF-Wachstum 5J','Wachstum',10,fcf,lerp(fcf,-.05,.15,15,100),pct(fcf)+' CAGR');
      add('roic','ROIC','Profitabilität',18,roic,lerp(roic,.04,.20,25,100),pct(roic));
      add('margin','EBIT-Marge','Profitabilität',12,margin,lerp(margin,.04,.25,25,100),pct(margin));
      add('conversion','FCF Conversion','Cashflow',12,conv,lerp(conv,.35,.90,20,100),pct(conv));
      const fcfMargins=rows.slice(-5).map(x=>val(x.fcfMargin)).filter(Number.isFinite);
      add('fcfStability','FCF-Stabilität','Cashflow',8,null,stabilityScore(fcfMargins,.10),'Schwankung der FCF-Marge');
      add('netDebt','Bilanz / Net Debt','Bilanz',12,nd,lowBetter(nd,0,4),xx(nd)+' Net Debt / EBITDA');
      add('dilution','Aktienverwässerung','Aktionärsfreundlichkeit',9,dil,lowBetter(dil,0,.05),pct(dil)+' p.a.');
      add('sbc','SBC-Disziplin','Aktionärsfreundlichkeit',4,sbc,lowBetter(sbc,.01,.12),pct(sbc)+' vom Umsatz');
      add('roicTrend','ROIC-Trend','Dynamik',3,trend,lerp(trend,-.05,.05,10,100),`${Number.isFinite(trend)?(trend*100).toFixed(1):'n/v'} pp`);
    } else if(model==='bank-insurance'){
      const m=deriveBankInsuranceMetrics(rows)||{};
      const roe=val(m.normalizedRoe),eqg=val(m.equityCagr),epsg=val(m.epsCagr);
      const roeHist=rows.slice(-5).map(x=>{const e=val(x.equity),ni=val(x.netIncome);return e>0&&Number.isFinite(ni)?ni/e:null}).filter(Number.isFinite);
      const shareGrowth=fieldCagr(rows,'shares',rows.length-1,Math.min(5,rows.length-1));
      const niHist=rows.slice(-5).map(x=>val(x.netIncome)).filter(Number.isFinite);
      add('roe','Normalisierte ROE','Profitabilität',28,roe,lerp(roe,.05,.16,20,100),pct(roe));
      add('equityGrowth','Buchwertwachstum','Wachstum',18,eqg,lerp(eqg,-.02,.08,20,100),pct(eqg)+' CAGR');
      add('epsGrowth','EPS-Wachstum','Wachstum',15,epsg,lerp(epsg,-.05,.10,15,100),pct(epsg)+' CAGR');
      add('roeStability','ROE-Stabilität','Stabilität',16,null,stabilityScore(roeHist,.10),'Stabilität der Eigenkapitalrendite');
      add('earningsStability','Gewinnstabilität','Stabilität',13,null,stabilityScore(niHist,Math.max(1,Math.abs(niHist.at(-1)||1))),'Stabilität des Jahresüberschusses');
      add('dilution','Aktienanzahl','Aktionärsfreundlichkeit',10,shareGrowth,lowBetter(shareGrowth,-.01,.04),pct(shareGrowth)+' CAGR');
    } else {
      const m=deriveReitMetrics(rows)||{};
      const affoGrowth=Number.isFinite(val(m.affoCagr))?val(m.affoCagr):val(m.ffoCagr);
      const revGrowth=fieldCagr(rows,'revenue',rows.length-1,Math.min(5,rows.length-1));
      const shareGrowth=fieldCagr(rows,'shares',rows.length-1,Math.min(5,rows.length-1));
      const equityGrowth=fieldCagr(rows,'equity',rows.length-1,Math.min(5,rows.length-1));
      const perShareHist=rows.slice(-5).map(x=>{
        const sh=val(x.shares),av=val(x.affo),fv=val(x.ffo),v=Number.isFinite(av)?av:fv;
        return sh>0&&Number.isFinite(v)?v/sh:null;
      }).filter(Number.isFinite);
      const psg=perShareHist.length>=2?cagr(perShareHist[0],perShareHist.at(-1),perShareHist.length-1):null;
      add('affoGrowth','AFFO/FFO-Wachstum','Wachstum',25,affoGrowth,lerp(affoGrowth,-.02,.08,20,100),pct(affoGrowth)+' CAGR');
      add('perShareGrowth','AFFO/FFO je Aktie','Pro Aktie',25,psg,lerp(psg,-.03,.07,15,100),pct(psg)+' CAGR');
      add('revenueGrowth','Umsatzwachstum','Wachstum',12,revGrowth,lerp(revGrowth,-.02,.08,20,100),pct(revGrowth)+' CAGR');
      add('perShareStability','Per-Share-Stabilität','Stabilität',18,null,stabilityScore(perShareHist,Math.max(.5,Math.abs(perShareHist.at(-1)||1))),'Stabilität AFFO/FFO je Aktie');
      add('shareGrowth','Aktienausgabe','Kapitaldisziplin',10,shareGrowth,lowBetter(shareGrowth,0,.08),pct(shareGrowth)+' CAGR');
      add('equityGrowth','Eigenkapitalbasis','Bilanz',10,equityGrowth,lerp(equityGrowth,-.05,.08,20,100),pct(equityGrowth)+' CAGR');
    }

    const totalWeight=factors.reduce((s,x)=>s+x.weight,0);
    const weighted=factors.reduce((s,x)=>s+x.score*x.weight,0);
    const score=totalWeight?Math.round((weighted/totalWeight)*10)/10:null;
    const coverage=Math.min(1,totalWeight/100);
    const confidence=coverage>=.82&&rows.length>=5?'hoch':coverage>=.60&&rows.length>=4?'mittel':'niedrig';
    const grade=score==null?'—':score>=85?'A':score>=72?'B':score>=58?'C':score>=45?'D':'E';
    const label=score==null?'Nicht bewertbar':score>=85?'Exzellent':score>=72?'Sehr gut':score>=58?'Gut / solide':score>=45?'Durchschnittlich':'Schwach';
    const strengths=factors.slice().sort((a,b)=>b.score-a.score).slice(0,2).map(x=>x.label);
    const weaknesses=factors.slice().sort((a,b)=>a.score-b.score).slice(0,2).map(x=>x.label);
    let verdict='Datenlage für ein belastbares Qualitätsurteil noch zu dünn.';
    let recommendation='Weitere Fundamentaldaten abwarten.';
    if(score!=null){
      if(score>=85){verdict='Außergewöhnlich hohe fundamentale Qualität mit mehreren robusten Stärken.';recommendation='Qualitativ klar investierbar; Bewertung und Risiken entscheiden über den Einstieg.';}
      else if(score>=72){verdict='Überdurchschnittlich gutes Qualitätsprofil mit überwiegend starken Fundamentaldaten.';recommendation='Attraktiver Qualitätskandidat; Schwachstellen und Bewertung gezielt prüfen.';}
      else if(score>=58){verdict='Solides Unternehmen, aber die Qualität ist nicht in allen Bereichen überdurchschnittlich.';recommendation='Selektiv interessant; nur bei passender Bewertung und verständlichen Schwächen.';}
      else if(score>=45){verdict='Gemischtes Qualitätsprofil mit mehreren Punkten, die genauer geprüft werden sollten.';recommendation='Eher Watchlist als Qualitätskauf; erst Schwächen und Bewertung klären.';}
      else {verdict='Fundamentale Qualität ist aktuell schwach oder sehr uneinheitlich.';recommendation='Vorsicht: nur mit klarer Sondersituation oder deutlicher Sicherheitsmarge näher prüfen.';}
    }
    return {version:'JuKa Quality 2.0',model,score,grade,label,coverage,confidence,years:rows.length,verdict,recommendation,strengths,weaknesses,parts:factors};
  }

  // Legacy simplified FCFF DCF kept for partial live datasets.
  function dcfFairValue(input={}){
    const fcf0=n(input.fcf0), growth=n(input.growth,.08), fadeGrowth=n(input.fadeGrowth,.04), wacc=n(input.wacc,.09), terminalGrowth=n(input.terminalGrowth,.025), years=Math.max(1,Math.round(n(input.years,10))), netCash=n(input.netCash), shares=n(input.shares);
    if(fcf0<=0||shares<=0||wacc<=terminalGrowth)return null;
    let pv=0, fcf=fcf0;
    for(let y=1;y<=years;y++){const t=(y-1)/Math.max(1,years-1); const g=growth+(fadeGrowth-growth)*t; fcf*=1+g; pv+=fcf/Math.pow(1+wacc,y);}
    const terminal=fcf*(1+terminalGrowth)/(wacc-terminalGrowth); pv+=terminal/Math.pow(1+wacc,years);
    return (pv+netCash)/shares;
  }
  function scenarioValues(baseInput={}){
    const base=dcfFairValue(baseInput); if(base==null)return null;
    const bear=dcfFairValue({...baseInput,growth:n(baseInput.growth,.08)-.03,fadeGrowth:n(baseInput.fadeGrowth,.04)-.015,wacc:n(baseInput.wacc,.09)+.015,terminalGrowth:Math.max(.01,n(baseInput.terminalGrowth,.025)-.005)});
    const bull=dcfFairValue({...baseInput,growth:n(baseInput.growth,.08)+.03,fadeGrowth:n(baseInput.fadeGrowth,.04)+.015,wacc:Math.max(.055,n(baseInput.wacc,.09)-.01),terminalGrowth:Math.min(.04,n(baseInput.terminalGrowth,.025)+.005)});
    return {bear,base,bull};
  }

  // 10Y FCFF model ported 1:1 from the user's Excel DCF_10Y logic.
  function jukaDcf10Y(input={}, scenario={growthAdj:0,marginAdj:0,waccAdj:0}){
    const revenue0=n(input.revenue), ebit0=n(input.ebit), tax=n(input.taxRate), da0=n(input.da), capex0=n(input.capex), nwc0=n(input.deltaNwc), shares=n(input.shares), netFinancialPosition=n(input.netFinancialPosition);
    const g1=n(input.growthY1), g5=n(input.growthY5), targetMargin5=n(input.targetEbitMarginY5), wacc=n(input.wacc)+n(scenario.waccAdj), terminalGrowth=n(input.terminalGrowth), terminalRoic=n(input.terminalRoic);
    const capexPct0=revenue0?capex0/revenue0:NaN, daPct0=revenue0?da0/revenue0:NaN, nwcPct0=revenue0?nwc0/revenue0:NaN;
    const capexPct5=n(input.capexPctY5), daPct5=n(input.daPctY5), nwcPct5=n(input.nwcPctY5);
    if(!(revenue0>0&&shares>0&&terminalRoic>terminalGrowth&&wacc>terminalGrowth&&Number.isFinite(capexPct0)&&Number.isFinite(daPct0)&&Number.isFinite(nwcPct0)))return null;
    const margin0=ebit0/revenue0; const rows=[]; let revenue=revenue0; let pvForecast=0;
    for(let y=1;y<=10;y++){
      let growth,margin,daPct,capexPct,nwcPct;
      if(y<=5){
        growth=(g1+n(scenario.growthAdj))+(g5-g1)*(y-1)/4;
        margin=margin0+((targetMargin5+n(scenario.marginAdj))-margin0)*y/5;
        daPct=daPct0+(daPct5-daPct0)*y/5;
        capexPct=capexPct0+(capexPct5-capexPct0)*y/5;
        nwcPct=nwcPct0+(nwcPct5-nwcPct0)*y/5;
      }else{
        growth=(g5+n(scenario.growthAdj))+(terminalGrowth-(g5+n(scenario.growthAdj)))*(y-5)/5;
        margin=targetMargin5+n(scenario.marginAdj);
        daPct=daPct5+(capexPct5-daPct5)*(y-5)/5;
        capexPct=capexPct5+(daPct5-capexPct5)*(y-5)/5;
        nwcPct=nwcPct5*(1-(y-5)/5);
      }
      revenue*=1+growth;
      const ebit=revenue*margin, nopat=ebit*(1-tax), da=revenue*daPct, capex=revenue*capexPct, deltaNwc=revenue*nwcPct, fcff=nopat+da-capex-deltaNwc;
      const discountFactor=1/Math.pow(1+wacc,y), pvFcff=fcff*discountFactor; pvForecast+=pvFcff;
      rows.push({year:y,revenue,growth,margin,ebit,nopat,daPct,capexPct,nwcPct,da,capex,deltaNwc,fcff,discountFactor,pvFcff});
    }
    const y10=rows[9], nopat11=y10.nopat*(1+terminalGrowth), terminalReinvestmentRate=terminalGrowth/terminalRoic, terminalFcff=nopat11*(1-terminalReinvestmentRate), terminalValue=terminalFcff/(wacc-terminalGrowth), pvTerminal=terminalValue/Math.pow(1+wacc,10), enterpriseValue=pvForecast+pvTerminal, equityValue=enterpriseValue-netFinancialPosition, fairValue=equityValue/shares, terminalShare=pvTerminal/enterpriseValue;
    return {fairValue,enterpriseValue,equityValue,pvForecast,pvTerminal,terminalValue,nopat11,terminalReinvestmentRate,terminalFcff,terminalShare,wacc,rows};
  }
  function jukaDcfScenarios(input={}){
    const bear=jukaDcf10Y(input,{growthAdj:n(input.bearGrowthAdj,-.03),marginAdj:n(input.bearMarginAdj,-.03),waccAdj:n(input.bearWaccAdj,.015)});
    const base=jukaDcf10Y(input,{growthAdj:0,marginAdj:0,waccAdj:0});
    const bull=jukaDcf10Y(input,{growthAdj:n(input.bullGrowthAdj,.03),marginAdj:n(input.bullMarginAdj,.03),waccAdj:n(input.bullWaccAdj,-.01)});
    return base&&bear&&bull?{bear:bear.fairValue,base:base.fairValue,bull:bull.fairValue,detail:{bear,base,bull}}:null;
  }
  // Reverse DCF for operating companies: solve one market-implied assumption at a time.
  function solveBisection(fn,target,lo,hi,iterations=80){
    let flo=fn(lo)-target,fhi=fn(hi)-target;if(!Number.isFinite(flo)||!Number.isFinite(fhi)||flo*fhi>0)return null;
    for(let i=0;i<iterations;i++){const mid=(lo+hi)/2,fm=fn(mid)-target;if(!Number.isFinite(fm))return null;if(Math.abs(fm)<1e-9)return mid;if(flo*fm<=0){hi=mid;fhi=fm;}else{lo=mid;flo=fm;}}
    return (lo+hi)/2;
  }
  function jukaReverseDcf(input={},marketPrice){
    const price=n(marketPrice,NaN);if(!(price>0))return null;
    const base=jukaDcf10Y(input);if(!base)return null;
    // Excel logic: solve one adjustment applied to BOTH g1 and g5.
    // This preserves the original growth spread instead of collapsing both rates.
    const fvGrowthAdj=a=>jukaDcf10Y(input,{growthAdj:a})?.fairValue;
    const fvMargin=m=>jukaDcf10Y({...input,targetEbitMarginY5:m})?.fairValue;
    const fvWacc=w=>jukaDcf10Y({...input,wacc:w})?.fairValue;
    const impliedGrowthAdjustment=solveBisection(fvGrowthAdj,price,-.15,.15);
    const impliedGrowthY1=impliedGrowthAdjustment==null?null:n(input.growthY1)+impliedGrowthAdjustment;
    const impliedGrowthY5=impliedGrowthAdjustment==null?null:n(input.growthY5)+impliedGrowthAdjustment;
    const impliedMargin=solveBisection(fvMargin,price,.01,.75);
    const impliedWacc=solveBisection(fvWacc,price,Math.max(n(input.terminalGrowth,.025)+.002,.03),.25);
    return {
      price,marketPrice:price,baseFairValue:base.fairValue,marketVsBase:price/base.fairValue-1,
      impliedGrowthAdjustment,impliedGrowthY1,impliedGrowthY5,
      impliedGrowth:impliedGrowthY1,
      impliedMargin,impliedWacc,
      growthGap:impliedGrowthAdjustment,
      marginGap:impliedMargin==null?null:impliedMargin-n(input.targetEbitMarginY5),
      waccGap:impliedWacc==null?null:impliedWacc-n(input.wacc)
    };
  }
  function jukaSensitivity(input={},waccSteps=null,growthSteps=null){
    const wc=waccSteps||[-.02,-.01,0,.01,.02].map(x=>n(input.wacc)+x);
    const gc=growthSteps||[-.01,-.005,0,.005,.01].map(x=>n(input.terminalGrowth)+x);
    return {wacc:wc,terminalGrowth:gc,values:wc.map(w=>gc.map(g=>{if(w<=g)return null;const r=jukaDcf10Y({...input,wacc:w,terminalGrowth:g});return r?.fairValue??null;}))};
  }



  function stdev(arr=[]){
    const a=arr.filter(Number.isFinite); if(a.length<2)return null;
    const m=a.reduce((s,x)=>s+x,0)/a.length;
    return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1));
  }

  function jukaDataQuality(annualFacts=[]){
    const rows=deriveFundamentals(annualFacts); if(!rows.length)return {score:0,label:'ungenügend',coverage:0,issues:['Keine Fundamentaldaten']};
    const recent=rows.slice(-5);
    const fields=['revenue','operatingIncome','netIncome','eps','fcf','shares','cash','debt','equity','capex'];
    let present=0,total=recent.length*fields.length;
    recent.forEach(r=>fields.forEach(f=>{const v=r[f];if(v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v)))present++;}));
    const coverage=total?present/total:0;
    const chronology=recent.every((r,i)=>i===0||!r.date||!recent[i-1].date||String(r.date)>=String(recent[i-1].date));
    const years=recent.length;
    const score=Math.round(clamp(coverage*70 + Math.min(years,5)/5*20 + (chronology?10:0),0,100));
    const label=score>=85?'sehr gut':score>=70?'gut':score>=50?'mittel':score>=30?'schwach':'ungenügend';
    const issues=[];
    if(years<5)issues.push(`Nur ${years} Geschäftsjahre verfügbar`);
    if(coverage<.8)issues.push(`Feldabdeckung ${(coverage*100).toFixed(0)}%`);
    if(!chronology)issues.push('Chronologie auffällig');
    return {score,label,coverage,years,issues};
  }

  function jukaCompanyProfile(annualFacts=[]){
    const rows=deriveFundamentals(annualFacts); const r=rows.at(-1); if(!r)return null;
    const recent=rows.slice(-5);
    const growths=[];
    for(let i=Math.max(1,rows.length-4);i<rows.length;i++){
      const a=Number(rows[i-1].revenue), b=Number(rows[i].revenue);
      if(a>0&&b>0)growths.push(b/a-1);
    }
    const margins=recent.map(x=>Number(x.operatingMargin)).filter(Number.isFinite);
    const fcfMargins=recent.map(x=>Number(x.fcfMargin)).filter(Number.isFinite);
    const capexIntensity=recent.map(x=>Number(x.capex)>0&&Number(x.revenue)>0?Number(x.capex)/Number(x.revenue):null).filter(Number.isFinite);
    const shareGrowth=fieldCagr(rows,'shares',rows.length-1,Math.min(5,rows.length-1));
    const revenueCagr=fieldCagr(rows,'revenue',rows.length-1,Math.min(5,rows.length-1));
    const marginMedian=medianField(rows,'operatingMargin',Math.max(0,rows.length-5),rows.length-1);
    const fcfMarginMedian=medianField(rows,'fcfMargin',Math.max(0,rows.length-5),rows.length-1);
    const growthVol=stdev(growths), marginVol=stdev(margins);
    const cyclical=Number.isFinite(growthVol)&&growthVol>.12 || Number.isFinite(marginVol)&&marginVol>.08;
    const highGrowth=Number.isFinite(revenueCagr)&&revenueCagr>.15;
    const capitalIntensive=capexIntensity.length?capexIntensity.reduce((s,x)=>s+x,0)/capexIntensity.length>.10:false;
    const highMargin=Number.isFinite(marginMedian)&&marginMedian>.25;
    const dilution=Number.isFinite(shareGrowth)&&shareGrowth>.02;
    const buyback=Number.isFinite(shareGrowth)&&shareGrowth<-.02;
    const cashRich=Number(r.cash)>Number(r.debt);
    const profile=[];
    if(highGrowth)profile.push('High Growth');
    if(cyclical)profile.push('Zyklisch/volatil');
    if(capitalIntensive)profile.push('Kapitalintensiv');
    if(highMargin)profile.push('Hohe Marge');
    if(dilution)profile.push('Verwässerung');
    if(buyback)profile.push('Aktienrückkäufe');
    if(cashRich)profile.push('Net Cash');
    if(!profile.length)profile.push('Ausgewogen');
    return {profile,revenueCagr,growthVol,marginMedian,marginVol,fcfMarginMedian,shareGrowth,cyclical,highGrowth,capitalIntensive,highMargin,dilution,buyback,cashRich};
  }

  function jukaAutoAssumptions(annualFacts=[], overrides={}){
    const rows=deriveFundamentals(annualFacts); const r=rows.at(-1), p=jukaCompanyProfile(rows), q=jukaDataQuality(rows);
    if(!r||!p)return null;
    const histGrowth=Number.isFinite(p.revenueCagr)?p.revenueCagr:.06;
    let growthY1=clamp(histGrowth,-.05,.25);
    if(p.cyclical) growthY1*=.75;
    if(p.highGrowth) growthY1=Math.min(growthY1,.22);
    let growthY5=clamp(Math.max(.025,growthY1*(p.highGrowth?.55:.45)),.02,.12);
    let targetMargin=Number.isFinite(p.marginMedian)?p.marginMedian:Number(r.operatingMargin);
    if(p.cyclical&&Number.isFinite(targetMargin)) targetMargin*=.95;
    if(p.highMargin&&Number.isFinite(targetMargin)) targetMargin=Math.min(targetMargin,.55);
    let targetFcf=Number.isFinite(p.fcfMarginMedian)?p.fcfMarginMedian:Number(r.fcfMargin);
    if(p.capitalIntensive&&Number.isFinite(targetFcf)) targetFcf*=.90;
    let shareGrowth=Number.isFinite(p.shareGrowth)?p.shareGrowth:0;
    shareGrowth=clamp(shareGrowth,-.05,.05);
    const confidence=q.score>=85?'hoch':q.score>=65?'mittel':'niedrig';
    const assumptions={
      growthY1:n(overrides.growthY1,growthY1),
      growthY5:n(overrides.growthY5,growthY5),
      targetEbitMarginY5:n(overrides.targetEbitMarginY5,targetMargin),
      targetFcfMarginY5:n(overrides.targetFcfMarginY5,targetFcf),
      taxRate:n(overrides.taxRate,Number.isFinite(r.taxRate)?r.taxRate:.21),
      shareGrowth:n(overrides.shareGrowth,shareGrowth)
    };
    return {assumptions,profile:p,dataQuality:q,confidence};
  }

  function jukaForecast5Y(annualFacts=[], assumptions={}){
    const rows=deriveFundamentals(annualFacts); const r=rows.at(-1); if(!r)return null;
    const auto=jukaAutoAssumptions(rows,assumptions);
    assumptions=auto?.assumptions||assumptions;
    const revenue0=Number(r.revenue), ebit0=Number(r.operatingIncome), eps0=Number(r.eps), fcf0=Number(r.fcf), shares0=Number(r.shares);
    if(!(revenue0>0))return null;
    const histGrowth=fieldCagr(rows,'revenue',rows.length-1,3)??fieldCagr(rows,'revenue',rows.length-1,5)??.06;
    const growthY1=clamp(n(assumptions.growthY1,histGrowth),-.10,.35);
    const growthY5=clamp(n(assumptions.growthY5,Math.max(.025,growthY1*.55)),.00,.18);
    const margin0=Number.isFinite(r.operatingMargin)?r.operatingMargin:(Number.isFinite(ebit0)?ebit0/revenue0:null);
    const marginHist=medianField(rows,'operatingMargin',rows.length-3,rows.length-1);
    const targetMargin=clamp(n(assumptions.targetEbitMarginY5,Number.isFinite(marginHist)?marginHist:margin0),-.10,.65);
    const taxRate=clamp(n(assumptions.taxRate,Number.isFinite(r.taxRate)?r.taxRate:.21),0,.45);
    const fcfMargin0=Number.isFinite(r.fcfMargin)?r.fcfMargin:(Number.isFinite(fcf0)?fcf0/revenue0:null);
    const fcfMarginHist=medianField(rows,'fcfMargin',rows.length-3,rows.length-1);
    const targetFcfMargin=clamp(n(assumptions.targetFcfMarginY5,Number.isFinite(fcfMarginHist)?fcfMarginHist:fcfMargin0),-.10,.60);
    const shareGrowth=clamp(n(assumptions.shareGrowth,fieldCagr(rows,'shares',rows.length-1,3)??0),-.08,.08);
    let revenue=revenue0, shares=Number.isFinite(shares0)&&shares0>0?shares0:null;
    const out=[];
    for(let y=1;y<=5;y++){
      const t=(y-1)/4, growth=growthY1+(growthY5-growthY1)*t;
      revenue*=1+growth;
      const margin=Number.isFinite(margin0)?margin0+(targetMargin-margin0)*(y/5):null;
      const ebit=Number.isFinite(margin)?revenue*margin:null;
      const netIncome=Number.isFinite(ebit)?ebit*(1-taxRate):null;
      if(Number.isFinite(shares))shares*=1+shareGrowth;
      const eps=Number.isFinite(netIncome)&&Number.isFinite(shares)&&shares>0?netIncome/shares:null;
      const fcfMargin=Number.isFinite(fcfMargin0)?fcfMargin0+(targetFcfMargin-fcfMargin0)*(y/5):null;
      const fcf=Number.isFinite(fcfMargin)?revenue*fcfMargin:null;
      out.push({year:y,revenue,growth,margin,ebit,netIncome,shares,eps,fcfMargin,fcf});
    }
    const last=out.at(-1);
    return {rows:out,sourceFy:r.fy,sourceDate:r.date,assumptions:{growthY1,growthY5,targetMargin,targetFcfMargin,taxRate,shareGrowth},
      summary:{revenueY5:last.revenue,ebitY5:last.ebit,epsY5:last.eps,fcfY5:last.fcf,
        revenueGrowth:cagr(revenue0,last.revenue,5),
        epsGrowth:eps0>0&&last.eps>0?cagr(eps0,last.eps,5):null,
        fcfGrowth:fcf0>0&&last.fcf>0?cagr(fcf0,last.fcf,5):null,
        marginY5:last.margin,fcfMarginY5:last.fcfMargin}};
  }


  function jukaForecastScenarios(annualFacts=[], baseAssumptions={}){
    const base=jukaForecast5Y(annualFacts,baseAssumptions);
    if(!base)return null;
    const a=base.assumptions;
    const bearA={
      growthY1:clamp(a.growthY1-.04,-.10,.35),
      growthY5:clamp(a.growthY5-.03,0,.18),
      targetEbitMarginY5:clamp(a.targetMargin-.04,-.10,.65),
      targetFcfMarginY5:clamp(a.targetFcfMargin-.03,-.10,.60),
      taxRate:a.taxRate, shareGrowth:clamp(a.shareGrowth+.01,-.08,.08)
    };
    const bullA={
      growthY1:clamp(a.growthY1+.04,-.10,.35),
      growthY5:clamp(a.growthY5+.03,0,.18),
      targetEbitMarginY5:clamp(a.targetMargin+.04,-.10,.65),
      targetFcfMarginY5:clamp(a.targetFcfMargin+.03,-.10,.60),
      taxRate:a.taxRate, shareGrowth:clamp(a.shareGrowth-.01,-.08,.08)
    };
    return {bear:jukaForecast5Y(annualFacts,bearA),base,bull:jukaForecast5Y(annualFacts,bullA)};
  }

  function jukaExpectedReturnMatrix({price,epsTtm,scenarios,fairValues={},exitPeBase=null,dividendYield=0}={}){
    if(!scenarios)return null;
    const baseFair=n(fairValues.base,NaN);
    const basePe=Number(exitPeBase);
    const fallbackBase=epsTtm>0&&baseFair>0?baseFair/epsTtm:null;
    const usedBasePe=Number.isFinite(basePe)&&basePe>0?basePe:fallbackBase;
    const exitPes={
      bear:Number.isFinite(usedBasePe)?usedBasePe*.80:null,
      base:usedBasePe,
      bull:Number.isFinite(usedBasePe)?usedBasePe*1.20:null
    };
    const out={};
    for(const key of ['bear','base','bull']){
      const epsY5=scenarios[key]?.summary?.epsY5;
      const fv=n(fairValues[key],key==='base'?baseFair:NaN);
      const bridge=jukaReturnBridge({price,epsTtm,epsY5,fairValue:fv,exitPe:exitPes[key],dividendYield,years:5});
      out[key]={...bridge,epsY5,fairValue:fv};
    }
    const matrix=[];
    for(const fKey of ['bear','base','bull']){
      for(const pKey of ['bear','base','bull']){
        const epsY5=scenarios[fKey]?.summary?.epsY5, pe=exitPes[pKey];
        const target=epsY5>0&&pe>0?epsY5*pe:null;
        const cagr=price>0&&target>0?Math.pow(target/price,1/5)-1:null;
        matrix.push({forecast:fKey,exitMultiple:pKey,epsY5,exitPe:pe,targetPrice:target,returnCagr:cagr});
      }
    }
    return {scenarios:out,exitPes,matrix};
  }

  function jukaReturnBridge({price,epsTtm,epsY5,fairValue,exitPe=null,dividendYield=0,years=5}={}){
    price=n(price,NaN); epsTtm=n(epsTtm,NaN); epsY5=n(epsY5,NaN); fairValue=n(fairValue,NaN); years=Math.max(1,Math.round(n(years,5)));
    const pe=price>0&&epsTtm>0?price/epsTtm:null, fairPe=epsTtm>0&&fairValue>0?fairValue/epsTtm:null;
    const explicitExit=Number(exitPe);
    const usedExitPe=exitPe!==null&&exitPe!==''&&Number.isFinite(explicitExit)&&explicitExit>0 ? explicitExit : (Number.isFinite(fairPe)?fairPe:pe);
    const targetPrice=epsY5>0&&usedExitPe>0?epsY5*usedExitPe:null;
    const priceCagr=price>0&&targetPrice>0?Math.pow(targetPrice/price,1/years)-1:null;
    dividendYield=clamp(n(dividendYield,0),0,.20);
    const totalReturnCagr=Number.isFinite(priceCagr)?(1+priceCagr)*(1+dividendYield)-1:null;
    const epsGrowth=epsTtm>0&&epsY5>0?Math.pow(epsY5/epsTtm,1/years)-1:null;
    const peg=Number.isFinite(pe)&&Number.isFinite(epsGrowth)&&epsGrowth>0?pe/(epsGrowth*100):null;
    return {pe,fairPe,exitPe:usedExitPe,targetPrice,priceCagr,totalReturnCagr,epsGrowth,peg,dividendYield,years};
  }

  function jukaRelativeValuation({price,epsTtm,epsY5,fairValue}={}){
    price=n(price,NaN); epsTtm=n(epsTtm,NaN); epsY5=n(epsY5,NaN); fairValue=n(fairValue,NaN);
    const pe=epsTtm>0?price/epsTtm:null, peY5=epsY5>0?price/epsY5:null, epsGrowth=epsTtm>0&&epsY5>0?Math.pow(epsY5/epsTtm,1/5)-1:null, fairPe=epsTtm>0&&Number.isFinite(fairValue)?fairValue/epsTtm:null;
    return {pe,peY5,epsGrowth,fairPe};
  }


  function lastFinite(rows,key,endIndex){
    for(let i=endIndex;i>=0;i--){const v=Number(rows[i]?.[key]);if(Number.isFinite(v))return {index:i,value:v,row:rows[i]};}
    return null;
  }
  function fieldCagr(rows,key,endIndex,years=5){
    const end=lastFinite(rows,key,endIndex); if(!end||end.value<=0)return null;
    let start=null;
    for(let i=end.index-1;i>=0;i--){const v=Number(rows[i]?.[key]); if(Number.isFinite(v)&&v>0&&end.index-i>=years){start={index:i,value:v};break;}}
    if(!start){for(let i=0;i<end.index;i++){const v=Number(rows[i]?.[key]);if(Number.isFinite(v)&&v>0){start={index:i,value:v};break;}}}
    if(!start)return null; return cagr(start.value,end.value,end.index-start.index);
  }
  function medianField(rows,key,start,end){return median(rows.slice(Math.max(0,start),end+1).map(r=>Number(r?.[key])).filter(Number.isFinite));}
  function deriveFundamentals(annualFacts=[]){
    const rows=(annualFacts||[]).map(x=>({...x})).filter(x=>x&&x.date).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    for(let i=0;i<rows.length;i++){
      const r=rows[i], prev=rows[i-1];
      const revenue=Number(r.revenue), ebit=Number(r.operatingIncome), ni=Number(r.netIncome), fcf=Number(r.fcf), da=Number(r.da), debt=Number(r.debt), cash=Number(r.cash), equity=Number(r.equity), pretax=Number(r.pretaxIncome), tax=Number(r.incomeTax), interest=Number(r.interestExpense), sbc=Number(r.sbc);
      r.operatingMargin=Number.isFinite(revenue)&&revenue!==0&&Number.isFinite(ebit)?ebit/revenue:null;
      r.netMargin=Number.isFinite(revenue)&&revenue!==0&&Number.isFinite(ni)?ni/revenue:null;
      r.fcfMargin=Number.isFinite(revenue)&&revenue!==0&&Number.isFinite(fcf)?fcf/revenue:null;
      r.taxRate=Number.isFinite(pretax)&&pretax>0&&Number.isFinite(tax)?clamp(tax/pretax,0,.45):null;
      r.ebitda=Number.isFinite(ebit)&&Number.isFinite(da)?ebit+da:null;
      r.netDebt=Number.isFinite(debt)&&Number.isFinite(cash)?debt-cash:null;
      r.netCash=Number.isFinite(cash)&&Number.isFinite(debt)?cash-debt:(Number.isFinite(Number(r.netCash))?Number(r.netCash):null);
      r.netDebtToEbitda=Number.isFinite(r.netDebt)&&Number.isFinite(r.ebitda)&&r.ebitda!==0?r.netDebt/r.ebitda:null;
      r.interestCoverage=Number.isFinite(ebit)&&Number.isFinite(interest)&&interest>0?ebit/interest:null;
      const invested=Number.isFinite(equity)&&Number.isFinite(debt)&&Number.isFinite(cash)?equity+debt-cash:null;
      const nopat=Number.isFinite(ebit)?ebit*(1-(Number.isFinite(r.taxRate)?r.taxRate:.21)):null;
      r.roic=Number.isFinite(nopat)&&Number.isFinite(invested)&&invested>0?nopat/invested:null;
      r.fcfConversion=Number.isFinite(fcf)&&Number.isFinite(ni)&&ni!==0?fcf/ni:null;
      r.sbcToRevenue=Number.isFinite(sbc)&&Number.isFinite(revenue)&&revenue!==0?sbc/revenue:null;
      r.revenueGrowthYoY=prev&&Number(prev.revenue)>0&&Number.isFinite(revenue)?revenue/Number(prev.revenue)-1:null;
      r.fcfGrowthYoY=prev&&Number(prev.fcf)>0&&Number.isFinite(fcf)?fcf/Number(prev.fcf)-1:null;
      r.shareGrowthYoY=prev&&Number(prev.shares)>0&&Number(r.shares)>0?Number(r.shares)/Number(prev.shares)-1:null;
      r.revenueCagr5y=fieldCagr(rows,'revenue',i,5); r.fcfCagr5y=fieldCagr(rows,'fcf',i,5); r.dilutionPa=fieldCagr(rows,'shares',i,5);
      r.revenueCagr3y=fieldCagr(rows,'revenue',i,3); r.epsCagr3y=fieldCagr(rows,'eps',i,3);
      const roic3=lastFinite(rows,'roic',Math.max(0,i-3)); r.roicTrend=Number.isFinite(r.roic)&&roic3&&roic3.index<i?r.roic-roic3.value:null;
    }
    return rows;
  }
  function qualityInputFromAnnual(annualFacts=[]){
    const rows=deriveFundamentals(annualFacts); const r=rows.at(-1); if(!r)return null;
    const hasCoverage=r.interestCoverage!==null&&r.interestCoverage!==undefined&&r.interestCoverage!==''&&Number.isFinite(Number(r.interestCoverage));
    const interestCoverage=hasCoverage
      ? Number(r.interestCoverage)
      : (r.netDebt!==null&&r.netDebt!==undefined&&Number.isFinite(Number(r.netDebt))&&Number(r.netDebt)<=0?99:null);
    return {roic:r.roic,ebitMargin:r.operatingMargin,revenueCagr5y:r.revenueCagr5y,fcfCagr5y:r.fcfCagr5y,fcfConversion:r.fcfConversion,sbcToRevenue:r.sbcToRevenue,netDebtToEbitda:r.netDebtToEbitda,interestCoverage,dilutionPa:r.dilutionPa,roicTrend:r.roicTrend};
  }
  function dcfInputFromAnnual(annualFacts=[],endIndex=null,assumptions={}){
    const rows=deriveFundamentals(annualFacts); if(!rows.length)return null; const i=endIndex==null?rows.length-1:clamp(Math.round(endIndex),0,rows.length-1), r=rows[i];
    const revenue=Number(r.revenue),ebit=Number(r.operatingIncome),da=Number(r.da),capex=Number(r.capex),shares=Number(r.shares);
    if(!(revenue>0&&Number.isFinite(ebit)&&Number.isFinite(da)&&Number.isFinite(capex)&&shares>0))return null;
    const gHist=fieldCagr(rows,'revenue',i,3)??fieldCagr(rows,'revenue',i,5)??.06;
    const g1=clamp(n(assumptions.growthY1,gHist),-.05,.30), terminalGrowth=n(assumptions.terminalGrowth,.025), g5=clamp(n(assumptions.growthY5,Math.max(terminalGrowth+.01,g1*.60)),terminalGrowth,.20);
    const marginMedian=medianField(rows,'operatingMargin',i-2,i)??r.operatingMargin??ebit/revenue;
    const capexPct=median(rows.slice(Math.max(0,i-2),i+1).map(x=>Number(x.capex)/Number(x.revenue)).filter(Number.isFinite));
    const daPct=median(rows.slice(Math.max(0,i-2),i+1).map(x=>Number(x.da)/Number(x.revenue)).filter(Number.isFinite));
    const nwcPct=median(rows.slice(Math.max(0,i-2),i+1).map(x=>Number(x.deltaNwc)/Number(x.revenue)).filter(Number.isFinite));
    const taxRate=Number.isFinite(r.taxRate)?r.taxRate:n(assumptions.taxRate,.21); const terminalRoic=clamp(n(assumptions.terminalRoic,Number.isFinite(r.roic)?r.roic:.15),Math.max(terminalGrowth+.01,.06),.35);
    const netFin=Number.isFinite(Number(r.netFinancialPosition))?Number(r.netFinancialPosition):(Number.isFinite(Number(r.debt))&&Number.isFinite(Number(r.cash))?Number(r.debt)-Number(r.cash):0);
    return {revenue,ebit,taxRate,da,capex,deltaNwc:Number.isFinite(Number(r.deltaNwc))?Number(r.deltaNwc):0,shares,netFinancialPosition:netFin,growthY1:g1,growthY5:g5,targetEbitMarginY5:clamp(n(assumptions.targetEbitMarginY5,marginMedian),-.05,.60),wacc:n(assumptions.wacc,.09),terminalGrowth,terminalRoic,capexPctY5:n(assumptions.capexPctY5,Number.isFinite(capexPct)?capexPct:capex/revenue),daPctY5:n(assumptions.daPctY5,Number.isFinite(daPct)?daPct:da/revenue),nwcPctY5:n(assumptions.nwcPctY5,Number.isFinite(nwcPct)?nwcPct:0),bearGrowthAdj:n(assumptions.bearGrowthAdj,-.03),bearMarginAdj:n(assumptions.bearMarginAdj,-.03),bearWaccAdj:n(assumptions.bearWaccAdj,.015),bullGrowthAdj:n(assumptions.bullGrowthAdj,.03),bullMarginAdj:n(assumptions.bullMarginAdj,.03),bullWaccAdj:n(assumptions.bullWaccAdj,-.01),sourceFy:r.fy,sourceDate:r.date,availableFrom:r.filed||r.date};
  }
  function buildHistoricalJukaFairSeries(priceRows,annualFacts,assumptions={}){
    if(!Array.isArray(priceRows)||!priceRows.length)return [];
    const facts=deriveFundamentals(annualFacts);
    const dated=facts.map((x,i)=>({x,i,available:String(x.filed||x.date)})).filter(x=>x.available).sort((a,b)=>a.available.localeCompare(b.available));
    const cache=new Map();
    function roll(v,rate,days){
      if(!Number.isFinite(Number(v)))return null;
      const r=Number.isFinite(Number(rate))?Number(rate):n(assumptions.wacc,.09);
      return Number(v)*Math.pow(1+r,Math.max(0,days)/365.25);
    }
    return priceRows.map(row=>{
      const d=String(row.date).slice(0,10);let chosen=null;
      for(const f of dated){if(f.available<=d)chosen=f;else break;}
      if(!chosen)return {...row,base:null,bear:null,bull:null,model:'none'};
      if(!cache.has(chosen.i)){
        const inp=dcfInputFromAnnual(facts,chosen.i,assumptions),sc=inp?jukaDcfScenarios(inp):null;
        cache.set(chosen.i,{inp,sc});
      }
      const {inp,sc}=cache.get(chosen.i),available=inp?.availableFrom||chosen.available;
      const days=Math.max(0,(Date.parse(d)-Date.parse(available))/86400000);
      if(sc)return {...row,
        base:roll(sc.base,sc.detail?.base?.wacc??inp.wacc,days),
        bear:roll(sc.bear,sc.detail?.bear?.wacc??(inp.wacc+inp.bearWaccAdj),days),
        bull:roll(sc.bull,sc.detail?.bull?.wacc??(inp.wacc+inp.bullWaccAdj),days),
        model:'juka-10y',rollForward:true,sourceFy:inp.sourceFy,availableFrom:available};
      const f=chosen.x,growth=Number.isFinite(f.revenueCagr3y)?clamp(f.revenueCagr3y,-.02,.22):n(assumptions.growth,.08);
      const legacy=scenarioValues({fcf0:n(f.fcf),growth,fadeGrowth:n(assumptions.fadeGrowth,.04),wacc:n(assumptions.wacc,.09),terminalGrowth:n(assumptions.terminalGrowth,.025),years:10,netCash:n(f.netCash),shares:n(f.shares)});
      return {...row,
        base:legacy?roll(legacy.base,n(assumptions.wacc,.09),days):null,
        bear:legacy?roll(legacy.bear,n(assumptions.wacc,.09)+.015,days):null,
        bull:legacy?roll(legacy.bull,Math.max(.001,n(assumptions.wacc,.09)-.01),days):null,
        model:legacy?'fcf-fallback':'none',rollForward:!!legacy,sourceFy:f.fy,availableFrom:f.filed||f.date};
    });
  }

  // Bank / Insurance model ported from Excel Bank_Insurance.
  function jukaBankInsurance(input={}){
    const bookValuePerShare=n(input.bookValuePerShare,NaN), roe=n(input.roe,NaN), costOfEquity=n(input.costOfEquity,NaN), growth=n(input.growth,NaN), mos=n(input.marginOfSafety,.20), price=n(input.price,NaN);
    function calc(r,k,g){if(!(bookValuePerShare>0&&r>=0&&k>g))return null;const justifiedPb=(r-g)/(k-g);return {justifiedPb,fairValue:bookValuePerShare*justifiedPb};}
    const bear=calc(Math.max(roe-.02,0),costOfEquity+.01,Math.max(growth-.005,0));
    const base=calc(roe,costOfEquity,growth);
    const bull=calc(roe+.02,Math.max(costOfEquity-.01,.001),growth+.005);
    if(!base)return null;
    const impliedRoe=Number.isFinite(price)&&price>0?growth+(price/bookValuePerShare)*(costOfEquity-growth):null;
    const impliedCostOfEquity=Number.isFinite(price)&&price>0?growth+(roe-growth)/(price/bookValuePerShare):null;
    return {bear:bear?.fairValue??null,base:base.fairValue,bull:bull?.fairValue??null,detail:{bear,base,bull},buyZone:base.fairValue*(1-mos),impliedRoe,impliedCostOfEquity,marketVsBase:Number.isFinite(price)?price/base.fairValue-1:null};
  }

  // REIT model ported from Excel REIT: AFFO growth + exit P/AFFO.
  function jukaReit(input={}){
    const affo=n(input.affoPerShare,NaN), growth=n(input.affoGrowth5y,NaN), exit=n(input.exitPAffo,NaN), cost=n(input.costOfEquity,NaN), mos=n(input.marginOfSafety,.20), price=n(input.price,NaN);
    function calc(g,m,k){if(!(affo>0&&m>0&&k>0))return null;const affoY5=affo*Math.pow(1+g,5),valueY5=affoY5*m,fairValue=valueY5/Math.pow(1+k,5);return {affoY5,valueY5,fairValue};}
    const bear=calc(Math.max(growth-.02,0),Math.max(exit-2,1),cost+.01),base=calc(growth,exit,cost),bull=calc(growth+.02,exit+2,Math.max(cost-.01,.001));
    if(!base)return null;
    const impliedGrowth=Number.isFinite(price)&&price>0?Math.pow(price*Math.pow(1+cost,5)/(affo*exit),1/5)-1:null;
    const impliedExit=Number.isFinite(price)&&price>0?price*Math.pow(1+cost,5)/(affo*Math.pow(1+growth,5)):null;
    return {bear:bear?.fairValue??null,base:base.fairValue,bull:bull?.fairValue??null,detail:{bear,base,bull},buyZone:base.fairValue*(1-mos),impliedGrowth,impliedExit,marketVsBase:Number.isFinite(price)?price/base.fairValue-1:null};
  }

  function classifyValuationModel(stock={}){
    const explicit=String(stock.valuationModel||stock.model||'').toLowerCase();
    if(explicit.includes('bank')||explicit.includes('insurance'))return 'bank-insurance';
    if(explicit.includes('reit'))return 'reit';
    const sector=String(stock.sector||'').toLowerCase();
    if(/bank|insurance|versicher|financial services.*bank/.test(sector))return 'bank-insurance';
    if(/reit|real estate investment trust/.test(sector))return 'reit';
    const symbol=String(stock.s||stock.symbol||'').toUpperCase();
    const knownBanks=new Set(['JPM','BAC','C','WFC','GS','MS','BNP','UBSG','ALV','MUV2']);
    const knownReits=new Set(['O','PLD','NNN','ADC','WPC','REXR','TRNO']);
    if(knownBanks.has(symbol))return 'bank-insurance';
    if(knownReits.has(symbol))return 'reit';
    return 'operating-company';
  }



  function deriveBankInsuranceMetrics(annualFacts=[]){
    const rows=deriveFundamentals(annualFacts),r=rows.at(-1);if(!r)return null;
    const equity=n(r.equity,NaN),shares=n(r.shares,NaN),netIncome=n(r.netIncome,NaN);
    const bvps=equity>0&&shares>0?equity/shares:null;
    const roe=equity>0&&Number.isFinite(netIncome)?netIncome/equity:null;
    const eps=Number.isFinite(Number(r.eps))?Number(r.eps):(shares>0&&Number.isFinite(netIncome)?netIncome/shares:null);
    const roeHistory=rows.slice(-5).map(x=>{const e=n(x.equity,NaN),ni=n(x.netIncome,NaN);return e>0&&Number.isFinite(ni)?ni/e:null;}).filter(Number.isFinite);
    const normalizedRoe=roeHistory.length?median(roeHistory):roe;
    return {
      bvps,roe,normalizedRoe,eps,
      equityCagr:fieldCagr(rows,'equity',rows.length-1,Math.min(5,rows.length-1)),
      epsCagr:fieldCagr(rows,'eps',rows.length-1,Math.min(5,rows.length-1)),
      years:rows.length
    };
  }

  function deriveReitMetrics(annualFacts=[]){
    const rows=deriveFundamentals(annualFacts),r=rows.at(-1);if(!r)return null;
    const shares=n(r.shares,NaN),affo=n(r.affo,NaN),ffo=n(r.ffo,NaN);
    return {
      affo:Number.isFinite(affo)?affo:null,
      ffo:Number.isFinite(ffo)?ffo:null,
      affoPerShare:affo>0&&shares>0?affo/shares:null,
      ffoPerShare:ffo>0&&shares>0?ffo/shares:null,
      affoCagr:fieldCagr(rows,'affo',rows.length-1,Math.min(5,rows.length-1)),
      ffoCagr:fieldCagr(rows,'ffo',rows.length-1,Math.min(5,rows.length-1)),
      shares:Number.isFinite(shares)?shares:null,years:rows.length
    };
  }

  function jukaBankAutoAssumptions(annualFacts=[],overrides={}){
    const m=deriveBankInsuranceMetrics(annualFacts);if(!m)return null;
    const baseRoe=Number.isFinite(m.normalizedRoe)?m.normalizedRoe:(Number.isFinite(m.roe)?m.roe:.10);
    const histGrowth=Number.isFinite(m.equityCagr)?m.equityCagr:.025;
    return {
      bookValuePerShare:n(overrides.bookValuePerShare,m.bvps),
      roe:n(overrides.roe,clamp(baseRoe,0,.30)),
      costOfEquity:n(overrides.costOfEquity,.10),
      growth:n(overrides.growth,clamp(histGrowth,0,.06)),
      marginOfSafety:n(overrides.marginOfSafety,.20),
      source:'history-normalized'
    };
  }

  function jukaReitAutoAssumptions(annualFacts=[],overrides={}){
    const m=deriveReitMetrics(annualFacts);if(!m)return null;
    const overrideAffo=n(overrides.affoPerShare,NaN);
    const affoPerShare=Number.isFinite(overrideAffo)&&overrideAffo>0?overrideAffo:
      (Number.isFinite(m.affoPerShare)&&m.affoPerShare>0?m.affoPerShare:
      (Number.isFinite(m.ffoPerShare)&&m.ffoPerShare>0?m.ffoPerShare:null));
    const affoSource=Number.isFinite(overrideAffo)&&overrideAffo>0?'override':
      (Number.isFinite(m.affoPerShare)&&m.affoPerShare>0?'reported-affo':
      (Number.isFinite(m.ffoPerShare)&&m.ffoPerShare>0?'ffo-proxy':'missing'));
    const histGrowth=Number.isFinite(m.affoCagr)?m.affoCagr:(Number.isFinite(m.ffoCagr)?m.ffoCagr:.03);
    return {
      affoPerShare,
      affoGrowth5y:n(overrides.affoGrowth5y,clamp(histGrowth,0,.10)),
      exitPAffo:n(overrides.exitPAffo,16),
      costOfEquity:n(overrides.costOfEquity,.09),
      marginOfSafety:n(overrides.marginOfSafety,.20),
      source:'history-normalized',
      affoSource,
      confidence:affoSource==='reported-affo'?'hoch':affoSource==='override'?'mittel-hoch':affoSource==='ffo-proxy'?'mittel':'niedrig'
    };
  }

  function jukaValuationEngine(stock={},annualFacts=[],price=null,overrides={}){
    const model=classifyValuationModel(stock),rows=deriveFundamentals(annualFacts),latest=rows.at(-1)||null;
    const readiness=jukaModelReadiness(model,latest,rows);
    const result={model,readiness,modelLabel:model==='operating-company'?'Operatives Unternehmen':model==='bank-insurance'?'Bank / Versicherung':'REIT',assumptions:null,valuation:null,relative:null,reverse:null,quality:jukaQualityScoreV2(stock,rows),diagnostics:[]};

    if(model==='operating-company'){
      if(!readiness.ready){result.diagnostics.push(`Pflichtdaten fehlen: ${readiness.missingRequired.join(', ')}`);return result;}
      const auto=jukaAutoAssumptions(rows,overrides);
      const a=auto?.assumptions||{};
      const inp=dcfInputFromAnnual(rows,rows.length-1,{
        growthY1:a.growthY1,growthY5:a.growthY5,targetEbitMarginY5:a.targetEbitMarginY5,
        taxRate:a.taxRate,wacc:n(overrides.wacc,.09),terminalGrowth:n(overrides.terminalGrowth,.025),
        terminalRoic:overrides.terminalRoic,capexPctY5:overrides.capexPctY5,daPctY5:overrides.daPctY5,nwcPctY5:overrides.nwcPctY5
      });
      result.assumptions={dcf:inp,auto};
      if(!inp)return result;
      result.valuation=jukaDcfScenarios(inp);
      result.reverse=Number(price)>0?jukaReverseDcf(inp,Number(price)):null;
      const forecast=jukaForecast5Y(rows,a);
      result.relative=jukaRelativeByModel(model,{price:Number(price),epsTtm:latest?.eps,epsY5:forecast?.summary?.epsY5,fairValue:result.valuation?.base});
      return result;
    }

    if(model==='bank-insurance'){
      result.assumptions=jukaBankAutoAssumptions(rows,overrides);
      if(!readiness.ready||!result.assumptions){result.diagnostics.push(`Bankmodell nicht bereit: ${readiness.missingRequired.join(', ')}`);return result;}
      result.valuation=jukaBankInsurance({...result.assumptions,price:Number(price)});
      result.reverse=result.valuation?{impliedRoe:result.valuation.impliedRoe,impliedCostOfEquity:result.valuation.impliedCostOfEquity}:null;
      const m=deriveBankInsuranceMetrics(rows);
      result.relative=jukaRelativeByModel(model,{price:Number(price),epsTtm:m?.eps,bookValuePerShare:m?.bvps,roe:m?.roe});
      return result;
    }

    if(model==='reit'){
      result.assumptions=jukaReitAutoAssumptions(rows,overrides);
      if(!readiness.ready||!result.assumptions||!(result.assumptions.affoPerShare>0)){result.diagnostics.push(`REIT-Modell nicht bereit: ${readiness.missingRequired.join(', ')}`);return result;} if(result.assumptions.affoSource==='ffo-proxy')result.diagnostics.push('FFO wird transparent als AFFO-Näherung verwendet; Fair Value hat mittlere Konfidenz.');
      result.valuation=jukaReit({...result.assumptions,price:Number(price)});
      result.reverse=result.valuation?{impliedGrowth:result.valuation.impliedGrowth,impliedExit:result.valuation.impliedExit}:null;
      result.relative=jukaRelativeByModel(model,{
        price:Number(price),affoPerShare:result.assumptions.affoPerShare,
        affoY5:result.valuation?.detail?.base?.affoY5,exitPAffo:result.assumptions.exitPAffo
      });
      return result;
    }
    return result;
  }

  function buildHistoricalValuationSeries(stock={},priceRows=[],annualFacts=[],overrides={}){
    if(!Array.isArray(priceRows)||!priceRows.length)return [];
    const rows=deriveFundamentals(annualFacts);
    const model=classifyValuationModel(stock);
    const dated=rows.map((x,i)=>({x,i,available:String(x.filed||x.date||'')})).filter(x=>x.available).sort((a,b)=>a.available.localeCompare(b.available));
    const cache=new Map();
    const roll=(v,rate,days)=>{
      if(!Number.isFinite(Number(v)))return null;
      const r=Number.isFinite(Number(rate))?Number(rate):.09;
      return Number(v)*Math.pow(1+r,Math.max(0,days)/365.25);
    };
    const out=priceRows.map(p=>{
      const date=String(p.date||'').slice(0,10);let chosen=null;
      for(const d of dated){if(d.available<=date)chosen=d;else break;}
      if(!chosen)return {...p,bear:null,base:null,bull:null,model,sourceFy:null,availableFrom:null};
      if(!cache.has(chosen.i)){
        const slice=rows.slice(0,chosen.i+1);
        const engine=jukaValuationEngine(stock,slice,p.price,overrides);
        cache.set(chosen.i,engine);
      }
      const engine=cache.get(chosen.i),v=engine?.valuation,a=engine?.assumptions;
      if(!v||!Number.isFinite(Number(v.base)))return {...p,bear:null,base:null,bull:null,model,sourceFy:chosen.x.fy,availableFrom:chosen.available};
      const days=Math.max(0,(Date.parse(date)-Date.parse(chosen.available))/86400000);
      let rate=.09;
      if(model==='operating-company')rate=n(a?.dcf?.wacc,.09);
      if(model==='bank-insurance')rate=n(a?.costOfEquity,.10);
      if(model==='reit')rate=n(a?.costOfEquity,.09);
      return {...p,
        bear:roll(v.bear,rate+(model==='operating-company'?0.015:0),days),
        base:roll(v.base,rate,days),
        bull:roll(v.bull,Math.max(.001,rate-(model==='operating-company'?0.01:0)),days),
        model,sourceFy:chosen.x.fy,availableFrom:chosen.available,
        valuationEngine:engine?.readiness?.valuationEngine||null,
        confidence:engine?.readiness?.confidence||null
      };
    });
    return out.some(x=>x.base!==null&&x.base!==undefined&&Number.isFinite(Number(x.base)))?out:[];
  }

  function jukaRiskAudit({model='operating-company',price=null,valuation=null,quality=null,readiness=null,dataQuality=null,reverse=null}={}){
    const issues=[],positives=[];
    if(readiness&&!readiness.ready)issues.push(`Pflichtdaten fehlen: ${(readiness.missingRequired||[]).join(', ')}`);
    if(dataQuality?.score<50)issues.push('Niedrige Datenqualität');
    if(dataQuality?.score>=80)positives.push('Hohe Datenqualität');
    if(Number(price)>0&&Number(valuation?.base)>0){
      const gap=Number(price)/Number(valuation.base)-1;
      if(gap>.30)issues.push('Preis >30% über Base Fair Value');
      if(gap<-.25)positives.push('Preis >25% unter Base Fair Value');
    }
    if(model==='operating-company'&&quality){
      if(quality.score<50)issues.push('Schwacher Quality Score');
      if(quality.score>=75)positives.push('Starker Quality Score');
    }
    if(reverse?.waccGap!=null&&reverse.waccGap<-.02)issues.push('Marktpreis verlangt deutlich niedrigeren WACC');
    if(reverse?.impliedGrowthAdjustment!=null&&reverse.impliedGrowthAdjustment>.06)issues.push('Marktpreis verlangt >6pp Wachstumsaufschlag');
    return {severity:issues.length>=3?'hoch':issues.length?'mittel':'niedrig',issues,positives};
  }

  function modelDataRequirements(model='operating-company'){
    model=String(model||'operating-company');
    if(model==='bank-insurance')return {
      required:['equity','shares','netIncome'],
      recommended:['eps'],
      valuationEngine:'Residual Income / justified P/B'
    };
    if(model==='reit')return {
      required:['affo','shares'],
      recommended:['eps'],
      valuationEngine:'AFFO + Exit-Multiple'
    };
    return {
      required:['revenue','operatingIncome','da','capex','shares'],
      recommended:['cash','debt','pretaxIncome','incomeTax','fcf'],
      valuationEngine:'10J-FCFF-DCF'
    };
  }

  function jukaModelReadiness(model='operating-company', latest=null, annualFacts=[]){
    const req=modelDataRequirements(model), row=latest||{};
    const usable=(field)=>{
      const v=Number(row[field]);
      if(!Number.isFinite(v))return false;
      if(['revenue','shares','equity','affo','ffo'].includes(field))return v>0;
      return true;
    };
    let missingRequired=req.required.filter(f=>!usable(f));
    let missingRecommended=req.recommended.filter(f=>!usable(f));
    let proxyUsed=false;
    if(model==='reit'){
      const hasAffo=usable('affo'),hasFfo=usable('ffo'),hasShares=usable('shares');
      missingRequired=[];
      if(!hasShares)missingRequired.push('shares');
      if(!hasAffo&&!hasFfo)missingRequired.push('affo/ffo');
      proxyUsed=!hasAffo&&hasFfo;
      missingRecommended=hasAffo?[]:['affo'];
    }
    const years=(annualFacts||[]).filter(x=>x&&x.date).length;
    const ready=missingRequired.length===0;
    const allFields=model==='reit'?['shares','affo','ffo']:req.required.concat(req.recommended);
    const coverage=allFields.length?allFields.filter(usable).length/allFields.length:0;
    let label=ready?(missingRecommended.length?'bewertungsbereit':'vollständig'):(latest?'teilweise':'keine Fundamentals');
    if(model==='reit'&&ready&&proxyUsed)label='bewertungsbereit · FFO-Proxy';
    const confidence=!ready?'niedrig':
      model==='reit'&&proxyUsed?'mittel':
      missingRecommended.length?'mittel-hoch':'hoch';
    return {
      model,ready,label,coverage,years,confidence,proxyUsed,
      required:req.required,recommended:req.recommended,
      missingRequired,missingRecommended,valuationEngine:req.valuationEngine
    };
  }

  function jukaRelativeByModel(model,input={}){
    model=String(model||'operating-company'); const price=n(input.price,NaN);
    if(model==='reit'){
      const affo=n(input.affoPerShare,NaN),affoY5=n(input.affoY5,NaN);
      return {model,paFFO:Number.isFinite(price)&&affo>0?price/affo:null,paFFOY5:Number.isFinite(price)&&affoY5>0?price/affoY5:null,exitPAffo:n(input.exitPAffo,NaN)};
    }
    if(model==='bank-insurance'){
      const eps=n(input.epsTtm,NaN),bvps=n(input.bookValuePerShare,NaN);
      return {model,pe:Number.isFinite(price)&&eps>0?price/eps:null,pb:Number.isFinite(price)&&bvps>0?price/bvps:null,roe:n(input.roe,NaN)};
    }
    return {model,...jukaRelativeValuation(input)};
  }



  // Relative valuation against a peer set. Only comparable, available metrics are used.
  function peerMetricSet(model='operating-company'){
    model=String(model);
    if(model==='bank-insurance')return ['pe','pb'];
    if(model==='reit')return ['paFFO'];
    return ['pe','evEbit','pFcf'];
  }
  function jukaPeerComparison(subject={}, peers=[], model='operating-company'){
    const metrics=peerMetricSet(model), rows=[], subjectMetrics={};
    for(const k of metrics){const v=Number(subject[k]);if(Number.isFinite(v)&&v>0)subjectMetrics[k]=v;}
    for(const p of peers||[]){const m={};for(const k of metrics){const v=Number(p[k]);if(Number.isFinite(v)&&v>0)m[k]=v;}if(Object.keys(m).length)rows.push({symbol:p.symbol||p.s||'—',name:p.name||p.n||p.symbol||p.s||'Peer',metrics:m});}
    const medians={},comparisons={};let available=0,scoreSum=0;
    for(const k of metrics){
      const med=median(rows.map(r=>r.metrics[k]));medians[k]=med;const sv=subjectMetrics[k];
      if(Number.isFinite(sv)&&Number.isFinite(med)&&med>0){const delta=sv/med-1;comparisons[k]={subject:sv,median:med,delta};available++;scoreSum+=clamp(-delta*4,-2,2);}
      else comparisons[k]=null;
    }
    const score=available?scoreSum/available:null;
    const label=score==null?'nicht verfügbar':score>=1?'deutlich günstiger':score>=.35?'günstiger':score<=-1?'deutlich teurer':score<=-.35?'teurer':'ähnlich bewertet';
    return {model,metrics,rows,subject:subjectMetrics,medians,comparisons,available,score,label};
  }
  function valuationMultiplesFromSnapshot(snapshot={}){
    const price=Number(snapshot.price),latest=snapshot.latest||{},shares=Number(latest.shares),debt=Number(latest.debt),cash=Number(latest.cash),eps=Number(latest.eps),ebit=Number(latest.operatingIncome),fcf=Number(latest.fcf),equity=Number(latest.equity),affo=Number(latest.affo);
    const marketCap=Number.isFinite(price)&&Number.isFinite(shares)?price*shares:null;
    const enterpriseValue=Number.isFinite(marketCap)?marketCap+(Number.isFinite(debt)?debt:0)-(Number.isFinite(cash)?cash:0):null;
    return {pe:Number.isFinite(price)&&eps>0?price/eps:null,evEbit:Number.isFinite(enterpriseValue)&&ebit>0?enterpriseValue/ebit:null,pFcf:Number.isFinite(marketCap)&&fcf>0?marketCap/fcf:null,pb:Number.isFinite(marketCap)&&equity>0?marketCap/equity:null,paFFO:Number.isFinite(price)&&affo>0?price/affo:null};
  }

  // Multi-engine reality check. This is deliberately explanatory rather than a buy/sell recommendation.
  function jukaRealityCheck(input={}){
    const price=n(input.price,NaN), fair=n(input.fairValue,NaN), quality=n(input.qualityScore,NaN);
    const model=String(input.model||'operating-company');
    const rel=input.relative||{}, reverse=input.reverse||{};
    const valuation=Number.isFinite(price)&&price>0&&Number.isFinite(fair)&&fair>0?price/fair-1:null;
    let valuationScore=0;
    if(Number.isFinite(valuation)){
      if(valuation<=-.25)valuationScore=2; else if(valuation<=-.10)valuationScore=1;
      else if(valuation>=.25)valuationScore=-2; else if(valuation>=.10)valuationScore=-1;
    }
    let qualityScore=0;
    if(Number.isFinite(quality)){if(quality>=80)qualityScore=2;else if(quality>=65)qualityScore=1;else if(quality<45)qualityScore=-2;else if(quality<55)qualityScore=-1;}
    let relativeScore=0, relativeText='Relative Bewertung nicht ausreichend belegt.';
    if(model==='operating-company'&&Number.isFinite(rel.pe)&&Number.isFinite(rel.peY5)){
      const compression=rel.peY5/rel.pe;
      if(rel.peY5<=15&&compression<=.8)relativeScore=1;
      if(rel.peY5>=30)relativeScore=-1;
      relativeText=`KGV ${rel.pe.toFixed(1)}×; Modell-KGV J5 ${rel.peY5.toFixed(1)}×.`;
    }else if(model==='bank-insurance'&&Number.isFinite(rel.pb)&&Number.isFinite(rel.roe)){
      if(rel.roe>=.15&&rel.pb<=2)relativeScore=1;
      if(rel.roe<.08&&rel.pb>1.5)relativeScore=-1;
      relativeText=`K/B ${rel.pb.toFixed(2)}× bei ROE ${(rel.roe*100).toFixed(1)}%.`;
    }else if(model==='reit'&&Number.isFinite(rel.paFFO)){
      if(rel.paFFO<=15)relativeScore=1; else if(rel.paFFO>=25)relativeScore=-1;
      relativeText=`P/AFFO ${rel.paFFO.toFixed(1)}×.`;
    }
    const total=valuationScore+qualityScore+relativeScore;
    const label=total>=3?'attraktiv':total>=1?'eher attraktiv':total<=-3?'anspruchsvoll':total<=-1?'eher anspruchsvoll':'ausgewogen';
    const confidence=[valuation,Number.isFinite(quality)?quality:null,
      (model==='operating-company'?rel.pe:model==='bank-insurance'?rel.pb:rel.paFFO)].filter(Number.isFinite).length;
    const drivers=[];
    if(Number.isFinite(valuation))drivers.push(`${Math.abs(valuation*100).toFixed(1)}% ${valuation<0?'unter':'über'} dem Base-Fair-Value`);
    if(Number.isFinite(quality))drivers.push(`Qualität ${quality.toFixed(0)}/100`);
    drivers.push(relativeText);
    let breaker='Mehr Fundamentaldaten nötig.';
    if(model==='operating-company'){
      if(Number.isFinite(reverse.impliedGrowth))breaker=`Der heutige Kurs wird u. a. bei ca. ${(reverse.impliedGrowth*100).toFixed(1)}% Umsatzwachstum J1 gerechtfertigt (bei sonst konstanten Base-Annahmen).`;
      else if(Number.isFinite(reverse.impliedMargin))breaker=`Der heutige Kurs impliziert ca. ${(reverse.impliedMargin*100).toFixed(1)}% EBIT-Marge J5.`;
    }else if(model==='bank-insurance'&&Number.isFinite(reverse.impliedRoe)) breaker=`Der Kurs impliziert ca. ${(reverse.impliedRoe*100).toFixed(1)}% nachhaltige ROE.`;
    else if(model==='reit'&&Number.isFinite(reverse.impliedGrowth)) breaker=`Der Kurs impliziert ca. ${(reverse.impliedGrowth*100).toFixed(1)}% AFFO-Wachstum p.a. über fünf Jahre.`;
    return {model,label,total,confidence,valuation,drivers,breaker,components:{valuationScore,qualityScore,relativeScore}};
  }

  function filterPeriod(rows,period){const months={"1Y":12,"3Y":36,"5Y":60,"MAX":9999}[period]||60;return rows.slice(Math.max(0,rows.length-months-1));}
  function dataRoute(stock={}){const region=String(stock.region||'').toUpperCase();if(region==='US')return {market:'twelve-data',fundamentals:'sec',filings:'sec',currency:stock.currency||'USD'};if(region==='EU')return {market:'twelve-data-or-eod-adapter',fundamentals:'eu-adapter',filings:'issuer-reports',currency:stock.currency||'EUR'};return {market:'generic-adapter',fundamentals:'generic-adapter',filings:'issuer-reports',currency:stock.currency||'USD'};}
  function buildFairSeries(priceRows, annualFacts, assumptions={}){
    if(!Array.isArray(priceRows)||!priceRows.length)return [];
    const facts=(annualFacts||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    return priceRows.map(row=>{const d=String(row.date);let fact=null;for(const f of facts){if(String(f.date)<=d)fact=f;else break;}if(!fact)return {...row,base:null,bear:null,bull:null};const growth=Number.isFinite(fact.revenueCagr3y)?clamp(fact.revenueCagr3y,-.02,.22):n(assumptions.growth,.08);const inp={fcf0:n(fact.fcf),growth,fadeGrowth:n(assumptions.fadeGrowth,.04),wacc:n(assumptions.wacc,.09),terminalGrowth:n(assumptions.terminalGrowth,.025),years:n(assumptions.years,10),netCash:n(fact.netCash),shares:n(fact.shares)};const s=scenarioValues(inp);return {...row,base:s?.base??null,bear:s?.bear??null,bull:s?.bull??null};});
  }
  return {n,clamp,median,cagr,valuationPct,qualityScore,jukaQualityScore,jukaQualityScoreV2,jukaPerformanceWindows,jukaChartSlice,jukaInvestorFundamentals,dcfFairValue,scenarioValues,jukaDcf10Y,jukaDcfScenarios,jukaReverseDcf,jukaSensitivity,jukaDataQuality,jukaCompanyProfile,jukaAutoAssumptions,jukaForecast5Y,jukaForecastScenarios,jukaExpectedReturnMatrix,jukaReturnBridge,jukaRelativeValuation,jukaBankInsurance,jukaReit,classifyValuationModel,deriveBankInsuranceMetrics,deriveReitMetrics,jukaBankAutoAssumptions,jukaReitAutoAssumptions,jukaValuationEngine,jukaRiskAudit,modelDataRequirements,jukaModelReadiness,jukaRelativeByModel,peerMetricSet,jukaPeerComparison,valuationMultiplesFromSnapshot,jukaRealityCheck,deriveFundamentals,qualityInputFromAnnual,dcfInputFromAnnual,buildHistoricalJukaFairSeries,buildHistoricalValuationSeries,filterPeriod,dataRoute,buildFairSeries};
});
