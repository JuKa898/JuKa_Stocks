# JUKA 4.7 / Fair Value 8.2 — Systemweiter Bugfix-Audit

## Ergebnis

Systemweiter Audit von Bewertungslogik, Daten-Normalisierung, SEC-/EU-Fundamentaldaten, Zeitreihen, Multiples, R&D-Anpassung und Regressionstests.

Build-Version: `10.6.2`

## Behobene Fehler

### 1. Fehlende Verschuldung wurde in Datenadaptern zu 0
**Betroffen:** `api/sec.js`, `api/analysis.js`, `lib/eu-fundamentals.js`

Wenn weder Current Debt noch Long-Term Debt geliefert wurde, entstand teilweise `0`. Das ist ökonomisch nicht dasselbe wie „keine Schulden“.

**Fix:** Debt bleibt `null`, wenn keine belastbare Debt-Information vorhanden ist. Teilkomponenten werden nur summiert, wenn mindestens eine Debt-Komponente tatsächlich gemeldet wurde. `netCash` wird nur berechnet, wenn Cash und Debt bekannt sind.

### 2. Alpha-Vantage-Normalisierung machte `null` und leere Strings zu 0
**Betroffen:** `lib/eu-fundamentals.js`

`Number(null)` und `Number('')` ergeben in JavaScript `0`. Dadurch konnten fehlende EU-Fundamentaldaten als echte Nullwerte in die Analyse gelangen.

**Fix:** Null-/Undefined-/Leerwerte werden vor der numerischen Konvertierung explizit abgefangen.

### 3. Equity-Fair-Value ohne bekannte Cash-/Debt-Bridge
**Betroffen:** `core.js`

Ein intrinsischer Enterprise Value konnte bei fehlenden Cash-/Debt-Daten trotzdem in einen Equity Value umgerechnet werden, indem die unbekannte Nettofinanzposition effektiv als 0 behandelt wurde.

**Fix:** Für operative Unternehmen gehören `cash` und `debt` jetzt zu den Pflichtdaten der Bewertungsbereitschaft. `dcfInputFromAnnual()` und der primäre Buffett-Owner-Earnings-Wert brechen bei unbekannter Equity-Bridge ab, statt einen scheinpräzisen Fair Value auszugeben.

### 4. Fehlende historische Kennzahlen gingen als echte Null in Median-/Trendberechnungen ein
**Betroffen:** `core.js`

Mehrere Historienfunktionen verwendeten `Number(null)`, wodurch z. B. fehlende EBIT-Margen, FCF-Margen oder ROIC-Werte als 0 in Medianen und Profilen landen konnten.

**Fix:** `finiteNumber()` wird konsistent für historische Kennzahlen, CAGR-Auswahl und Medianberechnungen verwendet. Fehlende Werte werden ausgeschlossen statt als 0 interpretiert.

### 5. Invested Capital konnte aus fehlendem Equity/Debt konstruiert werden
**Betroffen:** `jukaNormalizedInvestedCapital()`

`Number(null) === 0` konnte fehlendes Eigenkapital bzw. Debt als echte Null erscheinen lassen.

**Fix:** Invested Capital ist bei fehlendem Equity oder Debt nicht verfügbar. Cash, Lease Debt, Goodwill und R&D Asset behalten saubere Missing-Data-Semantik.

### 6. R&D-Kapitalisierung konnte fehlendes Equity/Operating Income künstlich erzeugen
**Betroffen:** `jukaRdCapitalization()`, R&D-adjusted Fair-Value-Pipeline

Fehlende Werte konnten durch JavaScript-Coercion als 0 behandelt und anschließend um das R&D Asset bzw. die Amortisierung verändert werden.

**Fix:** R&D-Anpassungen werden nur auf tatsächlich vorhandene Zahlen angewendet; ansonsten bleibt der Wert `null` bzw. fällt sauber auf den nicht adjustierten Wert zurück.

### 7. EV/EBIT wurde trotz unbekannter Cash-/Debt-Daten ausgewiesen
**Betroffen:** `valuationMultiplesFromSnapshot()`

Enterprise Value wurde bei fehlenden Bilanzdaten mit Cash=0 / Debt=0 angenähert.

**Fix:** EV-basierte Multiples bleiben `null`, solange Cash und Debt nicht bekannt sind. P/E und andere davon unabhängige Multiples bleiben verfügbar.

### 8. Fehlender Cash-Conversion-Wert wurde als 0 interpretiert
**Betroffen:** `jukaFairValue2Operating()`

