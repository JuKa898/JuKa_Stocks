# JuKa Stocks — Live Deploy SEC Period Fix 3.3.4

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

## 3.3.4 SEC fix
SEC facts are now keyed by fiscal period end date, not by the filing's `fy` label. This prevents prior-year comparative facts repeated in newer 10-Ks from being mislabeled as newer fiscal years.

## 3.3.4 SEC annual-series fix
Filters quarterly/YTD duration facts out of annual series, prefers the earliest filing for a period across tag changes, and derives `fy` from the actual fiscal period end date.

## 3.3.5 Live Integrity
- `/api/analysis` uses the same corrected SEC fiscal-period logic as `/api/sec`.
- Quarterly/YTD facts cannot leak into the annual analysis series.
- Missing numeric values remain null instead of silently becoming zero.
- Net-cash companies with no meaningful reported interest expense are not punished as `0x` interest coverage.
- `/api/analysis?...&summary=1` returns a compact live validation response.

## 3.3.6 Frontend Boot Fix
Root cause: the legacy META demo initializer referenced undefined variables and threw before the initial live `select('META')`.
The live request therefore never started even though `/api/analysis` itself worked.
3.3.6 fixes those references, isolates optional demo initialization, improves API parse errors, shows frontend boot errors,
and keeps the initial live load as the final startup action.
