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