Ein nicht verfügbarer Cash-Conversion-Check konnte als `0` erscheinen und dadurch fälschlich eine Confidence-Strafe auslösen.

**Fix:** Nicht verfügbare Cash Conversion erhält explizit den Status `unavailable` und beeinflusst den Confidence Score nicht als künstliche Null.

### 9. Cross-Check-Werte `null` wurden als 0 in der Triangulation dargestellt
**Betroffen:** `jukaFairValueTriangulation()`

Nicht verfügbare Economic-DCF-/Earnings-Power-/Legacy-Werte konnten im Diagnoseobjekt als 0 erscheinen.

**Fix:** Fehlende Cross-Checks bleiben `null`. Dadurch ist klar erkennbar, ob ein Modell 0 bewertet oder gar nicht verfügbar ist.

### 10. Plausibilitätsaudit konnte aus fehlenden Annahmen Warnungen erzeugen
**Betroffen:** `jukaFairValuePlausibilityAudit()`

Fehlende WACC-/Terminal-Growth-Werte wurden über `Number(null)` zu 0 und konnten z. B. einen falschen Terminal-Spread-Alarm erzeugen.

**Fix:** Plausibilitätschecks laufen nur, wenn die benötigten Werte tatsächlich vorhanden sind.

### 11. Performance-Zeiträume waren bei zu kurzer Historie irreführend
**Betroffen:** `jukaPerformanceWindows()`

Bei nur wenigen Monaten Kursdaten konnte die erste verfügbare Kurszeile als Basis für „1J“ oder „3J“ verwendet werden.

**Fix:** Ist die Historie nicht lang genug, bleibt die jeweilige Performance `null` statt einen falschen Zeitraum zu etikettieren.

### 12. `filterPeriod()` verwendete Zeilenanzahl statt echte Zeiträume
**Betroffen:** `core.js`

Die alte Funktion behandelte z. B. 12 Datenzeilen implizit wie 12 Monate. Bei Tages-/Wochenkursen war das falsch.

**Fix:** 1J/3J/5J werden jetzt anhand realer Datumsgrenzen gefiltert.

### 13. Point-in-Time-Preisreihe setzte sortierte Eingabe voraus
**Betroffen:** `jukaPointInTimeFairValue()`

Der letzte Preis vor dem Stichtag konnte falsch sein, wenn `priceHistory` unsortiert übergeben wurde.

**Fix:** Preisreihen werden vor der Stichtagsauswahl chronologisch sortiert.

### 14. Leverage-Risiko konnte bei fehlendem Debt als 0× erscheinen
**Betroffen:** automatische WACC-Annahmen

Fehlendes Debt wurde indirekt wie Debt=0 behandelt.

**Fix:** Leverage bleibt bei fehlender Bilanzinformation `null`; es wird dann kein erfundener Leverage-Zuschlag oder -Entlastung angewendet.

## Bewertungsphilosophie nach dem Fix

Für einen belastbaren Buffett-orientierten Equity Fair Value gilt jetzt konsequent:

`Operating Economics -> Owner Earnings -> Reinvestment -> Discounting -> Enterprise Value -> bekannte Net-Debt-Bridge -> Equity Value`

Ist die Equity-Bridge unbekannt, wird kein scheinbar exakter Equity-Fair-Value freigegeben.

## Tests

`npm test` führt nun zwei Regression-Suites aus:

- `scripts/regression-fair-value.mjs`
- `scripts/regression-system.mjs`

Abgedeckt werden unter anderem:

- Net-Debt-/Cash-Bridge
- Null-/Missing-Data-Semantik
- Invested Capital
- Multiples bei fehlenden Bilanzdaten
- Performance-Zeiträume
- Datum-basierte Chartfilter
- Cross-Check-Triangulation
- Plausibilitätsaudit
- bestehende Fair-Value-Regressionen

Ergebnis: **alle Regressionstests erfolgreich**. Zusätzlich bestehen alle JavaScript-Dateien den Node-Syntaxcheck.

## Bewusste Einschränkung

Der Audit prüft Codepfade und Regressionen lokal. Externe Live-Provider (SEC, Twelve Data, Alpha Vantage) wurden in diesem Durchlauf nicht mit produktiven API-Schlüsseln end-to-end validiert. Provider-Schemaänderungen sollten deshalb zusätzlich über einen Deployment-Smoke-Test überwacht werden.
