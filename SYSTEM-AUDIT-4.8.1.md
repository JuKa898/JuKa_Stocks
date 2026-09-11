# JUKA 4.8.1 — System Audit / Bugfix Report

## Scope
Kompletter statischer Audit von Core-Bewertung, Datenadaptern, historischen Zeitreihen, Missing-Data-Semantik, UI-Darstellung und Regressionen auf Basis von JUKA 4.8 / Fair Value 8.3.

## Behobene Fehler

### 1. Zentrale `n()`-Hilfsfunktion: `null` wurde zu 0
JavaScript `Number(null) === 0`. Die zentrale Helper-Funktion hat deshalb fehlende Werte in einzelnen Berechnungspfaden als echte wirtschaftliche Null behandelt. `null`, `undefined` und leere Strings verwenden jetzt explizit den angegebenen Fallback.

### 2. `inputNetDebt()` nahm bei unbekannter Equity-Bridge 0 an
Direkte Bewertungsaufrufe konnten ohne `netDebt`/`netFinancialPosition` implizit schuldenfrei rechnen. Die Funktion liefert bei unbekannter Nettofinanzposition jetzt `null`. Owner-Earnings-, Economic-DCF- und Earnings-Power-Pfade brechen dann sauber ab.

### 3. EU-Jahresdaten: unbekannte Verschuldung konnte 0 werden
Im Alpha-Vantage-Jahresadapter ergab das Fehlen von `shortLongTermDebtTotal`, `currentDebt` und `longTermDebt` rechnerisch 0. Jetzt gilt: nur wenn mindestens eine Debt-Komponente tatsächlich vorhanden ist, wird aus den Komponenten eine Summe gebildet; sonst bleibt Debt `null`.

### 4. Fundamental Forecast: fehlende Tax-/CapEx-/D&A-/NWC-Werte wurden in ökonomische Kennzahlen hineingerechnet
FCF/NOPAT-Conversion und beobachtete Reinvestment Rate verwenden jetzt nur vollständige Beobachtungen. Fehlende Werte werden nicht mehr via `Number(null)` zu 0 und beeinflussen keine Mediane.

### 5. Legacy Fair-Value-Historie hatte Look-ahead-Risiko
`buildFairSeries()` wählte Fundamentals nach Fiskalperiodenende. Damit konnten Daten historisch vor ihrer Veröffentlichung verfügbar erscheinen. Der Helper verwendet jetzt ausschließlich `accepted/filed/filedDate/publishedDate/availableFrom`. Ohne Veröffentlichungsdatum wird kein historischer Fair Value erzeugt.

### 6. Legacy Fair-Value-Historie: fehlendes FCF / Net Cash / Shares konnte zu Nullwerten werden
Der historische Legacy-Pfad verlangt jetzt valide FCF-, Net-Cash- und Aktienzahl-Daten statt fehlende Werte in den DCF zu geben.

### 7. UI: fehlende Finanzwerte konnten als `0,00` / `0 €` erscheinen
Mehrere Summary-/Fallback-Renderpfade haben vor der Formatierung `Number(null)` aufgerufen. Eine `uiNum()`-Normalisierung und gehärtete Formatter stellen fehlende Werte jetzt als `—` dar.

### 8. UI-Feldabdeckung konnte Missing Values als vorhanden zählen
`valuationDataBasis()` prüfte `Number.isFinite(Number(value))`; für `null` ist das wahr. Die Abdeckung verwendet jetzt die explizite Missing-Value-Semantik. Das betrifft direkt die Anzeige `Feldabdeckung xx%`.

## Neue Regressionen
- `n(null, fallback)` erhält Missing-Semantik.
- `inputNetDebt({}) === null`, echte Nettofinanzposition 0 bleibt erlaubt.
- Direkter Owner-Earnings- und Economic-DCF-Aufruf ohne Equity-Bridge liefert keinen Fair Value.
- Earnings Power meldet `net-debt-unavailable`.
- Historische Legacy-Serie verwendet Filing-Datum und verhindert Look-ahead.

## Validierung
- `npm test`: Fair-value regression tests **OK**
- `npm test`: System regression tests **OK**
- `node --check`: Core/API/Lib/Scripts **OK**
- extrahiertes Inline-JavaScript aus `index.html`: Syntax **OK**

## Bewusste Grenzen
Die Tests validieren Logik und Regressionen lokal. Externe Provider (SEC, Alpha Vantage, Twelve Data) können sich ändern und wurden ohne produktive API-Credentials nicht vollständig live end-to-end getestet. Ein Fair Value bleibt eine modellabhängige Schätzung; die Engine soll Unsicherheit sichtbar machen und nicht durch Missing-Data-Fallbacks verdecken.
