# JUKA Production Release Checklist

1. `/api/health` returns HTTP 200 and all three provider readiness flags are true.
2. Run `node scripts/smoke-live.mjs <preview-url>`.
3. Smoke test must pass META (operating), JPM (bank/insurance), and O (REIT).
4. A `review/prüfen` or `hold/nicht belastbar` result must never have `liveReady: true`.
5. Verify an EU market symbol through `/api/market` separately because EU prices use Alpha Vantage.
6. Perform browser E2E on search, company page, performance chart, Fair Value chart, Fundamentals and Methodology.
7. Promote preview only after all checks pass.
8. If production smoke test fails, roll back to the previous production deployment.


## EU acceptance (12.0)
- SAP:XETR -> SAP.DEX
- ENR:XETR -> ENR.DEX
- MBG:XETR -> MBG.DEX
- ASML:AMS -> ASML.AMS
- NOVO-B:CPH -> NOVO-B.CPH
- Full /api/analysis must use Alpha Vantage for EU market data, not Twelve Data.
- EU historical Fair Value may only use annual rows with a mapped reportedDate; never fiscalDateEnding as publication date.

## EU free-key fix 12.1
- Daily Alpha Vantage uses `outputsize=compact`; `full` is premium.
- Long EU history uses `TIME_SERIES_WEEKLY` and is merged with recent daily data.
- EU browser path calls `/api/analysis` once per stock instead of summary + detail + history.
- EU response cache is 24h with 7d stale window.
- Header shows provider/source rather than generic LIVE.

## Final system hardening 13.2 / engine 9.2.0
- `/api/analysis` exposes `release`, `stability`, `valuationMethods` and Fair Value 7.0 metadata.
- `fundamentals.asOf` uses publication/availability metadata only.
- Server + browser cache keys are listing-aware.
- EU daily market data stays on Alpha Vantage `outputsize=compact`; long history uses weekly data.
- Market price must not alter Bear/Base/Bull with unchanged fundamentals.
- `prüfen` / `nicht belastbar` must never be `liveReady: true`.
- Before promotion: test operating company + bank + REIT + at least four EU listings.
