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
- `/api/analysis` exposes `release`, `stability`, `valuationMethods` and Fair Value 8.0 metadata.
- `fundamentals.asOf` uses publication/availability metadata only.
- Server + browser cache keys are listing-aware.
- EU daily market data stays on Alpha Vantage `outputsize=compact`; long history uses weekly data.
- Market price must not alter Bear/Base/Bull with unchanged fundamentals.
- `prüfen` / `nicht belastbar` must never be `liveReady: true`.
- Before promotion: test operating company + bank + REIT + at least four EU listings.

## Historical FV / EU / Visa fix 13.3
- Historical Fair Value must not accrete mechanically at WACC between filings.
- Historical per-share values must be normalized to the same split-adjusted share basis as chart prices.
- Large near-standard share-count jumps are treated as display-only split normalization, not valuation inputs.
- Operating companies require revenue + EBIT + shares; missing D&A/capex uses a neutral maintenance replacement proxy and forces review.
- EU cold full analysis uses one weekly market request + three statement requests; EARNINGS is history-only.
- Browser cache namespace is `juka-live-v8`.

## Universe hardening 13.4
- Bear <= Base <= Bull is mandatory.
- Scenario width >2.5x triggers review; >4x blocks release.
- Historical filing-to-filing Fair Value jumps >2.5x trigger review; >4x fail integrity.
- Every curated stock must execute a model-appropriate valuation fixture, not only route structurally.
- Missing optional data may use transparent proxies only with `liveReady=false`.

## Intrinsic Value Engine 8.0
- Operating-company Base value is normalized Owner Earnings intrinsic value.
- Market price is forbidden from valuation inputs; it is comparison/control only.
- Growth is derived from company history and capped by reinvestment economics.
- Growth requires reinvestment; no free growth.
- Terminal growth requires terminal reinvestment.
- Cash/debt bridge and diluted shares convert enterprise value to per-share value.
- Old Economic DCF / Earnings Power remain diagnostics, not averaging inputs.

## System hardening 14.1
- Browser performs one `/api/analysis` request per stock load.
- Market and fundamentals adapters execute in parallel.
- Provider timeouts are bounded individually and return identifiable error codes.
- No duplicated frontend retry amplification.
- Cached detail snapshot is the only browser fallback.
- Health, engine, UI and package versions agree on Fair Value 8.0 / engine 10.0.1.

## Product tools & screener 14.3
- Fair Value chart offers exactly 1J / 3J / 5J / Max.
- Tools menu has hover/focus dropdown and direct entries.
- Each calculator includes purpose, input guidance, formula, result details, and interpretation.
- Aktien Screener filters by sector, country, valuation model, market cap, P/E, Quality Score, ROIC, revenue growth, Fair Value discount, and data status.
- Screener does not fabricate missing current metrics; it reuses cached analyses and loads at most 5 matching companies per batch.
- Remaining Quality Score UI uses the 1–10 public scale consistently.

## Final hardening 14.4
- Screener market-cap normalization and EPS fallback.
- Legacy Quality cache normalization.
- Tools menu interaction hardened.
- Fair Value 5Y internally supported.
- Calculator input validation.
- EU screener API throttling.
- SEC class-share dot/hyphen fallback.
- Alpha symbol search equity preference.
- Partial snapshot on market-provider outage.

## TTM-first 14.6
- US operating fundamentals: SEC 10-K + current 10-Q YTD − prior-year comparable YTD.
- Current balance-sheet values use latest filed quarter/annual instant facts.
- Current shares prefer latest shares outstanding; diluted weighted-average fallback.
- EU keeps Alpha Vantage quarterly/TTM path from 14.5.
- Annual statements remain history/fallback, not the preferred current operating basis.
- TTM metadata survives pipeline normalization and is visible in Fair Value data-basis diagnostics.

## System hardening 14.7
- Quality scale bugs fixed across fallback, verdict, reality check and UI.
- CAGR is date-aware; TTM does not compress multi-year growth windows.
- TTM-to-FY is not mislabeled as YoY growth.
- Pipeline preserves R&D, net cash and NWC.
- Fundamentals-only snapshots survive temporary market-data outages.
- EU TTM no longer turns missing fields into zero.
- EU TTM balance sheet is aligned to the TTM quarter.
- /api/market gets provider-native EU symbol fallback.
- /api/analysis reports the actually used Alpha symbol.
- /api/sec delegates EU to the real EU fundamentals adapter.
- Legacy historical helper no longer uses fiscal dates as publication dates.

## Fair Value Integrity 14.8
- Historical share-basis normalization does not infer reverse splits from noisy SEC share-tag changes.
- TTM rows are excluded from split inference.
- Operating assumptions separate FY history from current TTM.
- Walk-forward self-check excludes TTM.
- Owner Earnings normalization does not double-count overlapping TTM as another full year.
- Owner Earnings CAGR uses elapsed time.
- Cash-conversion diagnostic reduces confidence on large accounting-vs-cash divergence.
- Risk Audit Quality thresholds aligned to 1–10.
- UI separates data completeness from Fair Value robustness.
