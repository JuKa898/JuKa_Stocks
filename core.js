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
    return {version:'JUKA Quality Score 2.0',model,score,grade,label,coverage,confidence,years:rows.length,verdict,recommendation,strengths,weaknesses,parts:factors};
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


  // JUKA Fair Value 2.0
  // Company-specific operating assumptions derived from the company's own history.
  // The market price is deliberately NOT used to calibrate the base assumptions.
  function weightedAverage(items=[]){
    let s=0,w=0;
    for(const [v,weight] of items){if(Number.isFinite(Number(v))&&Number.isFinite(Number(weight))&&Number(weight)>0){s+=Number(v)*Number(weight);w+=Number(weight);}}
    return w?s/w:null;
  }
  function robustRecentMedian(rows,key,years=5){
    return median(rows.slice(-Math.max(1,years)).map(r=>Number(r?.[key])).filter(Number.isFinite));
  }
  function jukaOperatingRawAssumptions(annualFacts=[],overrides={}){
    const rows=deriveFundamentals(annualFacts),r=rows.at(-1),q=jukaDataQuality(rows),p=jukaCompanyProfile(rows);
    if(!r||!p)return null;

    const g1=Number(r.revenueGrowthYoY);
    const g3=fieldCagr(rows,'revenue',rows.length-1,3);
    const g5=fieldCagr(rows,'revenue',rows.length-1,5);
    const growthVol=Number(p.growthVol);
    let growthY1=weightedAverage([[g1,.45],[g3,.35],[g5,.20]]);
    if(!Number.isFinite(growthY1))growthY1=Number.isFinite(g3)?g3:Number.isFinite(g5)?g5:.06;
    // Volatile/cyclical histories get less extrapolation of the latest year, not a blanket haircut.
    if(Number.isFinite(growthVol)&&growthVol>.10){
      const anchor=weightedAverage([[g3,.6],[g5,.4]]);
      if(Number.isFinite(anchor))growthY1=.55*growthY1+.45*anchor;
    }
    growthY1=clamp(growthY1,-.08,.32);

    // Company-specific year-5 growth: preserve durable growth when 5Y history supports it,
    // but force a gradual convergence toward a mature-company range.
    const durable=weightedAverage([[g5,.55],[g3,.45]]);
    const maturityAnchor=clamp(Number.isFinite(durable)?durable*.62:.04,.025,.10);
    let growthY5=clamp(weightedAverage([[maturityAnchor,.70],[growthY1,.30]]),.02,.14);
    if(growthY1<.04)growthY5=clamp(weightedAverage([[growthY1,.45],[.03,.55]]),.01,.06);

    const latestMargin=Number(r.operatingMargin);
    const margin3=robustRecentMedian(rows,'operatingMargin',3);
    const margin5=robustRecentMedian(rows,'operatingMargin',5);
    const oldMargin=rows.length>=4?Number(rows[rows.length-4].operatingMargin):null;
    const marginTrend=Number.isFinite(latestMargin)&&Number.isFinite(oldMargin)?(latestMargin-oldMargin)/3:0;
    let targetMargin=weightedAverage([[latestMargin,.45],[margin3,.35],[margin5,.20]]);
    if(!Number.isFinite(targetMargin))targetMargin=Number(r.operatingIncome)/Number(r.revenue);
    targetMargin=clamp(targetMargin+clamp(marginTrend*2,-.025,.025),-.05,.65);

    const fcf3=robustRecentMedian(rows,'fcfMargin',3),fcf5=robustRecentMedian(rows,'fcfMargin',5);
    let targetFcf=weightedAverage([[Number(r.fcfMargin),.40],[fcf3,.35],[fcf5,.25]]);
    if(!Number.isFinite(targetFcf))targetFcf=Number(r.fcfMargin);

    const roics=rows.slice(-5).map(x=>Number(x.roic)).filter(x=>Number.isFinite(x)&&x>0);
    const roicMedian=median(roics);
    const roicVol=stdev(roics);
    // Terminal ROIC fades toward a competitive steady state. High, stable ROIC retains more of its economics.
    const persistence=Number.isFinite(roicVol)&&Number.isFinite(roicMedian)&&roicMedian>0
      ? clamp(1-roicVol/Math.max(roicMedian,.05),.25,.85):.50;
    const terminalRoic=clamp(Number.isFinite(roicMedian)?(.10+(roicMedian-.10)*persistence):.12,.08,.30);

    const debt=Number(r.debt),cash=Number(r.cash),ebitda=Number(r.ebitda);
    const leverage=Number.isFinite(debt)&&Number.isFinite(ebitda)&&ebitda>0?debt/ebitda:0;
    // WACC is a transparent risk proxy until a reliable live beta / capital-market feed is available.
    // It varies by company fundamentals instead of being fixed at 9%.
    let wacc=.0825;
    if(Number.isFinite(growthVol))wacc+=clamp((growthVol-.06)*.10,-.004,.012);
    if(Number.isFinite(p.marginVol))wacc+=clamp((p.marginVol-.04)*.08,-.003,.008);
    if(Number.isFinite(leverage))wacc+=clamp(leverage*.003,0,.012);
    // Cash is valued in the equity bridge, not as a reduction of operating risk.
    // Data quality changes confidence/release status, never the economic discount rate.
    wacc=clamp(wacc,.065,.115);

    const terminalGrowth=clamp(weightedAverage([[growthY5,.35],[.025,.65]]),.02,.035);
    if(wacc<=terminalGrowth+.02)wacc=terminalGrowth+.02;

    const capexPct=robustRecentMedian(rows,'capex',3);
    const revenueMedian=robustRecentMedian(rows,'revenue',3);
    const capexRatio=rows.slice(-5).map(x=>Number(x.capex)/Number(x.revenue)).filter(Number.isFinite);
    const daRatio=rows.slice(-5).map(x=>Number(x.da)/Number(x.revenue)).filter(Number.isFinite);
    const nwcRatio=rows.slice(-5).map(x=>Number(x.deltaNwc)/Number(x.revenue)).filter(Number.isFinite);
    let capexPctY5=median(capexRatio);
    const daPctY5=median(daRatio);
    const nwcPctY5=median(nwcRatio);
    // Do not extrapolate a single investment-spike year forever. The 5Y median remains company-specific,
    // while a very large latest CapEx jump is faded toward that median.
    const latestCapexRatio=Number(r.capex)/Number(r.revenue);
    if(Number.isFinite(capexPctY5)&&Number.isFinite(latestCapexRatio)&&latestCapexRatio>capexPctY5*1.45)
      capexPctY5=weightedAverage([[capexPctY5,.80],[latestCapexRatio,.20]]);

    // Scenario width adapts to observed business volatility and data confidence.
    const uncertainty=clamp((Number.isFinite(growthVol)?growthVol:.06)+(.01*(100-q.score)/30),.035,.11);
    const growthSpread=clamp(uncertainty*.45,.018,.05);
    const marginSpread=clamp((Number.isFinite(p.marginVol)?p.marginVol:.04)*.60+.012,.018,.05);
    const waccSpread=clamp(.0075+uncertainty*.07,.009,.016);

    const shareGrowth=clamp(Number.isFinite(p.shareGrowth)?p.shareGrowth:0,-.06,.06);
    const taxRates=rows.slice(-5).map(x=>Number(x.taxRate)).filter(x=>Number.isFinite(x)&&x>=.08&&x<=.35);
    const taxMedian=median(taxRates);
    const assumptions={
      growthY1:n(overrides.growthY1,growthY1),
      growthY5:n(overrides.growthY5,growthY5),
      targetEbitMarginY5:n(overrides.targetEbitMarginY5,targetMargin),
      targetFcfMarginY5:n(overrides.targetFcfMarginY5,targetFcf),
      taxRate:n(overrides.taxRate,Number.isFinite(taxMedian)?taxMedian:(Number.isFinite(r.taxRate)?r.taxRate:.21)),
      shareGrowth:n(overrides.shareGrowth,shareGrowth),
      wacc:n(overrides.wacc,wacc),
      terminalGrowth:n(overrides.terminalGrowth,terminalGrowth),
      terminalRoic:n(overrides.terminalRoic,terminalRoic),
      capexPctY5:n(overrides.capexPctY5,Number.isFinite(capexPctY5)?capexPctY5:Number(r.capex)/Number(r.revenue)),
      daPctY5:n(overrides.daPctY5,Number.isFinite(daPctY5)?daPctY5:Number(r.da)/Number(r.revenue)),
      nwcPctY5:n(overrides.nwcPctY5,Number.isFinite(nwcPctY5)?nwcPctY5:0),
      bearGrowthAdj:n(overrides.bearGrowthAdj,-growthSpread),
      bearMarginAdj:n(overrides.bearMarginAdj,-marginSpread),
      bearWaccAdj:n(overrides.bearWaccAdj,waccSpread),
      bullGrowthAdj:n(overrides.bullGrowthAdj,growthSpread),
      bullMarginAdj:n(overrides.bullMarginAdj,marginSpread),
      bullWaccAdj:n(overrides.bullWaccAdj,-Math.min(.012,waccSpread*.75))
    };
    return {assumptions,profile:p,dataQuality:q,metrics:{g1,g3,g5,growthVol,margin3,margin5,marginTrend,roicMedian,roicVol,persistence,leverage,uncertainty},source:'company-history-adaptive'};
  }

  // Walk-forward self-check: each historical prediction is built only with data that existed at that anchor.
  // It measures systematic one-year growth and margin errors and can apply a small bias correction.
  function jukaOperatingSelfCheck(annualFacts=[]){
    const rows=deriveFundamentals(annualFacts),tests=[];
    for(let i=3;i<rows.length;i++){
      const hist=rows.slice(0,i),actual=rows[i],prev=rows[i-1];
      const raw=jukaOperatingRawAssumptions(hist,{});
      if(!raw)continue;
      const predGrowth=raw.assumptions.growthY1;
      const actualGrowth=Number(prev.revenue)>0&&Number(actual.revenue)>0?Number(actual.revenue)/Number(prev.revenue)-1:null;
      const predMargin=Number(prev.operatingMargin)+(raw.assumptions.targetEbitMarginY5-Number(prev.operatingMargin))/5;
      const actualMargin=Number(actual.operatingMargin);
      tests.push({
        sourceFy:prev.fy,targetFy:actual.fy,
        growthError:Number.isFinite(actualGrowth)?predGrowth-actualGrowth:null,
        marginError:Number.isFinite(actualMargin)&&Number.isFinite(predMargin)?predMargin-actualMargin:null
      });
    }
    const ge=tests.map(x=>x.growthError).filter(Number.isFinite),me=tests.map(x=>x.marginError).filter(Number.isFinite);
    const growthBias=ge.length?ge.reduce((s,x)=>s+x,0)/ge.length:null;
    const marginBias=me.length?me.reduce((s,x)=>s+x,0)/me.length:null;
    const growthMae=ge.length?ge.reduce((s,x)=>s+Math.abs(x),0)/ge.length:null;
    const marginMae=me.length?me.reduce((s,x)=>s+Math.abs(x),0)/me.length:null;
    return {tests,count:tests.length,growthBias,marginBias,growthMae,marginMae};
  }

  function jukaAdaptiveOperatingAssumptions(annualFacts=[],overrides={}){
    const raw=jukaOperatingRawAssumptions(annualFacts,overrides);
    if(!raw)return null;
    const selfCheck=jukaOperatingSelfCheck(annualFacts);
    const a={...raw.assumptions};
    // Only correct systematic historical bias; cap corrections so the backtest cannot dominate current fundamentals.
    if(overrides.growthY1==null&&Number.isFinite(selfCheck.growthBias)&&selfCheck.count>=2)
      a.growthY1=clamp(a.growthY1-clamp(selfCheck.growthBias,-.025,.025),-.08,.32);
    if(overrides.targetEbitMarginY5==null&&Number.isFinite(selfCheck.marginBias)&&selfCheck.count>=2)
      a.targetEbitMarginY5=clamp(a.targetEbitMarginY5-clamp(selfCheck.marginBias,-.02,.02),-.05,.65);
    return {...raw,assumptions:a,selfCheck,source:'company-history+self-check'};
  }

  function jukaFairValueConfidence({annualFacts=[],valuation=null,selfCheck=null,dataQuality=null,sensitivity=null}={}){
    const rows=deriveFundamentals(annualFacts);
    let score=50;
    score+=Math.min(15,Math.max(0,rows.length-3)*3);
    if(dataQuality)score+=(Number(dataQuality.score)-70)*.25;
    if(selfCheck?.count>=2){
      if(Number.isFinite(selfCheck.growthMae))score+=selfCheck.growthMae<=.04?8:selfCheck.growthMae<=.08?3:-5;
      if(Number.isFinite(selfCheck.marginMae))score+=selfCheck.marginMae<=.025?7:selfCheck.marginMae<=.05?2:-5;
    }
    const terminalShare=valuation?.detail?.base?.terminalShare;
    if(Number.isFinite(terminalShare))score+=terminalShare<=.60?8:terminalShare<=.75?3:-6;
    if(sensitivity?.values){
      const vals=sensitivity.values.flat().filter(x=>Number.isFinite(x)&&x>0),base=valuation?.base;
      if(vals.length&&base>0){
        const lo=Math.min(...vals),hi=Math.max(...vals),spread=(hi-lo)/base;
        score+=spread<=.65?6:spread<=1.2?1:-5;
      }
    }
    score=Math.round(clamp(score,0,100));
    return {score,label:score>=80?'hoch':score>=60?'mittel':'niedrig'};
  }

  function jukaFairValueDrivers(adaptive={},valuation=null){
    const a=adaptive?.assumptions||{},m=adaptive?.metrics||{},out=[];
    if(Number.isFinite(a.growthY1))out.push({driver:'Wachstum',effect:a.growthY1>=.10?'positiv':a.growthY1<.03?'belastend':'neutral',detail:`J1 ${(a.growthY1*100).toFixed(1)}%, J5 ${(a.growthY5*100).toFixed(1)}%`});
    if(Number.isFinite(a.targetEbitMarginY5))out.push({driver:'Profitabilität',effect:a.targetEbitMarginY5>=.20?'positiv':'neutral',detail:`EBIT-Marge J5 ${(a.targetEbitMarginY5*100).toFixed(1)}%`});
    if(Number.isFinite(a.terminalRoic))out.push({driver:'Kapitalrendite',effect:a.terminalRoic>=.15?'positiv':'neutral',detail:`Terminal-ROIC ${(a.terminalRoic*100).toFixed(1)}%`});
    if(Number.isFinite(a.wacc))out.push({driver:'Diskontsatz',effect:a.wacc>=.095?'belastend':a.wacc<=.08?'positiv':'neutral',detail:`WACC ${(a.wacc*100).toFixed(1)}%`});
    if(Number.isFinite(valuation?.detail?.base?.terminalShare))out.push({driver:'Terminalwert',effect:valuation.detail.base.terminalShare>.75?'Risiko':'neutral',detail:`Anteil ${(valuation.detail.base.terminalShare*100).toFixed(0)}%`});
    return out;
  }



  // JUKA Fundamental Forecast Engine 1.0
  // Forecasts are constrained by company size, historical decay, marginal capital returns
  // and observed reinvestment. Historical growth is evidence, not the forecast itself.

  function jukaRdPolicy(stock={},annualFacts=[]){
    const rows=deriveFundamentals(annualFacts),latest=rows.at(-1)||{};
    const rd=Number(latest.rd??latest.researchAndDevelopment);
    const revenue=Number(latest.revenue);
    const intensity=revenue>0&&Number.isFinite(rd)?rd/revenue:null;
    const s=String(stock.s||stock.symbol||'').toUpperCase();

    // R&D capitalization is only appropriate when the reported line is sufficiently
    // separable from physical infrastructure / operations. Never infer an R&D amount.
    const mixedTechnologyCost=['AMZN'].includes(s);
    if(mixedTechnologyCost)return {eligible:false,life:null,intensity,reason:'Gemischte Technology/Infrastructure-Kosten sind kein sauber separierbares R&D.'};
    if(!Number.isFinite(intensity))return {eligible:false,life:null,intensity:null,reason:'Keine belastbare R&D-Intensität.'};
    if(intensity<.015)return {eligible:false,life:null,intensity,reason:'R&D für Bewertungsanpassung nicht materiell.'};

    // Economic useful life by broad innovation economics, not ticker-specific fair-value tuning.
    // Semiconductors: shorter product cycles; software/platforms: medium; pharma: longer.
    const semi=['NVDA','AMD','INTC','QCOM','TXN','MU','AVGO'].includes(s);
    const pharma=['JNJ','MRK','ABBV'].includes(s);
    const softwarePlatform=['META','MSFT','GOOGL','GOOG','CRM','ORCL','ADBE'].includes(s);
    let life=5,group='general-rd';
    if(semi){life=4;group='semiconductor';}
    else if(pharma){life=8;group='pharma';}
    else if(softwarePlatform){life=5;group='software-platform';}
    return {eligible:true,life,intensity,group,reason:'Materielle, separat berichtete R&D-Historie.'};
  }

  function jukaRdCapitalization(annualFacts=[],life=5){
    const rows=deriveFundamentals(annualFacts);
    const rd=rows.map(x=>Number(x.rd??x.researchAndDevelopment??x.researchDevelopment)).map(x=>Number.isFinite(x)&&x>=0?x:null);
    const usable=rd.filter(Number.isFinite);
    if(usable.length<3)return {available:false,reason:'R&D-Historie nicht ausreichend',rows};
    life=clamp(Math.round(life),3,10);
    const out=rows.map((x,i)=>{
      const current=rd[i];
      if(!Number.isFinite(current))return {...x};
      let asset=0,amort=0;
      for(let age=0;age<life;age++){
        const j=i-age;if(j<0||!Number.isFinite(rd[j]))continue;
        const remaining=(life-age)/life;
        asset+=rd[j]*remaining;
        amort+=rd[j]/life;
      }
      const adjustedOperatingIncome=Number(x.operatingIncome)+current-amort;
      const adjustedEquity=Number.isFinite(Number(x.equity))?Number(x.equity)+asset:null;
      return {...x,rdAsset:asset,rdAmortization:amort,adjustedOperatingIncome,adjustedEquity};
    });
    const latest=out.at(-1);
    return {available:true,life,rows:out,latest,metrics:{
      rdAsset:latest?.rdAsset??null,rdAmortization:latest?.rdAmortization??null,
      accountingOperatingIncome:Number(rows.at(-1)?.operatingIncome),
      adjustedOperatingIncome:latest?.adjustedOperatingIncome??null
    }};
  }

  function jukaFundamentalForecastEngine(annualFacts=[], adaptive={}){
    const rows=deriveFundamentals(annualFacts),r=rows.at(-1),a=adaptive?.assumptions||{};
    if(!r||rows.length<3)return null;
    const rev=Number(r.revenue);
    const g1=fieldCagr(rows,'revenue',rows.length-1,1),g3=fieldCagr(rows,'revenue',rows.length-1,3),g5=fieldCagr(rows,'revenue',rows.length-1,5);
    const old3=rows.length>=7?fieldCagr(rows,'revenue',rows.length-4,3):null;
    const latestMargin=Number(r.operatingMargin),medMargin=robustRecentMedian(rows,'operatingMargin',5);
    const growthVol=Number(adaptive?.metrics?.growthVol);

    // 1) Growth evidence: robust blend, with recency winning only when supported by 3Y history.
    const hist=clamp(weightedAverage([[g1,.35],[g3,.45],[g5,.20]]),-.08,.45);
    const acceleration=Number.isFinite(old3)&&Number.isFinite(g3)?g3-old3:0;

    // 2) Economic capacity. For asset-light companies, accounting invested capital is not
    // a reliable denominator for marginal ROIC because internally created IP is expensed.
    // Use FCF/NOPAT conversion and operating profitability as independent evidence.
    const conv=[];
    for(const x of rows.slice(-5)){
      const tax=clamp(Number(x.taxRate),.08,.35),nopat=Number(x.operatingIncome)*(1-tax),fcf=Number(x.fcf);
      if(nopat>0&&Number.isFinite(fcf))conv.push(clamp(fcf/nopat,-.5,1.5));
    }
    const fcfConversion=clamp(n(median(conv),.65),.15,1.15);
    const profitability=clamp(weightedAverage([[latestMargin,.65],[medMargin,.35]]),0,.65);

    // 3) Reinvestment intensity from cash economics, not balance-sheet invested capital alone.
    const rr=[];
    for(const x of rows.slice(-5)){
      const tax=clamp(Number(x.taxRate),.08,.35),nopat=Number(x.operatingIncome)*(1-tax);
      const reinvest=Math.max(0,Number(x.capex)-Number(x.da)+Number(x.deltaNwc));
      if(nopat>0&&Number.isFinite(reinvest))rr.push(clamp(reinvest/nopat,0,1.25));
    }
    const observedReinvestment=clamp(n(median(rr),.30),.03,.95);

    // 4) Sustainable-growth capacity: for asset-light businesses, infer return on incremental
    // reinvestment from observed growth and reinvestment, but cap noisy ratios.
    const impliedIncrementalReturn=clamp(observedReinvestment>0?Math.max(0,hist)/observedReinvestment:.15,.08,.60);
    const qualityRoic=clamp(n(adaptive?.metrics?.roicMedian,.15),.08,.45);
    const economicReturn=weightedAverage([[impliedIncrementalReturn,.55],[qualityRoic,.45]]);
    const fundedGrowth=clamp(observedReinvestment*economicReturn,0,.30);

    // 5) Scale is a *soft* fade, never a hard ceiling. Strong current demand, margins and
    // funded growth can justify temporarily exceptional growth even at very large scale.
    let scaleFade=1;
    if(rev>500000)scaleFade=.70;
    else if(rev>250000)scaleFade=.78;
    else if(rev>150000)scaleFade=.86;
    else if(rev>75000)scaleFade=.93;
    const evidenceStrength=clamp((profitability/.40)*.35+(fcfConversion/.80)*.30+(economicReturn/.30)*.35,.55,1.25);
    const effectiveFade=clamp(scaleFade+(evidenceStrength-1)*.22,.68,1.0);

    let year1=weightedAverage([[hist,.60],[fundedGrowth,.40]])*effectiveFade;
    // Strong acceleration may persist into year 1, but only partially.
    if(acceleration>.10)year1+=Math.min(.05,acceleration*.12);
    year1=clamp(year1,-.08,.35);

    // 6) Explicit maturation curve. Year 5 is not a fixed cap: it depends on economic returns,
    // cash conversion, volatility and evidence of deceleration.
    let persistence=.34;
    persistence+=clamp((economicReturn-.15)*.75,-.04,.20);
    persistence+=clamp((fcfConversion-.60)*.18,-.05,.08);
    if(Number.isFinite(growthVol))persistence-=clamp((growthVol-.10)*.25,0,.10);
    if(Number.isFinite(acceleration)&&acceleration<-.05)persistence-=Math.min(.08,Math.abs(acceleration)*.20);
    persistence=clamp(persistence,.28,.62);
    let year5=a.terminalGrowth+(year1-a.terminalGrowth)*persistence;
    year5=clamp(year5,.01,.15);

    const old=rows.length>=4?Number(rows[rows.length-4].operatingMargin):latestMargin;
    const marginTrend=(latestMargin-old)/3;
    let margin5=weightedAverage([[latestMargin,.60],[medMargin,.40]])+clamp(marginTrend,-.025,.025);
    margin5=clamp(margin5,-.05,.65);

    return {
      growthY1:year1,growthY5:year5,targetEbitMarginY5:margin5,
      economicReturn,impliedIncrementalReturn,qualityRoic,observedReinvestment,fundedGrowth,
      fcfConversion,profitability,scaleFade,effectiveFade,persistence,
      evidence:{g1,g3,g5,olderGrowth:old3,growthAcceleration:acceleration,revenueBase:rev,growthVol},
      checks:{
        growthEconomicallySupported:year1<=Math.max(hist,fundedGrowth)*1.15+.02,
        matures:year5<=Math.max(year1,a.terminalGrowth),
        marketPriceUsed:false,
        accountingInvestedCapitalNotSoleDriver:true
      }
    };
  }

  // JUKA FV 2.1: economic value-driver DCF.
  // Growth is not free: reinvestment rate = growth / return on incremental capital.
  // This prevents a model from simultaneously assuming very high growth and nearly all NOPAT as distributable cash.
  function jukaWaccPolicy(adaptive={}){
    const a=adaptive?.assumptions||{},raw=Number(a.wacc),m=adaptive?.metrics||{};
    if(!Number.isFinite(raw))return {wacc:raw,low:null,high:null,spread:null,quality:'unavailable',marketPriceUsed:false};
    const gv=Number(m.growthVol),mv=Number(m.marginVol),rs=Number(m.roicStability);
    let half=.0075;
    if(Number.isFinite(gv)&&gv>.15)half+=.0025;
    if(Number.isFinite(mv)&&mv>.08)half+=.0025;
    if(Number.isFinite(rs)&&rs<.5)half+=.0025;
    half=clamp(half,.0075,.015);
    return {wacc:raw,low:clamp(raw-half,.055,.16),high:clamp(raw+half,.06,.18),spread:2*half,
      quality:half<=.0075?'mittel':half<=.01?'niedrig':'sehr niedrig',method:'fundamental-risk-proxy',
      leverageBasis:'gross-debt-to-ebitda',usesCashBalance:false,usesDataQuality:false,marketPriceUsed:false};
  }

  function jukaMoatEvidencePolicy(stock={}){
    const e=stock?.moatEvidence;
    if(!e||typeof e!=='object')return {available:false,modifierYears:0,classification:'unbelegt',reason:'no-sourced-moat-evidence',marketPriceUsed:false};
    const sources=Array.isArray(e.sources)?e.sources.filter(Boolean):[];
    if(!sources.length)return {available:false,modifierYears:0,classification:'unbelegt',reason:'missing-sources',marketPriceUsed:false};
    const strengths=Array.isArray(e.strengths)?e.strengths.length:0,risks=Array.isArray(e.risks)?e.risks.length:0;
    const confidence=String(e.confidence||'').toLowerCase();
    let modifierYears=0,classification='neutral';
    if(risks>=2||confidence==='low'||confidence==='niedrig'){modifierYears=-2;classification='verkürzen';}
    else if(risks>strengths){modifierYears=-1;classification='verkürzen';}
    else if(strengths>=2&&(confidence==='high'||confidence==='hoch'))classification='bestätigt';
    return {available:true,modifierYears,classification,strengths,risks,sourceCount:sources.length,marketPriceUsed:false};
  }

  function jukaCompetitiveAdvantagePeriod(adaptive={}){
    const a=adaptive?.assumptions||{},m=adaptive?.metrics||{},q=adaptive?.dataQuality||{};
    const roic=Number(m.roicMedian),wacc=Number(a.wacc),growth=Number(a.growthY1);
    const revCagr=Number(m.revenueCagr),marginVol=Number(m.marginVolatility),growthVol=Number(m.growthVolatility);
    const economicsKnown=Number.isFinite(roic)&&Number.isFinite(wacc);
    const excess=economicsKnown?roic-wacc:null;
    let score=economicsKnown?48:18;
    if(economicsKnown)score+=clamp(excess*180,-25,30);
    if(Number.isFinite(revCagr))score+=clamp((revCagr-.04)*45,-6,7);
    if(Number.isFinite(growth))score+=clamp((growth-.05)*25,-3,4);
    if(Number.isFinite(marginVol))score-=clamp(marginVol*100,0,12);
    if(Number.isFinite(growthVol))score-=clamp(growthVol*70,0,12);
    if(Number.isFinite(q.score)&&q.score<65)score-=6;
    if(!Number.isFinite(q.score)||q.score<55)score=Math.min(score,35);
    if(economicsKnown&&excess<=.01)score=Math.min(score,32);
    if(economicsKnown&&excess<0)score=Math.min(score,22);
    score=clamp(score,15,90);
    let quantitativeYears=Math.round(4+(score-15)/75*8);
    if(!economicsKnown)quantitativeYears=Math.min(quantitativeYears,5);
    else if(excess<=.01)quantitativeYears=Math.min(quantitativeYears,6);
    const moat=adaptive?.moatEvidence||{available:false,modifierYears:0,classification:'unbelegt'};
    const years=clamp(quantitativeYears+Math.min(0,Number(moat.modifierYears)||0),4,12);
    const evidenceQuality=!economicsKnown?'niedrig':Number.isFinite(q.score)&&q.score>=75?'hoch':Number.isFinite(q.score)&&q.score>=55?'mittel':'niedrig';
    return {years,quantitativeYears,score,excessReturn:excess,economicsKnown,evidenceQuality,moatEvidence:moat,
      drivers:{roic,wacc,revCagr,growth,marginVol,growthVol,dataQuality:q.score},
      method:'company-specific-excess-return-persistence+sourced-moat-confirmation',marketPriceUsed:false};
  }

  function jukaMatureTerminalPolicy(adaptive={}){
    const a=adaptive?.assumptions||{},wacc=Number(a.wacc),raw=Number(a.terminalRoic),g=Number(a.terminalGrowth);
    if(!Number.isFinite(wacc)||!Number.isFinite(raw))return {terminalRoic:raw,rawTerminalRoic:raw,excessReturn:null,cap:null,premium:null};
    const stability=Number(adaptive?.metrics?.roicStability);
    let premium=.025;
    if(Number.isFinite(stability)&&stability>.75)premium=.04;
    else if(Number.isFinite(stability)&&stability>.55)premium=.035;
    const cap=wacc+premium;
    const terminalRoic=clamp(Math.min(raw,cap),Math.max(wacc,g+.01),.35);
    return {terminalRoic,rawTerminalRoic:raw,excessReturn:terminalRoic-wacc,cap,premium,competitiveAdvantagePremium:premium,marketPriceUsed:false};
  }

  function jukaNormalizedInvestedCapital(row={},opts={}){
    const equity=Number(row.equity),debt=Number(row.debt),cash=Number(row.cash),rdAsset=Number(row.rdAsset);
    if(!Number.isFinite(equity)||!Number.isFinite(debt))return {value:null,quality:'nicht verfügbar',components:{},marketPriceUsed:false};
    // Cash is only netted when reported and positive. R&D asset is already added to equity
    // by the R&D adjustment, so it must not be added twice here.
    const cashDeduction=Number.isFinite(cash)&&cash>0?cash:0;
    const leaseDebt=Number(row.leaseDebt);
    const leaseAdj=Number.isFinite(leaseDebt)&&leaseDebt>0?leaseDebt:0;
    const value=equity+debt+leaseAdj-cashDeduction;
    const flags=[];
    if(!Number.isFinite(cash))flags.push('cash-missing');
    if(!Number.isFinite(leaseDebt))flags.push('leases-unavailable');
    if(Number.isFinite(Number(row.goodwill))&&Number(row.goodwill)>0)flags.push('goodwill-present');
    return {value:value>0?value:null,quality:flags.length<=1?'mittel':'niedrig',
      components:{equity,debt,leaseDebt:leaseAdj,cashDeduction,rdAsset:Number.isFinite(rdAsset)?rdAsset:null,
        goodwill:Number.isFinite(Number(row.goodwill))?Number(row.goodwill):null},
      flags,marketPriceUsed:false};
  }

  function jukaReinvestmentEfficiency(annualFacts=[],adaptive={}){
    const rows=deriveFundamentals(annualFacts),levels=[],marginal=[];
    for(let i=0;i<rows.length;i++){
      const r=rows[i],rev=Number(r.revenue),icObj=jukaNormalizedInvestedCapital(r),ic=icObj.value;
      if(rev>0&&ic>0)levels.push(rev/ic);
      if(i){const p=rows[i-1],pic=jukaNormalizedInvestedCapital(p).value,dr=rev-Number(p.revenue),di=Number.isFinite(ic)&&Number.isFinite(pic)?ic-pic:null;if(dr>0&&di>0)marginal.push(dr/di);}
    }
    const level=median(levels.slice(-5)),marg=median(marginal.slice(-4));
    const c=[level,marg].filter(x=>Number.isFinite(x)&&x>.1&&x<20);
    const dispersion=c.length>=2&&Math.min(...c)>0?Math.max(...c)/Math.min(...c):null;
    const reliable=levels.length>=4&&marginal.length>=2&&(!Number.isFinite(dispersion)||dispersion<=3);
    const blended=c.length?clamp(reliable?median(c):level,.25,8):null;
    return {salesToCapital:level,marginalSalesToCapital:marg,blended,dispersion,reliable,
      quality:reliable?'mittel':c.length?'niedrig':'nicht verfügbar',samples:{level:levels.length,marginal:marginal.length},marketPriceUsed:false};
  }

  function jukaEconomicDcf(input={}, adaptive={}){
    const revenue=n(input.revenue,0), ebit=n(input.ebit,0), tax=clamp(n(input.taxRate,.21),.08,.35);
    const shares=n(input.shares,0), netDebt=n(input.netDebt,0);
    if(!(revenue>0&&shares>0))return null;
    const a=adaptive?.assumptions||{};
    const metrics=adaptive?.metrics||{};
    const waccPolicy=jukaWaccPolicy(adaptive);
    const reinvestmentEfficiency=jukaReinvestmentEfficiency(input.annualFacts||[],adaptive);
    const startMargin=ebit/revenue;
    const histRoic=Number(metrics.roicMedian);
    const terminalPolicy=jukaMatureTerminalPolicy(adaptive),capPolicy=jukaCompetitiveAdvantagePeriod(adaptive);
    const terminalRoic=clamp(n(terminalPolicy.terminalRoic,.12),Math.max(n(a.terminalGrowth,.025)+.01,.07),.30);
    // Incremental ROIC fades from company history toward a mature-company terminal ROIC.
    const startRoic=clamp(Number.isFinite(histRoic)?histRoic:terminalRoic,.08,.60);
    const capYears=clamp(Number(a.capYearsOverride)||capPolicy.years,4,14), years=capYears+5, flows=[];
    const latest=(input.annualFacts||[]).at(-1)||{},icObj=jukaNormalizedInvestedCapital(latest); let investedCapital=Number(icObj.value);
    let rev=revenue,pv=0;
    for(let y=1;y<=years;y++){
      // Company-specific CAP: retain excess-return economics through CAP, then fade over five years.
      let g;
      const growthAnchorYears=Math.min(5,capYears);
      if(y<=growthAnchorYears){
        const tt=growthAnchorYears<=1?1:(y-1)/(growthAnchorYears-1);
        g=a.growthY1+(a.growthY5-a.growthY1)*tt;
      }else if(y<=capYears){
        g=a.growthY5;
      }else{
        const tt=(y-capYears)/5;
        g=a.growthY5+(a.terminalGrowth-a.growthY5)*tt;
      }
      const margin=startMargin+(a.targetEbitMarginY5-startMargin)*Math.min(y/5,1);
      const fade=Math.max(0,Math.min(1,(y-capYears)/5));
      const roic=startRoic+(terminalRoic-startRoic)*fade;
      rev*=1+g;
      const nopat=rev*margin*(1-tax);
      const roicReinvestmentRate=Math.max(0,g/Math.max(roic,.01));
      const prevRevenue=y===1?n(input.revenue,0):flows.at(-1).revenue;
      const deltaRevenue=Math.max(0,rev-prevRevenue);
      const prevNopat=y===1?ebit*(1-tax):flows.at(-1).nopat;
      const incrementalNopat=Math.max(0,nopat-prevNopat);
      const marginalRoic=roic;
      const salesCapitalReinvestment=reinvestmentEfficiency.reliable&&Number.isFinite(reinvestmentEfficiency.blended)?deltaRevenue/reinvestmentEfficiency.blended:null;
      const marginalRoicReinvestment=incrementalNopat/Math.max(marginalRoic,.01);
      const openingInvestedCapital=investedCapital;
      let reinvestment,reinvestRate,capitalConstraintHit=false,reinvestmentMethod;
      if(Number.isFinite(salesCapitalReinvestment)){
        reinvestment=Math.max(0,salesCapitalReinvestment);
        reinvestmentMethod='sales-to-capital';
      }else{
        reinvestment=Math.max(0,marginalRoicReinvestment);
        reinvestmentMethod='incremental-nopat-over-marginal-roic';
      }
      reinvestRate=nopat>0?reinvestment/nopat:0;
      capitalConstraintHit=reinvestRate>1.50;
      if(Number.isFinite(openingInvestedCapital)&&openingInvestedCapital>0)investedCapital=openingInvestedCapital+reinvestment;
      const salesCapitalRate=Number.isFinite(salesCapitalReinvestment)&&nopat>0?salesCapitalReinvestment/nopat:null;
      const nopatGrowth=prevNopat>0?nopat/prevNopat-1:null;
      const investmentGrowth=prevNopat>0?reinvestment*marginalRoic/prevNopat:null;
      const efficiencyGrowth=Number.isFinite(nopatGrowth)&&Number.isFinite(investmentGrowth)?nopatGrowth-investmentGrowth:null;
      const fcff=nopat-reinvestment;
      const yearWacc=y<=capYears?a.wacc:(a.wacc+(Math.max(.055,a.wacc-.005)-a.wacc)*((y-capYears)/5));
      const prevDf=y===1?1:(flows.at(-1)?.discountFactor||1);
      const discountFactor=prevDf*(1+yearWacc);
      const disc=fcff/discountFactor;
      pv+=disc;
      flows.push({year:y,revenue:rev,growth:g,margin,nopat,roic,wacc:yearWacc,discountFactor,
        openingInvestedCapital,closingInvestedCapital:Number.isFinite(investedCapital)?investedCapital:null,
        impliedRoic:Number.isFinite(investedCapital)&&investedCapital>0?nopat/investedCapital:null,capitalConstraintHit,
        nopatGrowth,marginalRoic,investmentGrowth,efficiencyGrowth,
        reinvestmentRate:reinvestRate,roicReinvestmentRate,salesCapitalRate,reinvestmentMethod,reinvestment,fcff,pv:disc});
    }
    const last=flows.at(-1);
    const tg=a.terminalGrowth,tw=flows.at(-1).wacc;
    if(!(tw>tg))return null;
    const termReinvest=Math.max(0,tg/terminalRoic);
    const termNopat=last.nopat*(1+tg);
    const termFcff=termNopat*(1-termReinvest);
    const terminalRequiredCapital=termNopat/terminalRoic;
    const terminalTransitionInvestment=Number.isFinite(investedCapital)?terminalRequiredCapital-investedCapital:0;
    const terminal=termFcff/(tw-tg);
    const terminalPv=terminal/flows.at(-1).discountFactor;
    const transitionPv=terminalTransitionInvestment/flows.at(-1).discountFactor;
    const enterprise=pv-transitionPv+terminalPv;
    const equity=enterprise-netDebt;
    return {valuePerShare:equity/shares,enterprise,equity,pvExplicit:pv-transitionPv,rawPvExplicit:pv,terminalPv,terminalShare:enterprise>0?terminalPv/enterprise:null,
      terminal:{value:terminal,growth:tg,wacc:tw,roic:terminalRoic,rawRoic:terminalPolicy.rawTerminalRoic,excessReturn:terminalPolicy.excessReturn,premium:terminalPolicy.premium,reinvestmentRate:termReinvest,nopat:termNopat,fcff:termFcff,requiredCapital:terminalRequiredCapital,transitionInvestment:terminalTransitionInvestment},
      capitalPath:{available:Number.isFinite(icObj.value),initialInvestedCapital:icObj.value,year10InvestedCapital:investedCapital,finalExplicitInvestedCapital:investedCapital,explicitYears:years,
        terminalRequiredCapital,terminalTransitionInvestment,constraintHits:flows.filter(x=>x.capitalConstraintHit).length,quality:icObj.quality,flags:icObj.flags||[]},
      capPolicy:{...capPolicy,years:capYears},waccPolicy,reinvestmentEfficiency,flows};
  }


  function jukaOwnerEarningsIntrinsicValue(input={},adaptive={},scenario='base'){
    const a={...(adaptive?.assumptions||{})},revenue0=Number(input.revenue),ebit0=Number(input.ebit),shares=Number(input.shares),netDebt=Number(input.netDebt)||0;
    if(!(revenue0>0&&Number.isFinite(ebit0)&&shares>0))return null;
    const tax=clamp(Number(input.taxRate)||.21,.08,.35),margin0=ebit0/revenue0;
    const cap=jukaCompetitiveAdvantagePeriod(adaptive),baseCap=clamp(Number(cap?.years)||7,4,12);
    const wacc0=clamp(Number(a.wacc)||.09,.055,.14),terminalGrowth=clamp(Number(a.terminalGrowth)||.025,.015,.035);
    // Stable-growth excess returns are capped by the same mature-company policy as the economic DCF.
    const terminalPolicy=jukaMatureTerminalPolicy(adaptive);
    const terminalRoic=clamp(Number(terminalPolicy.terminalRoic)||Math.max(wacc0+.01,.12),terminalGrowth+.01,.35);
    const cfg=scenario==='bear'?{gm:.72,md:-.025,cd:-2,wd:.012,roc:.85}:scenario==='bull'?{gm:1.18,md:.018,cd:2,wd:-.007,roc:1.08}:{gm:1,md:0,cd:0,wd:0,roc:1};
    const capYears=clamp(baseCap+cfg.cd,4,14),years=capYears+5;
    const g1=clamp(Number(a.growthY1)||.06,-.08,.35)*cfg.gm,g5=clamp(Number(a.growthY5)||.04,.005,.16)*cfg.gm;
    const targetMargin=clamp((Number(a.targetEbitMarginY5)||margin0)+cfg.md,-.05,.70),wacc=clamp(wacc0+cfg.wd,.05,.16);
    const forecastReturn=Number(adaptive?.fundamentalForecast?.economicReturn);
    const histRoic=Number(adaptive?.metrics?.roicMedian);
    const startMarginalRoic=clamp((Number.isFinite(forecastReturn)?forecastReturn:Number.isFinite(histRoic)?histRoic:terminalRoic)*cfg.roc,.06,.60);
    let revenue=revenue0,pv=0,flows=[];
    for(let y=1;y<=years;y++){
      let growth=y<=5?g1+(g5-g1)*((y-1)/4):g5;if(y>capYears)growth=g5+(terminalGrowth-g5)*((y-capYears)/5);
      const margin=y<=5?margin0+(targetMargin-margin0)*(y/5):targetMargin,prevRevenue=revenue;revenue*=1+growth;
      const nopat=revenue*margin*(1-tax),prevMargin=y===1?margin0:(y-1<=5?margin0+(targetMargin-margin0)*((y-1)/5):targetMargin);
      const prevNopat=prevRevenue*prevMargin*(1-tax),fade=y<=capYears?0:(y-capYears)/5;
      const marginalRoic=clamp(startMarginalRoic+(terminalRoic-startMarginalRoic)*fade,.05,.60);
      // Growth is never free. This is economic reinvestment, not accounting capex.
      const incrementalNopat=Math.max(0,nopat-prevNopat),growthInvestment=incrementalNopat/Math.max(.05,marginalRoic);
      const daRate=clamp(Number(a.daRevenue)||Number(input.da)/revenue0||0,0,.25),capexRate=clamp(Number(a.capexRevenue)||Number(input.capex)/revenue0||daRate,0,.40);
      // Buffett owner-earnings logic: replacement investment is a guess. We use a conservative,
      // bounded excess of normalized capex over D&A as the maintenance investment not already expensed.
      const maintenanceCapexRate=Math.min(capexRate,daRate*1.25);
      const maintenanceExcess=Math.max(0,maintenanceCapexRate-daRate)*revenue;
      const ownerEarnings=nopat-growthInvestment-maintenanceExcess,discountFactor=Math.pow(1+wacc,y);
      pv+=ownerEarnings/discountFactor;
      flows.push({year:y,revenue,growth,margin,nopat,marginalRoic,incrementalNopat,growthInvestment,
        growthReinvestmentRate:nopat>0?growthInvestment/nopat:null,maintenanceCapexRate,maintenanceExcess,ownerEarnings,discountFactor});
    }
    const last=flows.at(-1);if(!(wacc>terminalGrowth))return null;
    const terminalNopat=last.nopat*(1+terminalGrowth),terminalReinvestmentRate=terminalGrowth/terminalRoic;
    const terminalReinvestment=terminalNopat*terminalReinvestmentRate,terminalOwnerEarnings=terminalNopat-terminalReinvestment;
    const terminalValue=terminalOwnerEarnings/(wacc-terminalGrowth),terminalPv=terminalValue/Math.pow(1+wacc,years);
    const enterprise=pv+terminalPv,equity=enterprise-netDebt,valuePerShare=equity/shares;
    return {available:Number.isFinite(valuePerShare)&&valuePerShare>0,valuePerShare,enterprise,equity,pvExplicit:pv,terminalValue,terminalPv,
      terminalShare:enterprise>0?terminalPv/enterprise:null,capYears,explicitYears:years,wacc,terminalGrowth,terminalRoic,terminalReinvestmentRate,
      startMarginalRoic,scenario,flows,terminalPolicy,method:'owner-earnings-economic-intrinsic-value',marketPriceUsed:false};
  }

  function jukaOwnerEarningsCrossCheck(input={},adaptive={}){return jukaOwnerEarningsIntrinsicValue(input,adaptive,'base');}



  function jukaModelStability(model,input={},baseResult={}){
    const m=String(model||'').toLowerCase(),flags=[]; let maxSensitivity=0,details={};
    const rel=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a)>1e-9?Math.abs(b-a)/Math.abs(a):null;
    if(m.includes('bank')){
      const base=Number(baseResult?.valuation?.base??baseResult?.base??baseResult?.fairValue);
      const bvps=Number(input.bvps),roe=Number(input.roe),coe=Number(input.costOfEquity),g=Number(input.terminalGrowth);
      if([base,bvps,roe,coe,g].every(Number.isFinite)&&coe>g){
        const val=(r,c,gg)=>bvps*((r-gg)/(c-gg));
        const shocks={roe:Math.max(rel(base,val(roe+.02,coe,g)),rel(base,val(roe-.02,coe,g))),
          coe:Math.max(rel(base,val(roe,coe+.01,g)),rel(base,val(roe,coe-.01,g))),
          growth:Math.max(rel(base,val(roe,coe,g+.005)),rel(base,val(roe,coe,g-.005)))};
        maxSensitivity=Math.max(...Object.values(shocks).filter(Number.isFinite));details=shocks;
      }
    }else if(m.includes('reit')){
      const base=Number(baseResult?.valuation?.base??baseResult?.base??baseResult?.fairValue);
      const affo=Number(input.affoPerShare),gr=Number(input.affoGrowth),multiple=Number(input.exitMultiple),coe=Number(input.costOfEquity);
      if([base,affo,gr,multiple,coe].every(Number.isFinite)){
        const val=(g,m,c)=>affo*Math.pow(1+g,5)*m/Math.pow(1+c,5);
        const shocks={growth:Math.max(rel(base,val(gr+.01,multiple,coe)),rel(base,val(gr-.01,multiple,coe))),
          exitMultiple:Math.max(rel(base,val(gr,multiple+2,coe)),rel(base,val(gr,Math.max(1,multiple-2),coe))),
          coe:Math.max(rel(base,val(gr,multiple,coe+.01)),rel(base,val(gr,multiple,Math.max(.01,coe-.01))))};
        maxSensitivity=Math.max(...Object.values(shocks).filter(Number.isFinite));details=shocks;
      }
    }else return null;
    if(maxSensitivity>.30)flags.push({severity:'high',code:'model-sensitivity-high'});
    else if(maxSensitivity>.20)flags.push({severity:'medium',code:'model-sensitivity-medium'});
    return {status:maxSensitivity>.30?'instabil':maxSensitivity>.20?'sensitiv':'stabil',maxSensitivity,details,flags,marketPriceUsed:false};
  }

  function jukaEarningsPowerValue(input={},adaptive={}){
    const revenue=Number(input.revenue),ebit=Number(input.ebit),shares=Number(input.shares),netDebt=Number(input.netDebt)||0;
    if(!(revenue>0&&Number.isFinite(ebit)&&shares>0))return {available:false,reason:'insufficient-operating-data',marketPriceUsed:false};
    const tax=clamp(Number(input.taxRate)||.21,.08,.35),a=adaptive?.assumptions||{};
    const wacc=Number(a.wacc); if(!(wacc>0))return {available:false,reason:'wacc-unavailable',marketPriceUsed:false};
    // Normalized current earning power: no growth, no terminal growth, no market-price calibration.
    const nopat=ebit*(1-tax);
    const maintenanceRate=clamp(Number(a.daRevenue)||0,0,.25);
    const capexRate=clamp(Number(a.capexRevenue)||maintenanceRate,0,.35);
    const maintenanceExcess=Math.max(0,(capexRate-maintenanceRate)*revenue);
    const normalizedFcff=Math.max(0,nopat-maintenanceExcess);
    const enterprise=normalizedFcff/wacc,equity=enterprise-netDebt,valuePerShare=equity/shares;
    return {available:Number.isFinite(valuePerShare)&&valuePerShare>0,valuePerShare,enterprise,equity,nopat,normalizedFcff,wacc,
      method:'no-growth-normalized-earnings-power',marketPriceUsed:false};
  }

  function jukaMultiMethodReleaseGate(result={},input={},adaptive={}){
    const primary=Number(result?.valuation?.base),economic=Number(result?.economicDcf?.valuePerShare);
    const epv=jukaEarningsPowerValue(input,adaptive),ep=Number(epv.valuePerShare);
    const methods=[['ownerEarnings',primary],['economicDcf',economic],['earningsPower',ep]].filter(x=>Number.isFinite(x[1])&&x[1]>0);
    const blockers=[],warnings=[],positiveEvidence=[];
    const dcfDispersion=primary>0&&economic>0?Math.abs(economic-primary)/primary:null;
    const epvPremium=primary>0&&ep>0?ep/primary-1:null;
    if(!(primary>0))blockers.push('primary-owner-earnings-unavailable');
    if(!(economic>0))blockers.push('economic-dcf-unavailable');
    else if(dcfDispersion>.60)blockers.push('economic-dcf-dispersion-high');
    else if(dcfDispersion>.35)warnings.push('economic-dcf-dispersion');
    // Earnings Power deliberately assumes no growth. A low EPV is therefore not a reason to reject a growth-company value.
    // It is a floor/sanity check; EPV materially above the primary value is suspicious.
    if(ep>0&&epvPremium>.25)warnings.push('earnings-power-above-primary');
    if(ep>0&&epvPremium>.60)blockers.push('earnings-power-materially-above-primary');
    if(Number.isFinite(dcfDispersion)&&dcfDispersion<=.20)positiveEvidence.push('owner-earnings-economic-dcf-convergent');
    if(ep>0&&ep<=primary*1.15)positiveEvidence.push('earnings-power-floor-consistent');
    const baseGate=result?.releaseGate||{};
    if(baseGate.status==='hold')blockers.push(...(baseGate.blockers||[]));
    else if(baseGate.status==='review')warnings.push(...(baseGate.warnings||[]));
    if(input?.maintenanceData?.proxyUsed)warnings.push('maintenance-capex-proxy');
    const bear=Number(result?.valuation?.bear),bull=Number(result?.valuation?.bull);
    const bullToBase=primary>0&&bull>0?bull/primary:null,baseToBear=primary>0&&bear>0?primary/bear:null;
    if(Number.isFinite(bullToBase)&&bullToBase>4)blockers.push('scenario-band-excessive-bull');
    else if(Number.isFinite(bullToBase)&&bullToBase>2.5)warnings.push('scenario-band-wide-bull');
    if(Number.isFinite(baseToBear)&&baseToBear>4)blockers.push('scenario-band-excessive-bear');
    else if(Number.isFinite(baseToBear)&&baseToBear>2.5)warnings.push('scenario-band-wide-bear');
    const status=blockers.length?'nicht belastbar':warnings.length?'prüfen':'belastbar';
    return {status,liveReady:status==='belastbar',primaryMethod:'ownerEarnings',primaryValue:primary,
      methods:Object.fromEntries(methods),earningsPower:epv,dcfDispersion,earningsPowerToPrimary:primary>0&&ep>0?ep/primary:null,
      scenarioWidth:{bullToBase,baseToBear},
      blockers:[...new Set(blockers)],warnings:[...new Set(warnings)],positiveEvidence,marketPriceUsed:false};
  }

  function jukaReleaseMatrixCase(model,valuation={},stability=null,quality={}){
    const m=String(model||'').toLowerCase(),blockers=[],warnings=[];
    if(!valuation||!Number.isFinite(Number(valuation.base)))blockers.push('valuation-unavailable');
    if(!stability)blockers.push('stability-unavailable');
    else if(stability.status==='instabil')blockers.push('model-instability');
    else if(stability.status==='sensitiv')warnings.push('model-sensitive');
    if(quality.ready===false)blockers.push('model-data-not-ready');
    if(quality.proxyUsed===true)warnings.push('proxy-data-used');
    const status=blockers.length?'nicht belastbar':warnings.length?'prüfen':'belastbar';
    return {model:m,status,liveReady:status==='belastbar',blockers,warnings,marketPriceUsed:false};
  }

  function jukaValidateReleaseMatrix(cases=[]){
    const rows=[],counts={tp:0,tn:0,fp:0,fn:0};
    for(const c of cases){
      const expected=String(c.expected||''),actual=String(c.actual||'');
      const expectedLive=expected==='belastbar',actualLive=actual==='belastbar';
      let classification;
      if(expectedLive&&actualLive){classification='tp';counts.tp++;}
      else if(!expectedLive&&!actualLive){classification='tn';counts.tn++;}
      else if(!expectedLive&&actualLive){classification='fp';counts.fp++;}
      else {classification='fn';counts.fn++;}
      rows.push({name:c.name,model:c.model,expected,actual,classification});
    }
    const n=rows.length,accuracy=n?(counts.tp+counts.tn)/n:null;
    return {cases:n,counts,accuracy,falsePositiveRate:n?counts.fp/n:null,falseNegativeRate:n?counts.fn/n:null,
      releaseSafe:counts.fp===0,rows};
  }

  function jukaForecastFeasibility(model={}){
    const flows=model?.flows||[],flags=[]; if(!flows.length)return {status:'nicht verfügbar',flags,score:0};
    const rates=flows.map(x=>Number(x.reinvestmentRate??x.growthReinvestmentRate)).filter(Number.isFinite);
    const cliffs=flows.slice(1).map((x,i)=>Math.abs(Number(x.growth)-Number(flows[i].growth))).filter(Number.isFinite);
    const negativeCashYears=flows.filter(x=>Number(x.fcff??x.ownerEarnings)<0).length;
    const extremeReinvestmentYears=rates.filter(x=>x>1.5).length;
    const maxGrowthCliff=cliffs.length?Math.max(...cliffs):0;
    if(extremeReinvestmentYears>=3)flags.push({severity:'high',code:'reinvestment-extreme',text:'Wachstumsreinvestition liegt in mindestens drei Jahren über 150% des NOPAT.'});
    else if(extremeReinvestmentYears)flags.push({severity:'medium',code:'reinvestment-high',text:'Wachstumsreinvestition liegt zeitweise über 150% des NOPAT.'});
    if(maxGrowthCliff>.08)flags.push({severity:'medium',code:'growth-cliff',text:'Der Wachstumspfad verändert sich zwischen zwei Jahren um mehr als 8 Prozentpunkte.'});
    const high=flags.filter(x=>x.severity==='high').length,medium=flags.filter(x=>x.severity==='medium').length;
    return {status:high?'nicht belastbar':medium?'prüfen':'plausibel',score:Math.max(0,100-high*30-medium*12),flags,negativeCashYears,extremeReinvestmentYears,maxGrowthCliff,marketPriceUsed:false};
  }

  function jukaExcessReturnValuation(input={},adaptive={},economic=null){
    const d=economic||jukaEconomicDcf(input,adaptive),cp=d?.capitalPath||{};
    if(!d||!cp.available)return {available:false,reason:'capital-path-unavailable',marketPriceUsed:false};
    const ic0=Number(cp.initialInvestedCapital);let pvEva=0,df=1;const rows=[];
    for(const f of d.flows){
      const opening=Number(f.openingInvestedCapital),w=Number(f.wacc),nopat=Number(f.nopat);df*=1+w;
      const eva=nopat-w*opening;pvEva+=eva/df;
      rows.push({year:f.year,openingInvestedCapital:opening,closingInvestedCapital:f.closingInvestedCapital,nopat,wacc:w,eva,impliedRoic:f.impliedRoic,targetRoic:f.roic});
    }
    const transition=Number(d.terminal.transitionInvestment)||0,icN=Number(cp.finalExplicitInvestedCapital)+transition;
    const explicitEquivalent=ic0+pvEva-icN/df,explicitGap=explicitEquivalent-Number(d.pvExplicit);
    const tw=Number(d.terminal.wacc),tg=Number(d.terminal.growth),tn=Number(d.terminal.nopat),tv=Number(d.terminal.value);
    const evaNext=tn-tw*icN,evaTv=evaNext/(tw-tg),terminalReconstructed=icN+evaTv,terminalGap=terminalReconstructed-tv;
    const firmValue=ic0+pvEva+evaTv/df,shares=Number(input.shares)||0,netDebt=Number(input.netDebt)||0,valuePerShare=shares>0?(firmValue-netDebt)/shares:null;
    const convergence=Math.abs(valuePerShare-Number(d.valuePerShare))/Math.abs(Number(d.valuePerShare));
    const maxRoicGap=Math.max(...rows.map(x=>Math.abs(Number(x.impliedRoic)-Number(x.targetRoic))).filter(Number.isFinite),0);
    return {available:true,valuePerShare,firmValue,initialInvestedCapital:ic0,pvExplicitEva:pvEva,explicitEnterpriseEquivalent:explicitEquivalent,
      dcfExplicit:Number(d.pvExplicit),explicitGap,terminalInvestedCapital:icN,requiredTerminalCapital:Number(cp.terminalRequiredCapital),
      terminalCapitalGap:icN-Number(cp.terminalRequiredCapital),terminalReconstructed,terminalGap,convergence,maxRoicGap,rows,
      capitalConsistent:Math.abs(explicitGap)<1e-6&&Math.abs(terminalGap)<1e-6,averageVsMarginalRoicGap:maxRoicGap,marketPriceUsed:false};
  }

  function jukaOwnerEarningsAudit(input={},adaptive={},base=null){
    base=base||jukaOwnerEarningsIntrinsicValue(input,adaptive,'base');if(!base)return null;
    const a=adaptive?.assumptions||{},baseV=Number(base.valuePerShare);
    const rerun=(patch={},extra={})=>{
      const aa={...a,...patch};if(aa.wacc<=aa.terminalGrowth+.02)aa.wacc=aa.terminalGrowth+.02;
      return jukaOwnerEarningsIntrinsicValue(input,{...adaptive,assumptions:aa},extra.scenario||'base')?.valuePerShare??null;
    };
    const capBase=Number(base.capYears)||jukaCompetitiveAdvantagePeriod(adaptive).years;
    const sensitivity={
      waccMinus05:rerun({wacc:a.wacc-.005}),waccPlus05:rerun({wacc:a.wacc+.005}),
      waccMinus1:rerun({wacc:a.wacc-.01}),waccPlus1:rerun({wacc:a.wacc+.01}),
      growthY1Minus2:rerun({growthY1:a.growthY1-.02}),growthY1Plus2:rerun({growthY1:a.growthY1+.02}),
      growthY5Minus2:rerun({growthY5:Math.max(.005,a.growthY5-.02)}),growthY5Plus2:rerun({growthY5:Math.min(.16,a.growthY5+.02)}),
      marginMinus2:rerun({targetEbitMarginY5:a.targetEbitMarginY5-.02}),marginPlus2:rerun({targetEbitMarginY5:a.targetEbitMarginY5+.02}),
      terminalGrowthMinus05:rerun({terminalGrowth:Math.max(.015,a.terminalGrowth-.005)}),terminalGrowthPlus05:rerun({terminalGrowth:Math.min(.035,a.terminalGrowth+.005)}),
      capMinus2:jukaOwnerEarningsIntrinsicValue(input,{...adaptive,assumptions:{...a},moatEvidence:{...(adaptive.moatEvidence||{}),modifierYears:-2}},'base')?.valuePerShare??null,
      capPlus2:(()=>{const fake={...adaptive,assumptions:{...a},metrics:{...(adaptive.metrics||{})}}; const target=clamp(capBase+2,4,14); fake.assumptions.capYearsOverride=target; return null;})()
    };
    // CAP override is explicit to prevent the sensitivity from being contaminated by the moat evidence policy.
    const capValue=(years)=>{
      const original=jukaCompetitiveAdvantagePeriod(adaptive),delta=years-original.years;
      const fake={...adaptive,moatEvidence:{available:true,modifierYears:Math.min(0,delta),classification:'audit',sources:['internal-audit']}};
      if(delta>0){ // quantitative score cannot be increased by qualitative evidence; approximate by extending growth persistence in a controlled audit.
        const b=jukaOwnerEarningsIntrinsicValue(input,fake,'base');
        if(!b)return null;
        // Recalculate directly by using bull/base interpolation only for the audit is not acceptable; leave unavailable when extension cannot be source-justified.
        return null;
      }
      return jukaOwnerEarningsIntrinsicValue(input,fake,'base')?.valuePerShare??null;
    };
    sensitivity.capMinus2=capValue(Math.max(4,capBase-2));
    delete sensitivity.capPlus2;
    const deltas={};for(const [k,v] of Object.entries(sensitivity))deltas[k]=Number.isFinite(v)?v-baseV:null;
    return {valuePerShare:baseV,bridge:{explicitPerShare:input.shares>0?base.pvExplicit/input.shares:null,terminalPerShare:input.shares>0?base.terminalPv/input.shares:null,
      netDebtPerShare:input.shares>0?-Number(input.netDebt||0)/input.shares:null,terminalShare:base.terminalShare},sensitivity,deltas,
      assumptions:{growthY1:a.growthY1,growthY5:a.growthY5,targetEbitMarginY5:a.targetEbitMarginY5,wacc:a.wacc,terminalGrowth:base.terminalGrowth,terminalRoic:base.terminalRoic,capYears:base.capYears},
      forecastBridge:(base.flows||[]).map(x=>({year:x.year,growth:x.growth,margin:x.margin,marginalRoic:x.marginalRoic,growthInvestment:x.growthInvestment,growthReinvestmentRate:x.growthReinvestmentRate,ownerEarnings:x.ownerEarnings})),
      marketPriceUsed:false};
  }

  function jukaHistoricalValuationAudit(history=[]){
    const rows=(history||[]).filter(x=>Number(x.price)>0&&Number(x.base)>0);
    if(rows.length<20)return {available:false,reason:'insufficient-history',count:rows.length,marketPriceUsedForCalibration:false};
    const ratios=rows.map(x=>Number(x.price)/Number(x.base)),overBull=rows.filter(x=>Number(x.bull)>0&&Number(x.price)>Number(x.bull)).length/rows.length;
    const over2=ratios.filter(x=>x>2).length/ratios.length,underHalf=ratios.filter(x=>x<.5).length/ratios.length,med=median(ratios),sorted=[...ratios].sort((a,b)=>a-b);
    const q=(p)=>sorted[Math.min(sorted.length-1,Math.max(0,Math.floor((sorted.length-1)*p)))];
    const flags=[];
    if(rows.length>=120&&over2>.60)flags.push({severity:'high',code:'persistent-market-above-2x-base',text:'Der Marktpreis lag in mehr als 60% der beobachteten Tage über dem Doppelten des Base Fair Value.'});
    if(rows.length>=120&&overBull>.70)flags.push({severity:'high',code:'persistent-market-above-bull',text:'Der Marktpreis lag in mehr als 70% der beobachteten Tage über dem Bull-Szenario.'});
    if(rows.length>=120&&underHalf>.60)flags.push({severity:'high',code:'persistent-market-below-half-base',text:'Der Marktpreis lag in mehr als 60% der beobachteten Tage unter der Hälfte des Base Fair Value.'});
    return {available:true,count:rows.length,medianPriceToBase:med,p10PriceToBase:q(.10),p90PriceToBase:q(.90),sharePriceAbove2xBase:over2,sharePriceAboveBull:overBull,sharePriceBelowHalfBase:underHalf,
      status:flags.some(x=>x.severity==='high')?'systematischer-bias-verdacht':'unauffällig',flags,marketPriceUsedForCalibration:false,diagnosticOnly:true};
  }


  function jukaHistoricalIntegrityAudit(history=[]){
    const rows=(history||[]).filter(x=>Number.isFinite(Number(x.base))&&Number(x.base)>0);
    if(!rows.length)return {available:false,reason:'no-historical-fair-value',marketPriceUsed:false};
    const flags=[],filingPoints=[];let lastKey=null;
    for(const x of rows){
      const key=String(x.availableFrom||x.sourceFy||x.date||'');
      if(key!==lastKey){filingPoints.push(x);lastKey=key;}
      const bear=Number(x.bear),base=Number(x.base),bull=Number(x.bull);
      if(!(bear>0&&base>0&&bull>0&&bear<=base&&base<=bull))flags.push({severity:'high',code:'historical-scenario-order-invalid',date:x.date||null});
    }
    let maxStepRatio=1,largeSteps=0,extremeSteps=0;
    for(let i=1;i<filingPoints.length;i++){
      const prev=Number(filingPoints[i-1].base),cur=Number(filingPoints[i].base);
      if(!(prev>0&&cur>0))continue;
      const ratio=Math.max(cur/prev,prev/cur);maxStepRatio=Math.max(maxStepRatio,ratio);
      if(ratio>2.5)largeSteps++;if(ratio>4)extremeSteps++;
    }
    if(extremeSteps)flags.push({severity:'high',code:'historical-fv-extreme-step',count:extremeSteps,maxStepRatio});
    else if(largeSteps)flags.push({severity:'medium',code:'historical-fv-large-step',count:largeSteps,maxStepRatio});
    const status=flags.some(x=>x.severity==='high')?'nicht belastbar':flags.some(x=>x.severity==='medium')?'prüfen':'plausibel';
    return {available:true,status,count:rows.length,filingPoints:filingPoints.length,maxStepRatio,largeSteps,extremeSteps,
      splitAdjustedPoints:rows.filter(x=>x.shareBasisAdjusted===true).length,flags,marketPriceUsed:false};
  }

  function jukaReleaseGate(result={}){
    const conf=Number(result?.confidence?.score),pl=result?.plausibility||{},st=result?.stability||{},er=result?.excessReturn||{},ff=result?.forecastFeasibility||{};
    const blockers=[],warnings=[],domains={math:'pass',forecast:'pass',stability:'pass',data:'pass',terminal:'pass'};
    if(!er.available){blockers.push('capital-audit-unavailable');domains.math='hold';}
    else{
      if(Math.abs(Number(er.explicitGap))>1e-5||!er.capitalConsistent){blockers.push('capital-reconciliation');domains.math='hold';}
      if(Number.isFinite(er.convergence)&&er.convergence>.15){blockers.push('dcf-eva-divergence');domains.math='hold';}
      else if(Number.isFinite(er.convergence)&&er.convergence>.07){warnings.push('dcf-eva-divergence');domains.math='review';}
    }
    if(ff.status==='nicht belastbar'){blockers.push('forecast-economics-not-robust');domains.forecast='hold';}
    else if(ff.status==='prüfen'){warnings.push('forecast-economics-review');domains.forecast='review';}
    if(st.status==='instabil'){blockers.push('valuation-instability');domains.stability='hold';}
    if(Number(st?.relativeSensitivity?.capYears)>.25){blockers.push('competitive-advantage-period-instability');domains.stability='hold';}
    else if(st.status==='sensitiv'){warnings.push('valuation-sensitive');domains.stability='review';}

    const terminalShare=Number(result?.checks?.terminalShare??result?.valuation?.detail?.base?.terminalShare);
    const localWacc=Number(st?.relativeSensitivity?.wacc05);
    if(terminalShare>.75&&localWacc>.12){blockers.push('terminal-wacc-combination');domains.terminal='hold';}
    else if(terminalShare>.70){warnings.push('terminal-heavy');domains.terminal='review';}

    // Plausibility is an aggregate diagnostic. Do not block again for flags already represented
    // by forecast/stability/terminal domains. Only unique structural plausibility flags can add a blocker.
    const represented=new Set(['terminal-dominance','terminal-heavy','valuation-instability','valuation-sensitivity','excess-return-divergence']);
    const uniqueHigh=(pl.flags||[]).filter(x=>x.severity==='high'&&!represented.has(x.code));
    if(uniqueHigh.length)blockers.push('unique-plausibility-failure');

    // Low confidence is primarily a data/evidence warning. It becomes a blocker only with weak data coverage.
    const dq=Number(result?.adaptive?.dataQuality?.score);
    if(Number.isFinite(conf)&&conf<50){
      if(Number.isFinite(dq)&&dq<55){blockers.push('data-confidence-low');domains.data='hold';}
      else {warnings.push('confidence-low');domains.data='review';}
    }else if(Number.isFinite(conf)&&conf<65){warnings.push('confidence-medium');domains.data='review';}

    const status=blockers.length?'hold':warnings.length?'review':'pass';
    return {liveReady:status==='pass',status,
      domains,blockers:[...new Set(blockers)],warnings:[...new Set(warnings)]};
  }


  function jukaFairValueAudit(input={},adaptive={},valuation={},owner=null,legacy=null){
    const base=valuation?.detail?.base||jukaEconomicDcf(input,adaptive);
    if(!base)return null;
    const a=adaptive?.assumptions||{};
    const shares=n(input.shares,0),netDebt=n(input.netDebt,0);
    const explicitPerShare=shares>0?base.pvExplicit/shares:null;
    const terminalPerShare=shares>0?base.terminalPv/shares:null;
    const netDebtPerShare=shares>0?-netDebt/shares:null;
    const reconstructed=Number.isFinite(explicitPerShare)&&Number.isFinite(terminalPerShare)&&Number.isFinite(netDebtPerShare)
      ?explicitPerShare+terminalPerShare+netDebtPerShare:null;

    const rerun=(patch={})=>{
      const aa={...a,...patch};
      if(aa.wacc<=aa.terminalGrowth+.02)aa.wacc=aa.terminalGrowth+.02;
      return jukaEconomicDcf(input,{...adaptive,assumptions:aa})?.valuePerShare??null;
    };
    const baseV=base.valuePerShare;
    const sensitivity={
      waccMinus05:rerun({wacc:a.wacc-.005}),waccPlus05:rerun({wacc:a.wacc+.005}),
      waccMinus1:rerun({wacc:a.wacc-.01}),waccPlus1:rerun({wacc:a.wacc+.01}),
      growthY1Minus2:rerun({growthY1:a.growthY1-.02}),growthY1Plus2:rerun({growthY1:a.growthY1+.02}),
      growthY5Minus2:rerun({growthY5:Math.max(.01,a.growthY5-.02)}),growthY5Plus2:rerun({growthY5:Math.min(.14,a.growthY5+.02)}),
      marginMinus2:rerun({targetEbitMarginY5:a.targetEbitMarginY5-.02}),marginPlus2:rerun({targetEbitMarginY5:a.targetEbitMarginY5+.02}),
      terminalGrowthMinus05:rerun({terminalGrowth:Math.max(.015,a.terminalGrowth-.005)}),
      terminalGrowthPlus05:rerun({terminalGrowth:Math.min(.04,a.terminalGrowth+.005)}),
      terminalRoicMinus5:rerun({terminalRoic:Math.max(.07,a.terminalRoic-.05)}),
      terminalRoicPlus5:rerun({terminalRoic:Math.min(.35,a.terminalRoic+.05)}),
      capMinus2:rerun({capYearsOverride:Math.max(4,(base?.capPolicy?.years||8)-2)}),
      capPlus2:rerun({capYearsOverride:Math.min(14,(base?.capPolicy?.years||8)+2)})
    };
    const deltas={};
    for(const [k,v] of Object.entries(sensitivity))deltas[k]=Number.isFinite(v)?v-baseV:null;
    const finite=Object.values(deltas).filter(Number.isFinite).map(Math.abs);
    const maxSensitivity=finite.length?Math.max(...finite):null;
    const modelValues=[baseV,Number(owner?.valuePerShare),Number(legacy?.base)].filter(x=>Number.isFinite(x)&&x>0);
    const modelMedian=median(modelValues);
    const modelDispersion=modelMedian>0&&modelValues.length>1?(Math.max(...modelValues)-Math.min(...modelValues))/modelMedian:null;
    return {
      valuePerShare:baseV,
      bridge:{explicitPerShare,terminalPerShare,netDebtPerShare,reconstructed,
        explicitShare:base.enterprise>0?base.pvExplicit/base.enterprise:null,
        terminalShare:base.terminalShare},
      sensitivity,deltas,maxSensitivity,
      crossChecks:{ownerEarnings:owner?.valuePerShare??null,legacyDcf:legacy?.base??null,modelDispersion},
      assumptions:{growthY1:a.growthY1,growthY5:a.growthY5,targetEbitMarginY5:a.targetEbitMarginY5,
        wacc:a.wacc,terminalGrowth:a.terminalGrowth,terminalRoic:base.terminal?.roic??a.terminalRoic,rawTerminalRoic:a.terminalRoic},
      forecastBridge:(base.flows||[]).map(x=>({year:x.year,growth:x.growth,margin:x.margin,roic:x.roic,wacc:x.wacc,reinvestmentRate:x.reinvestmentRate,roicReinvestmentRate:x.roicReinvestmentRate,salesCapitalRate:x.salesCapitalRate,fcff:x.fcff,pv:x.pv})),
      reinvestmentEfficiency:base.reinvestmentEfficiency,
      investedCapitalLatest:jukaNormalizedInvestedCapital((input.annualFacts||[]).at(-1)||{}),
      waccPolicy:base.waccPolicy||jukaWaccPolicy(adaptive),
      marketPriceUsed:false
    };
  }

  function jukaFairValueStability(audit={}){
    const b=Number(audit.valuePerShare),d=audit.deltas||{},flags=[];
    const rel=(v)=>b>0&&Number.isFinite(v)?Math.abs(v)/b:null;
    const w05=Math.max(rel(d.waccMinus05)||0,rel(d.waccPlus05)||0);
    const w=Math.max(rel(d.waccMinus1)||0,rel(d.waccPlus1)||0);
    const g=Math.max(rel(d.growthY5Minus2)||0,rel(d.growthY5Plus2)||0);
    const m=Math.max(rel(d.marginMinus2)||0,rel(d.marginPlus2)||0);
    const tg=Math.max(rel(d.terminalGrowthMinus05)||0,rel(d.terminalGrowthPlus05)||0);
    const tr=Math.max(rel(d.terminalRoicMinus5)||0,rel(d.terminalRoicPlus5)||0);
    const cap=Math.max(rel(d.capMinus2)||0,rel(d.capPlus2)||0);
    if(w05>.18)flags.push({severity:'high',code:'local-wacc-sensitive',message:'Bereits ±0,5pp WACC verändern den Fair Value um mehr als 18%.'});
    if(w>.30)flags.push({severity:'high',code:'wacc-sensitive',message:'±1pp WACC verändert den Fair Value um mehr als 30%.'});
    else if(w>.20)flags.push({severity:'medium',code:'wacc-sensitive',message:'±1pp WACC verändert den Fair Value um mehr als 20%.'});
    if(g>.25)flags.push({severity:'high',code:'growth-sensitive',message:'±2pp Jahr-5-Wachstum verändert den Fair Value um mehr als 25%.'});
    else if(g>.15)flags.push({severity:'medium',code:'growth-sensitive',message:'Jahr-5-Wachstum hat hohe Bewertungswirkung.'});
    if(m>.15)flags.push({severity:'medium',code:'margin-sensitive',message:'±2pp Zielmarge verändert den Fair Value um mehr als 15%.'});
    if(tg>.15)flags.push({severity:'medium',code:'terminal-growth-sensitive',message:'Terminal Growth hat hohe Bewertungswirkung.'});
    if(tr>.15)flags.push({severity:'medium',code:'terminal-roic-sensitive',message:'Terminal ROIC hat hohe Bewertungswirkung.'});
    if(cap>.25)flags.push({severity:'high',code:'cap-sensitive',message:'±2 Jahre Competitive Advantage Period verändern den Fair Value um mehr als 25%.'});
    else if(cap>.15)flags.push({severity:'medium',code:'cap-sensitive',message:'±2 Jahre Competitive Advantage Period verändern den Fair Value um mehr als 15%.'});
    const high=flags.filter(x=>x.severity==='high').length,med=flags.filter(x=>x.severity==='medium').length;
    return {status:high?'instabil':med>=2?'sensitiv':'stabil',flags,
      relativeSensitivity:{wacc05:w05,wacc:w,growthY5:g,margin:m,terminalGrowth:tg,terminalRoic:tr,capYears:cap},marketPriceUsed:false};
  }

  function jukaFairValuePlausibilityAudit(result={}, annualFacts=[]){
    const rows=deriveFundamentals(annualFacts),f=result.fundamentalForecast||result.adaptive?.fundamentalForecast||{};
    const v=result.valuation||{},checks=result.checks||{},tri=result.triangulation||{},stability=result.stability||{};
    const flags=[],metrics={};
    const add=(severity,code,message)=>flags.push({severity,code,message});
    metrics.terminalShare=Number(checks.terminalShare);
    metrics.crossCheckDispersion=Number(tri.ownerVsEconomic);
    metrics.growthY1=Number(f.growthY1);
    metrics.growthY5=Number(f.growthY5);
    metrics.marginY5=Number(f.targetEbitMarginY5);
    metrics.wacc=Number(result.adaptive?.assumptions?.wacc);
    metrics.terminalGrowth=Number(result.adaptive?.assumptions?.terminalGrowth);
    metrics.terminalRoic=Number(result.adaptive?.assumptions?.terminalRoic);

    if(metrics.terminalShare>.75)add('high','terminal-dominance','Mehr als 75% des Enterprise Value stammen aus dem Terminal Value.');
    else if(metrics.terminalShare>.65)add('medium','terminal-heavy','Mehr als 65% des Enterprise Value stammen aus dem Terminal Value.');
    if(metrics.crossCheckDispersion>.75)add('high','crosscheck-divergence','Unabhängige Bewertungswege weichen um mehr als 75% voneinander ab.');
    else if(metrics.crossCheckDispersion>.45)add('medium','crosscheck-divergence','Unabhängige Bewertungswege weichen deutlich voneinander ab.');
    if(metrics.growthY5>.12)add('high','year5-growth','Jahr-5-Wachstum liegt über 12%.');
    else if(metrics.growthY5>.09)add('medium','year5-growth','Jahr-5-Wachstum bleibt über 9%.');
    if(metrics.marginY5>.60)add('medium','extreme-margin','Langfristige EBIT-Marge liegt über 60%.');
    if(metrics.wacc-metrics.terminalGrowth<.035)add('high','terminal-spread','WACC minus Terminal Growth liegt unter 3,5 Prozentpunkten.');
    if(metrics.terminalRoic>metrics.wacc+.12)add('medium','perpetual-excess-return','Terminal-ROIC liegt mehr als 12 Prozentpunkte über WACC.');
    const er=result.excessReturn||{};
    if(er.available&&Number.isFinite(er.convergence)){
      if(er.convergence>.15)add('high','excess-return-divergence','DCF und Excess-Return-Modell weichen um mehr als 15% voneinander ab.');
      else if(er.convergence>.07)add('medium','excess-return-divergence','DCF und Excess-Return-Modell weichen um mehr als 7% voneinander ab.');
    }
    if(stability.status==='instabil')add('high','valuation-instability','Fair Value reagiert zu stark auf plausible Annahmeänderungen.');
    else if(stability.status==='sensitiv')add('medium','valuation-sensitivity','Fair Value ist gegenüber mehreren Annahmen empfindlich.');
    const high=flags.filter(x=>x.severity==='high').length,medium=flags.filter(x=>x.severity==='medium').length;
    let status=high?'nicht belastbar':medium>=2?'prüfen':'plausibel';
    let score=100-high*28-medium*12;
    score=clamp(score,0,100);
    return {status,score,flags,metrics,marketPriceUsed:false};
  }

  function jukaFairValueTriangulation(owner=null,economic=null,earningsPower=null,legacy=null){
    const o=Number(owner?.valuePerShare),d=Number(economic?.valuePerShare),e=Number(earningsPower?.valuePerShare),l=Number(legacy?.base);
    const comparable=[o,d].filter(x=>Number.isFinite(x)&&x>0),med=median(comparable);
    return {fairValue:o,primaryMethod:'ownerEarnings',medianComparable:med,
      ownerVsEconomic:o>0&&d>0?Math.abs(o-d)/o:null,earningsPowerFloor:e,legacyDiagnostic:l,
      values:{ownerEarnings:o,economicDcf:d,earningsPower:e,legacyDcf:l},marketPriceUsed:false};
  }

  function jukaFairValue2Operating(stock={},annualFacts=[],price=null,overrides={}){
    let rows=deriveFundamentals(annualFacts),latest=rows.at(-1);
    const rdPolicy=jukaRdPolicy(stock,rows);
    const rdAdjustment=rdPolicy.eligible?jukaRdCapitalization(rows,overrides.rdLife??rdPolicy.life):{available:false,reason:rdPolicy.reason,rows};
    rdAdjustment.policy=rdPolicy;
    if(rdAdjustment.available){
      rows=rdAdjustment.rows.map(x=>({...x,
        operatingIncome:Number.isFinite(Number(x.adjustedOperatingIncome))?x.adjustedOperatingIncome:x.operatingIncome,
        equity:Number.isFinite(Number(x.adjustedEquity))?x.adjustedEquity:x.equity
      }));
      latest=rows.at(-1);
    }
    let adaptive=jukaAdaptiveOperatingAssumptions(rows,overrides);
    if(!adaptive||!latest)return null;
    adaptive={...adaptive,moatEvidence:jukaMoatEvidencePolicy(stock)};
    const fundamentalForecast=jukaFundamentalForecastEngine(rows,adaptive);
    if(fundamentalForecast){
      adaptive={...adaptive,assumptions:{...adaptive.assumptions,
        growthY1:overrides.growthY1??fundamentalForecast.growthY1,
        growthY5:overrides.growthY5??fundamentalForecast.growthY5,
        targetEbitMarginY5:overrides.targetEbitMarginY5??fundamentalForecast.targetEbitMarginY5
      },fundamentalForecast};
    }
    const a=adaptive.assumptions;
    const inp=dcfInputFromAnnual(rows,rows.length-1,a); if(inp)inp.annualFacts=rows;
    if(!inp)return null;

    // Legacy DCF is retained only as an independent diagnostic.
    const legacy=jukaDcfScenarios(inp);
    const economic=jukaEconomicDcf(inp,adaptive);
    const owner=jukaOwnerEarningsIntrinsicValue(inp,adaptive,'base');
    if(!owner||!(owner.valuePerShare>0)||!economic||!(economic.valuePerShare>0))return null;
    const bear=jukaOwnerEarningsIntrinsicValue(inp,adaptive,'bear'),bull=jukaOwnerEarningsIntrinsicValue(inp,adaptive,'bull');
    const valuation={bear:bear?.valuePerShare??null,base:owner.valuePerShare,bull:bull?.valuePerShare??null,detail:{bear,base:owner,bull}};
    const sensitivity=jukaSensitivity(inp);
    const earningsPower=jukaEarningsPowerValue(inp,adaptive);
    const triangulation=jukaFairValueTriangulation(owner,economic,earningsPower,legacy);
    let confidence=jukaFairValueConfidence({annualFacts:rows,valuation,selfCheck:adaptive.selfCheck,dataQuality:adaptive.dataQuality,sensitivity});
    // Independent-model disagreement is a confidence penalty, never an automatic price adjustment.
    if(Number.isFinite(triangulation?.ownerVsEconomic)&&triangulation.ownerVsEconomic>.50){
      confidence={score:Math.max(0,confidence.score-12),label:confidence.score-12>=80?'hoch':confidence.score-12>=60?'mittel':'niedrig'};
    }
    const reverse=Number(price)>0?jukaReverseDcf(inp,Number(price)):null;
    const result={
      version:'JUKA Fair Value 7.0',model:'owner-earnings-primary+economic-dcf-crosscheck+earnings-power-floor',
      valuation,assumptions:inp,adaptive,fundamentalForecast,rdPolicy,rdAdjustment,reverse,sensitivity,confidence,ownerEarnings:owner,economicDcf:economic,triangulation,
      drivers:jukaFairValueDrivers(adaptive,valuation),
      checks:{
        walkForward:adaptive.selfCheck,terminalShare:owner.terminalShare,
        marketPriceUsedForCalibration:false,
        reinvestmentConsistency:{
          terminalGrowth:a.terminalGrowth,terminalRoic:a.terminalRoic,
          impliedReinvestmentRate:a.terminalGrowth/a.terminalRoic,
          valid:a.terminalRoic>a.terminalGrowth
        },
        crossCheckDispersion:triangulation?.ownerVsEconomic??null
      }
    };
    result.excessReturn=jukaExcessReturnValuation(inp,adaptive,economic);
    result.forecastFeasibility=jukaForecastFeasibility(owner);
    result.economicAudit=jukaFairValueAudit(inp,adaptive,{...valuation,detail:{...valuation.detail,base:economic}},owner,legacy);
    result.audit=jukaOwnerEarningsAudit(inp,adaptive,owner);
    if(result.audit)result.audit.economicDcfAudit=result.economicAudit;
    result.stability=jukaFairValueStability(result.audit);
    result.plausibility=jukaFairValuePlausibilityAudit(result,rows);
    result.releaseGate=jukaReleaseGate(result);
    result.multiMethodGate=jukaMultiMethodReleaseGate(result,inp,adaptive);
    return result;
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
    const revenue=Number(r.revenue),ebit=Number(r.operatingIncome),shares=Number(r.shares);
    if(!(revenue>0&&Number.isFinite(ebit)&&shares>0))return null;
    const daRaw=r.da,capexRaw=r.capex;
    let da=Number(daRaw),capex=Number(capexRaw);
    const daKnown=daRaw!==null&&daRaw!==undefined&&daRaw!==''&&Number.isFinite(da)&&da>=0;
    const capexKnown=capexRaw!==null&&capexRaw!==undefined&&capexRaw!==''&&Number.isFinite(capex)&&capex>=0;
    if(!daKnown&&!capexKnown){da=0;capex=0;}
    else if(!daKnown){da=capex;}
    else if(!capexKnown){capex=da;}
    const gHist=fieldCagr(rows,'revenue',i,3)??fieldCagr(rows,'revenue',i,5)??.06;
    const g1=clamp(n(assumptions.growthY1,gHist),-.05,.30), terminalGrowth=n(assumptions.terminalGrowth,.025), g5=clamp(n(assumptions.growthY5,Math.max(terminalGrowth+.01,g1*.60)),terminalGrowth,.20);
    const marginMedian=medianField(rows,'operatingMargin',i-2,i)??r.operatingMargin??ebit/revenue;
    const capexPct=median(rows.slice(Math.max(0,i-2),i+1).map(x=>Number(x.capex)/Number(x.revenue)).filter(Number.isFinite));
    const daPct=median(rows.slice(Math.max(0,i-2),i+1).map(x=>Number(x.da)/Number(x.revenue)).filter(Number.isFinite));
    const nwcPct=median(rows.slice(Math.max(0,i-2),i+1).map(x=>Number(x.deltaNwc)/Number(x.revenue)).filter(Number.isFinite));
    const taxRate=Number.isFinite(r.taxRate)?r.taxRate:n(assumptions.taxRate,.21); const terminalRoic=clamp(n(assumptions.terminalRoic,Number.isFinite(r.roic)?r.roic:.15),Math.max(terminalGrowth+.01,.06),.35);
    const netFin=Number.isFinite(Number(r.netFinancialPosition))?Number(r.netFinancialPosition):(Number.isFinite(Number(r.debt))&&Number.isFinite(Number(r.cash))?Number(r.debt)-Number(r.cash):0);
    return {revenue,ebit,taxRate,da,capex,deltaNwc:Number.isFinite(Number(r.deltaNwc))?Number(r.deltaNwc):0,shares,netFinancialPosition:netFin,growthY1:g1,growthY5:g5,targetEbitMarginY5:clamp(n(assumptions.targetEbitMarginY5,marginMedian),-.05,.60),wacc:n(assumptions.wacc,.09),terminalGrowth,terminalRoic,capexPctY5:n(assumptions.capexPctY5,Number.isFinite(capexPct)?capexPct:capex/revenue),daPctY5:n(assumptions.daPctY5,Number.isFinite(daPct)?daPct:da/revenue),nwcPctY5:n(assumptions.nwcPctY5,Number.isFinite(nwcPct)?nwcPct:0),bearGrowthAdj:n(assumptions.bearGrowthAdj,-.03),bearMarginAdj:n(assumptions.bearMarginAdj,-.03),bearWaccAdj:n(assumptions.bearWaccAdj,.015),bullGrowthAdj:n(assumptions.bullGrowthAdj,.03),bullMarginAdj:n(assumptions.bullMarginAdj,.03),bullWaccAdj:n(assumptions.bullWaccAdj,-.01),sourceFy:r.fy,sourceDate:r.date,availableFrom:r.accepted||r.filed||r.filedDate||r.publishedDate||r.availableFrom||null,maintenanceData:{daKnown,capexKnown,proxyUsed:!daKnown||!capexKnown}};
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
      const fv2=jukaFairValue2Operating(stock,rows,price,overrides);
      if(!fv2){result.diagnostics.push('JUKA Fair Value 7.0 konnte aus den verfügbaren Daten nicht vollständig berechnet werden.');return result;}
      const a=fv2.adaptive?.assumptions||{};
      result.assumptions={dcf:fv2.assumptions,auto:fv2.adaptive,fairValue2:{version:fv2.version,model:fv2.model,confidence:fv2.confidence,drivers:fv2.drivers,checks:fv2.checks}};
      result.valuation=fv2.valuation;
      result.reverse=fv2.reverse;
      result.sensitivity=fv2.sensitivity;
      result.fairValue2={version:fv2.version,model:fv2.model,confidence:fv2.confidence,drivers:fv2.drivers,checks:fv2.checks};
      result.valuationMethods={ownerEarnings:fv2.ownerEarnings?.valuePerShare??null,economicDcf:fv2.economicDcf?.valuePerShare??null,
        earningsPower:fv2.multiMethodGate?.earningsPower?.valuePerShare??null,primaryMethod:'ownerEarnings'};
      result.stability=fv2.stability||null;
      result.plausibility=fv2.plausibility||null;
      result.audit=fv2.audit||null;
      result.economicAudit=fv2.economicAudit||null;
      result.forecastFeasibility=fv2.forecastFeasibility||null;
      result.excessReturn=fv2.excessReturn||null;
      result.release={status:fv2.multiMethodGate?.status||'nicht belastbar',liveReady:fv2.multiMethodGate?.liveReady===true,
        gate:fv2.multiMethodGate,domains:fv2.releaseGate?.domains||null,
        blockers:fv2.multiMethodGate?.blockers||[],warnings:fv2.multiMethodGate?.warnings||[]};
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
      result.stability=jukaModelStability(model,{bvps:result.assumptions.bookValuePerShare,roe:result.assumptions.roe,
        costOfEquity:result.assumptions.costOfEquity,terminalGrowth:result.assumptions.growth},result);
      result.release=jukaReleaseMatrixCase(model,result.valuation,result.stability,{ready:readiness.ready});
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
      result.stability=jukaModelStability(model,{affoPerShare:result.assumptions.affoPerShare,affoGrowth:result.assumptions.affoGrowth5y,
        exitMultiple:result.assumptions.exitPAffo,costOfEquity:result.assumptions.costOfEquity},result);
      result.release=jukaReleaseMatrixCase(model,result.valuation,result.stability,
        {ready:readiness.ready,proxyUsed:result.assumptions.affoSource==='ffo-proxy'});
      return result;
    }
    return result;
  }


  // Historical price providers commonly return split-adjusted prices, while SEC
  // point-in-time share counts reflect the share basis known at that filing.
  // This helper detects only large, near-standard split ratios and normalizes
  // historical per-share Fair Values to the current share basis for display.
  // It never changes the enterprise/equity valuation and never uses market price.
  function jukaHistoricalShareBasis(annualFacts=[]){
    const rows=deriveFundamentals(annualFacts);
    const factors=new Array(rows.length).fill(1),events=[];
    const standards=[20,10,5,4,3,2,.5,1/3,.25,.2,.1,.05];
    const nearest=(ratio)=>{
      if(!(ratio>0))return null;
      let best=null,err=Infinity;
      for(const x of standards){
        const e=Math.abs(ratio-x)/Math.max(Math.abs(x),1e-9);
        if(e<err){err=e;best=x;}
      }
      return err<=.16?best:null;
    };
    let cumulative=1;
    for(let i=rows.length-1;i>0;i--){
      const cur=rows[i],prev=rows[i-1],cs=Number(cur.shares),ps=Number(prev.shares);
      if(!(cs>0&&ps>0)){factors[i-1]=cumulative;continue;}
      const ratio=cs/ps,split=nearest(ratio);
      const cr=Number(cur.revenue),pr=Number(prev.revenue),revenueRatio=cr>0&&pr>0?cr/pr:null;
      // A genuine split changes share count dramatically without a comparable
      // jump in business scale. This avoids treating large acquisitions/issuance as splits.
      const scaleMovedSimilarly=Number.isFinite(revenueRatio)&&(
        (ratio>1.5&&revenueRatio>1.5) || (ratio<.67&&revenueRatio<.67)
      );
      if(split&&Math.abs(Math.log(split))>Math.log(1.5)&&!scaleMovedSimilarly){
        cumulative*=split;
        events.push({index:i,date:cur.date||null,ratio,normalizedRatio:split,fromShares:ps,toShares:cs});
      }
      factors[i-1]=cumulative;
    }
    return {factors,events:events.reverse(),marketPriceUsed:false,displayNormalizationOnly:true};
  }

  function buildHistoricalValuationSeries(stock={},priceRows=[],annualFacts=[],overrides={}){
    if(!Array.isArray(priceRows)||!priceRows.length)return [];
    const rows=deriveFundamentals(annualFacts),shareBasis=jukaHistoricalShareBasis(rows);
    const model=classifyValuationModel(stock);
    const dated=rows.map((x,i)=>({x,i,available:String(x.accepted||x.filed||x.filedDate||x.publishedDate||x.availableFrom||'')}))
      .filter(x=>x.available).sort((a,b)=>a.available.localeCompare(b.available));
    const cache=new Map(),out=priceRows.map(p=>{
      const date=String(p.date||'').slice(0,10);let chosen=null;
      for(const d of dated){if(d.available<=date)chosen=d;else break;}
      if(!chosen)return {...p,bear:null,base:null,bull:null,model,sourceFy:null,availableFrom:null};
      if(!cache.has(chosen.i)){
        const slice=rows.slice(0,chosen.i+1),engine=jukaValuationEngine(stock,slice,null,overrides);
        cache.set(chosen.i,engine);
      }
      const engine=cache.get(chosen.i),v=engine?.valuation;
      if(!v||!Number.isFinite(Number(v.base)))return {...p,bear:null,base:null,bull:null,model,sourceFy:chosen.x.fy,availableFrom:chosen.available};
      const factor=Number(shareBasis.factors[chosen.i])||1;
      // No synthetic WACC roll-forward between filings. With no new public
      // information, the historical intrinsic-value estimate stays unchanged.
      return {...p,
        bear:Number(v.bear)/factor,base:Number(v.base)/factor,bull:Number(v.bull)/factor,
        model,sourceFy:chosen.x.fy,availableFrom:chosen.available,
        shareBasisFactor:factor,shareBasisAdjusted:factor!==1,
        valuationEngine:engine?.readiness?.valuationEngine||null,
        confidence:engine?.fairValue2?.confidence??engine?.readiness?.confidence??null,
        releaseStatus:engine?.release?.status||null,liveReady:engine?.release?.liveReady===true
      };
    });
    if(!out.some(x=>Number.isFinite(Number(x.base))))return [];
    out.shareBasis=shareBasis;
    return out;
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
      required:['revenue','operatingIncome','shares'],
      recommended:['da','capex','cash','debt','pretaxIncome','incomeTax','fcf'],
      valuationEngine:'Owner Earnings + Economic DCF'
    };
  }

  function jukaModelReadiness(model='operating-company', latest=null, annualFacts=[]){
    const req=modelDataRequirements(model), row=latest||{};
    const usable=(field)=>{
      const raw=row[field];
      if(raw===null||raw===undefined||raw==='')return false;
      const v=Number(raw);
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

  function jukaAsOfRows(rows=[],asOfDate){
    const cut=new Date(asOfDate).getTime(); if(!Number.isFinite(cut))return [];
    return (rows||[]).filter(r=>{
      const filed=r?.accepted||r?.filed||r?.filedDate||r?.publishedDate||r?.availableFrom;
      const t=filed?new Date(filed).getTime():NaN;
      return Number.isFinite(t)&&t<=cut;
    }).sort((a,b)=>new Date(a.date||a.filed||0)-new Date(b.date||b.filed||0));
  }
  function jukaPointInTimeFairValue(stock={},rows=[],priceHistory=[],options={}){
    const dates=(options.dates||[]).map(String).filter(Boolean);
    const sector=String(stock?.sector||'').toLowerCase(),hint=String(stock?.valuationModel||'').toLowerCase();
    const model=options.model||(hint.includes('bank')||/(bank|insurance|financial)/.test(sector)?'bank-insurance':hint.includes('reit')||sector.includes('reit')?'reit':'operating-company'),points=[];
    for(const asOf of dates){
      const knownRows=jukaAsOfRows(rows,asOf);
      if(!knownRows.length){points.push({date:asOf,available:false,reason:'no-public-filing-yet'});continue;}
      const prices=(priceHistory||[]).filter(p=>new Date(p.date).getTime()<=new Date(asOf).getTime());
      const lastPrice=prices.length?Number(prices.at(-1).close??prices.at(-1).price):null;
      const out=jukaValuationEngine(stock,knownRows,lastPrice,{...options,asOfDate:asOf,pointInTime:true,model});
      if(!out?.valuation){points.push({date:asOf,available:false,reason:'valuation-unavailable'});continue;}
      const fullDerived=deriveFundamentals(rows),basis=jukaHistoricalShareBasis(fullDerived);
      const sourceRow=knownRows.at(-1),sourceIndex=fullDerived.findIndex(x=>String(x.date)===String(sourceRow?.date));
      const factor=sourceIndex>=0?(Number(basis.factors[sourceIndex])||1):1;
      points.push({date:asOf,available:true,price:Number.isFinite(lastPrice)?lastPrice:null,
        bear:Number(out.valuation.bear)/factor,base:Number(out.valuation.base)/factor,bull:Number(out.valuation.bull)/factor,
        shareBasisFactor:factor,shareBasisAdjusted:factor!==1,
        status:out.release?.status||null,liveReady:out.release?.liveReady===true,confidence:out.fairValue2?.confidence??null,
        sourceCutoff:knownRows.at(-1)?.accepted||knownRows.at(-1)?.filed||knownRows.at(-1)?.filedDate||knownRows.at(-1)?.publishedDate||knownRows.at(-1)?.availableFrom||null,
        model:out.model||model});
    }
    return {version:'JUKA Fair Value History 1.0',method:'point-in-time-filing-cutoff',model,marketPriceUsedForCalibration:false,points};
  }

  return {n,clamp,median,cagr,valuationPct,qualityScore,jukaQualityScore,jukaQualityScoreV2,jukaPerformanceWindows,jukaChartSlice,jukaInvestorFundamentals,dcfFairValue,scenarioValues,jukaDcf10Y,jukaDcfScenarios,jukaReverseDcf,jukaSensitivity,jukaDataQuality,jukaCompanyProfile,jukaAutoAssumptions,jukaOperatingRawAssumptions,jukaOperatingSelfCheck,jukaAdaptiveOperatingAssumptions,jukaFairValueConfidence,jukaFairValueDrivers,jukaAsOfRows,jukaPointInTimeFairValue,jukaMoatEvidencePolicy,jukaCompetitiveAdvantagePeriod,jukaEarningsPowerValue,jukaMultiMethodReleaseGate,jukaReleaseMatrixCase,jukaValidateReleaseMatrix,jukaModelStability,jukaForecastFeasibility,jukaReleaseGate,jukaExcessReturnValuation,jukaNormalizedInvestedCapital,jukaReinvestmentEfficiency,jukaWaccPolicy,jukaMatureTerminalPolicy,jukaFairValueAudit,jukaFairValueStability,jukaFairValuePlausibilityAudit,jukaRdPolicy,jukaRdCapitalization,jukaFundamentalForecastEngine,jukaEconomicDcf,jukaOwnerEarningsIntrinsicValue,jukaOwnerEarningsCrossCheck,jukaOwnerEarningsAudit,jukaHistoricalValuationAudit,jukaHistoricalIntegrityAudit,jukaFairValueTriangulation,jukaFairValue2Operating,jukaForecast5Y,jukaForecastScenarios,jukaExpectedReturnMatrix,jukaReturnBridge,jukaRelativeValuation,jukaBankInsurance,jukaReit,classifyValuationModel,deriveBankInsuranceMetrics,deriveReitMetrics,jukaBankAutoAssumptions,jukaReitAutoAssumptions,jukaValuationEngine,jukaRiskAudit,modelDataRequirements,jukaModelReadiness,jukaRelativeByModel,peerMetricSet,jukaPeerComparison,valuationMultiplesFromSnapshot,jukaRealityCheck,deriveFundamentals,qualityInputFromAnnual,dcfInputFromAnnual,jukaHistoricalShareBasis,buildHistoricalJukaFairSeries,buildHistoricalValuationSeries,filterPeriod,dataRoute,buildFairSeries};
});
