# JuKa Stocks Universe Coverage — MVP 2.0

Gesamt: **47** Titel · US: **17** · EU: **30**

Modelle: Operating Company **40** · Bank/Insurance **5** · REIT **2**

Provider-Symbol-Mapping: **47/47** syntaktisch gemappt. Das ist ein Routing-/Formatcheck, kein Live-Verfügbarkeitstest beim externen Provider.

## Bewertungslogik

- Operating Company: 10J-FCFF-DCF; benötigt Umsatz, EBIT, D&A, CapEx und Aktienzahl.
- Bank/Insurance: Residual Income / justified P/B; benötigt Eigenkapital, Aktienzahl und Nettogewinn.
- REIT: AFFO + Exit-Multiple; benötigt AFFO und Aktienzahl. SEC/Alpha-Vantage liefern AFFO nicht standardisiert, daher bleibt ein REIT ohne AFFO bewusst nicht bewertungsbereit.
