# JuKa Stocks Motor 3.0

Private Research Prototype. Fokus dieser Version: Motor vor Optik.

## Neu in 1.0
- Fundamentaldaten-Engine für mehrjährige GuV-, Bilanz- und Cashflow-Reihen
- Ableitung von EBIT-/FCF-Margen, Umsatz-/FCF-CAGR, FCF Conversion, Net Debt/EBITDA, Interest Coverage, Verwässerung und ROIC
- Excel-paritätischer JuKa Quality Score kann aus Live-Fundamentaldaten gespeist werden, sobald genügend Felder vorhanden sind
- Historische 10J-FCFF-Fair-Values nutzen das SEC-Filing-Datum (`filed`) statt nur das Geschäftsjahresende: kein Look-ahead bias
- Automatischer Fallback auf vereinfachtes FCF-Modell, wenn für den 10J-DCF Kernfelder fehlen
- SEC-Adapter erweitert um D&A, SBC, Zinsaufwand, Vorsteuergewinn, Steuern, Eigenkapital und operatives NWC
- Audit-Tabelle zeigt bis zu sechs Geschäftsjahre und Datenabdeckung
- US/EU Routing bleibt erhalten; EU-Fundamentals-Adapter folgt später

## Referenz
META bleibt die Regression-Baseline gegen `Aktienanalyse_1.0_JuKa_Meta.xlsx`:
- Bear FV 400.1574408699634
- Base FV 654.4325829130363
- Bull FV 1011.5660866959147
- Quality Score 73

## Tests
`npm test` führt Core-, Routing-, Fundamentals-, API-, SEC- und Excel-Paritätstests aus.


## Motor 3.0
Reverse DCF für Operating Companies sowie WACC/Terminal-Growth-Sensitivitätsmatrix ergänzt. Reverse DCF löst marktimplizite Wachstum-, EBIT-Margen- und WACC-Annahmen numerisch gegen den aktuellen Kurs.


## Motor 3.0
Multi-Engine-Realitätscheck: Fair Value, Quality Score, relative Bewertung und Reverse DCF werden zu einem erklärbaren Gesamtbild zusammengeführt. Keine Anlageempfehlung; fehlende Daten senken explizit die Datenbasis.


## Motor 3.0
5-Jahres-Forecast für Umsatz, EBIT-Marge, EPS und FCF. Dazu Forward-KGV, PEG und Renditebrücke. Historische Trends werden begrenzt und bis Jahr 5 normalisiert.


## Motor 3.0
Bear/Base/Bull-Forecasts für Operating Companies plus 3×3-Renditematrix. Szenarien variieren Wachstum, Zielmargen, Verwässerung und Exit-KGV. Die Engine liefert dadurch Bandbreiten statt eines einzelnen Erwartungswerts.


## Motor 3.0
Datenqualitäts-Score, Unternehmensprofil und Auto-Annahmen ergänzt. Forecasts reagieren nun auf Zyklik, Wachstum, Margenstabilität, Kapitalintensität, Verwässerung/Buybacks und Net-Cash-Situation. Niedrige Datenqualität wird explizit als geringeres Forecast-Vertrauen ausgewiesen.


## Motor 3.0
Live-Daten-Härtung: zentrale Symbolauflösung, SEC-Klassenmapping (z. B. BRK.B → BRK-B), Europa-Market-Symbolrouting, Market-only-Fallback bei fehlenden Fundamentaldaten, Provider-Provenienz/As-of-Status und robuste HTTP-Fehlercodes. Die Live-UI rendert nun auch Auto-Annahmen, Forecasts und Renditematrix aus dem Pipeline-Snapshot.


## Motor 3.0
Erster EU-Fundamentals-Adapter über Alpha Vantage. Xetra/London/Paris/Amsterdam/Kopenhagen/SIX werden auf Provider-Symbole gemappt. Pro EU-Aktie werden GuV, Bilanz und Cashflow geladen, normalisiert und 24h gecacht. Ohne `ALPHA_VANTAGE_API_KEY` bleibt JuKa im Market-only-Modus. Der Analyse-Cache lebt nun auf Modulebene. `npm test` führt automatisch alle `*.test.js`-Dateien aus.


## Motor 3.0 — Integrations- und Härtungsrunde
Die Bewertungsmodelle haben jetzt eigene Datenanforderungen und einen expliziten `modelReadiness`-Status. Operating Companies benötigen für den 10J-FCFF-DCF Umsatz, EBIT, D&A, CapEx und Aktienzahl. Banken/Versicherungen werden nur mit Eigenkapital, Aktienzahl und Nettogewinn in das Residual-Income/PB-Modell geschickt. REITs benötigen AFFO und Aktienzahl; ohne AFFO erfolgt bewusst keine Ersatz-DCF-Bewertung. Der normale JuKa Quality Score und historische FCFF-Fair-Values werden nur noch auf Operating Companies angewendet.

`scripts/coverage-report.js` auditiert das tatsächliche Suchuniversum aus `index.html` hinsichtlich Region, Modell und Provider-Symbolrouting. Die Reports liegen unter `reports/`.


## Motor 3.0 — Engine Completion
`jukaValuationEngine()` ist jetzt der zentrale Bewertungs-Orchestrator für Operating Companies, Banken/Versicherungen und REITs. Reverse DCF verwendet Excel-paritätisch einen Wachstums-Adjuster, der gleichzeitig auf Jahr 1 und Jahr 5 wirkt und deren Spreizung erhält. Banken verwenden normalisierte ROE/BVPS-Annahmen; REITs werden nur mit explizitem AFFO bewertet. `jukaRiskAudit()` fasst Daten-, Bewertungs- und Implied-Assumption-Risiken zusammen. Die Pipeline liefert Readiness, Valuation Status, Engine-Annahmen, Risiko-Audit, Datenqualität, Forecasts und Szenarien in einem Snapshot.


## Product 3.1
Lokale Watchlist und gespeicherte Analyse-Snapshots via LocalStorage. Keine Accounts nötig; Motor unverändert.


## Product 3.2
Die Oberfläche hat jetzt eine Investment Summary mit Fair Value, Bewertungsabstand, Quality Score, 5J-Base-Rendite, Risiko-Audit und Bewertungsmodell. Eine Sticky-Navigation springt direkt zu Bewertung, Qualität, Fundamentals, Geschäftsmodell und Audit. Technische Motor- und Datenblöcke sind standardmäßig eingeklappt; Forecast und Szenarien bleiben sichtbar.


## Product 3.3 Live Beta
Controlled live validation build. Shows provider/status/date/coverage/warnings for the existing /api/analysis pipeline. Secrets remain server-side. Also fixes the Product 3.1 watchlist/saved-analysis navigation handler.
