# JuKa Stocks — Live Deploy Clean 3.3.2

Minimal Vercel deployment package for the JuKa Stocks live beta.

## Required repository structure

```text
index.html
core.js
package.json
vercel.json
README.md
api/
  health.js
  analysis.js
  market.js
  sec.js
  eu-fundamentals.js
lib/
  pipeline.js
  symbols.js
  eu-fundamentals.js
```

## Required Vercel Production environment variables

- `TWELVE_DATA_API_KEY`
- `ALPHA_VANTAGE_API_KEY`
- `SEC_USER_AGENT`

`/api/health` reports only whether those variables exist; it never returns their values.

## Live validation order

1. `/api/health`
2. `/api/market?symbol=META&region=US`
3. `/api/sec?symbol=META&region=US`
4. `/api/analysis?symbol=META&region=US&currency=USD&market_symbol=META&name=Meta%20Platforms&model=operating`
5. `/` frontend

Provider requests have a 12-second timeout so a failed provider does not leave the UI loading indefinitely.
