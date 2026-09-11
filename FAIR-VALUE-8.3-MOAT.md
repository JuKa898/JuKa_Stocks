# JUKA Fair Value 8.3 — Moat / Compounder Fix

## Ziel
Der intrinsische Wert bleibt vollständig kursunabhängig, bildet aber langlebige, asset-light Compounder realistischer ab. Die Änderung ist **keine Apple-Kalibrierung**: der Aktienkurs wird weder als Input noch als Zielwert verwendet.

## Änderungen

1. **Company-specific Competitive Advantage Period (CAP)**
   - Die primäre Buffett-Owner-Earnings-Bewertung nutzt jetzt dieselbe quantitative Moat-Policy wie der Economic DCF.
   - Maximaler expliziter Zeitraum von 9 auf 15 Jahre erweitert.
   - Lange CAP nur bei belegter Kombination aus Excess ROIC, Stabilität, Wachstum/Margenstabilität und Datenqualität.

2. **Terminal ROIC mit evidenzbasierter Moat-Fade**
   - Der alte pauschale Deckel von ungefähr WACC + 2,5–4,0 Prozentpunkten wurde ersetzt.
   - Sehr persistente hohe Kapitalrenditen können im Mature State einen größeren Premium-ROIC behalten (bis zu +8 Prozentpunkte bei sehr starker Evidenz).
   - Aktueller außergewöhnlicher ROIC wird trotzdem nicht unverändert perpetuiert; schwache Unternehmen dürfen weiterhin unter WACC enden.

3. **Asset-light Reinvestment**
   - Bei niedriger historischer CapEx-Intensität (<6% Umsatz), ROIC >20% und stabiler Kapitalrendite darf die marginale Kapitalrendite bis 75% statt pauschal 45% reichen.
   - Dadurch wird Wachstum bei Unternehmen mit wenig tangiblem Reinvestment nicht künstlich zu teuer modelliert.
   - Wachstum bleibt kostenpflichtig; die Reinvestment-Deduktion bleibt bestehen.

4. **Keine Kurskalibrierung / Buyback-Zirkelschlüsse**
   - Marktpreis bleibt aus Intrinsic Value, Moat-Länge, Terminal ROIC und Reinvestment vollständig ausgeschlossen.
   - Zukünftige Buybacks werden nicht über einen angenommenen Rückkaufkurs in den Fair Value hineingerechnet, weil dies zirkulär wäre.

## Neue Regressionen
- Durable high-return compounder kann >9 Jahre CAP erhalten.
- Persistente hohe ROIC-Evidenz erlaubt einen materiellen Mature-ROIC-Premium.
- Terminal ROIC bleibt unter dem außergewöhnlichen aktuellen ROIC und fadet weiterhin.
- Bestehende Net-Debt-, Missing-Data-, Sensitivitäts- und Systemtests bleiben grün.

## Interpretation
Ein höherer Fair Value für Apple-artige Unternehmen ist nur dann Ergebnis des Modells, wenn die Fundamentaldaten die lange Wettbewerbsvorteilsdauer und Kapital-Effizienz tatsächlich tragen. Der historische Aktienkurs wird nicht benutzt, um das Ergebnis nach oben zu ziehen.
