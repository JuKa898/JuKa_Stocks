# JuKa Stocks MVP 0.5

Private Research Web-App, deploybar auf Vercel Free.

## Was neu ist
- Serverless Market-Data-Proxy (`/api/market`) für Twelve Data, API-Key bleibt serverseitig.
- SEC-Proxy (`/api/sec`) für US-Fundamentaldaten; SEC unterstützt selbst kein Browser-CORS.
- Ausgelagerte Bewertungsengine (`core.js`) mit DCF, Bear/Base/Bull, Quality Score und Historienlogik.
- Statisches Dashboard bleibt ohne API-Key als Demo nutzbar; nach Deployment können echte Daten aktiviert werden.

## Kostenlose Einrichtung
1. Kostenloses GitHub-Repository anlegen und diese Dateien hochladen.
2. Repo in Vercel importieren.
3. Environment Variable `TWELVE_DATA_API_KEY` setzen (kostenloser persönlicher Twelve-Data-Key).
4. Optional `SEC_USER_AGENT` setzen, z. B. `JuKa Stocks yourmail@example.com`.
5. Deployen. Vercel stellt automatisch eine kostenlose `*.vercel.app`-Adresse bereit.

## Tests
`npm test`

## Hinweise
- Twelve Data Basic ist für persönliche/interne Nutzung gedacht und hat 800 Credits pro Tag.
- EU-Abdeckung im kostenlosen Basic-Tarif ist eingeschränkt. Die Datenadapter sind deshalb getrennt gebaut.
- SEC Fundamentals funktionieren nur für SEC-registrierte Emittenten; viele EU-Unternehmen sind nicht oder anders abgedeckt.
- Das generische DCF in v0.5 ist bewusst transparent und noch nicht 1:1 das komplette Excel-Modell. Die Übertragung des vollständigen Excel-Modells ist der nächste Schritt.
