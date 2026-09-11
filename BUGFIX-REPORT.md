# JuKa Code Review & Fair-Value Bugfix Report

## Scope
Review of the uploaded JuKa finance database/codebase with emphasis on valuation integrity, missing-data semantics, equity bridges and Fair Value stability checks.

## Fixed bugs

### 1. Net debt was silently ignored in key valuation paths
`dcfInputFromAnnual()` exposed the balance-sheet bridge as `netFinancialPosition`, while newer valuation functions read `input.netDebt`. In addition, checks such as `Number(null)` evaluated to `0`, preventing the intended fallback to `debt - cash`.

**Impact:** Owner Earnings / Economic DCF / Earnings Power / Excess Return cross-checks could value enterprise cash flows as if the company had no net debt. For a company with 10 bn net debt and 1 bn shares, that alone overstates equity value by 10 per share.

**Fix:** Added a null-safe `inputNetDebt()` resolver, added `netDebt` as the canonical DCF-input field while retaining `netFinancialPosition` as a backward-compatible alias, and made the primary Owner-Earnings equity bridge null-safe.

### 2. Missing fundamental fields could become real zeroes inside derived metrics
JavaScript's `Number(null) === 0` affected derived metrics. Missing D&A could make EBITDA equal EBIT; missing SBC could become 0% SBC/revenue; missing debt/cash could create artificial net debt/net cash values.

**Impact:** Quality scores, capital efficiency metrics and downstream valuation assumptions could look better or more complete than the source data justified.

**Fix:** Added `finiteNumber()` and used it in the critical derivation path so missing values remain missing instead of turning into economic zeroes.

### 3. Cash-conversion check penalized missing CFO as if CFO were zero
The primary Owner-Earnings model converted missing CFO to zero before calculating its independent cash-conversion cross-check.

**Impact:** A missing cash-flow field could create a false 0x cash-conversion ratio and reduce Fair Value confidence even though there was no negative evidence.

**Fix:** Cash conversion now remains `null` when CFO is unavailable.

### 4. Stability audit used a different model than the displayed Base Fair Value
The displayed Base Fair Value is produced by `jukaSimpleIntrinsicOperating()` (normalized Owner Earnings). The previous audit accepted that Base value, but generated stressed values with `jukaOwnerEarningsIntrinsicValue()` — a materially different model.

**Impact:** Reported WACC/growth sensitivity could measure model disagreement rather than sensitivity of the actual displayed Fair Value. Release gating could therefore be too strict or too lenient for the wrong reason.

**Fix:** Added `jukaSimpleIntrinsicAudit()`. Base and sensitivity runs now use the same primary model. An isolated Owner-Earnings growth adjustment is used for growth sensitivity without mixing valuation engines.

## Regression coverage added
`npm test` now runs `scripts/regression-fair-value.mjs` and verifies:

- missing D&A/SBC stay missing;
- net debt is debt minus cash;
- DCF input exposes both canonical `netDebt` and the legacy alias;
- Economic DCF deducts net debt in the equity bridge;
- primary Owner-Earnings Fair Value deducts net debt;
- missing CFO does not create a fake zero cash-conversion ratio;
- the stability audit reruns the same primary valuation method.

All JavaScript files also pass syntax checks after the patch.

## Fair Value: recommended next optimizations

### A. Replace the WACC proxy with a transparent two-layer policy
Current WACC is mainly a fundamental-risk proxy (starting around 8.25%, then adjusted for volatility/leverage). This is useful as a fallback, but it is not a true market cost of capital.

Recommended architecture:
1. **Market WACC when data quality is sufficient:** risk-free rate + beta × equity risk premium, after-tax debt cost, market-value capital structure.
2. **Fundamental fallback WACC:** current policy, clearly labeled as proxy.
3. Store `waccSource`, `riskFreeRate`, `erp`, `beta`, `costOfDebt`, `debtWeight`, and timestamp in the result.

This makes the most valuation-sensitive assumption auditable rather than opaque.

### B. Do not force terminal ROIC to be at least WACC for every company
`jukaMatureTerminalPolicy()` currently prevents terminal ROIC from falling below WACC. That is defensible for a healthy going concern with durable economics, but it can overvalue structurally weak or value-destructive businesses.

Recommended policy:
- strong/stable moat: terminal ROIC may remain moderately above WACC;
- average company: fade toward WACC;
- weak/declining economics: permit terminal ROIC below WACC for a transition period or use a conservative steady-state floor tied to asset economics.

The terminal ROIC should be evidence-driven, not guaranteed to create non-negative excess returns.

### C. Separate “valuation” from “confidence/release” even more strictly
The code already does this better than many valuation tools, but the distinction should be explicit in the API/UI:
- `fairValue`: pure economic estimate;
- `confidence`: quality of evidence;
- `releaseStatus`: whether the estimate is safe enough to present as decision-grade;
- `warnings`: why confidence is reduced.

Never change WACC or Fair Value merely because data quality is poor; reduce confidence instead. The existing comments already point in this direction and should remain the design rule.

### D. Add point-in-time regression fixtures for real companies
The existing point-in-time logic is good. The next major reliability improvement is a fixture suite with known historical filings for several business types:
- net-cash software/platform;
- highly levered industrial;
- capital-intensive company;
- cyclical company;
- negative/volatile FCF company;
- R&D-heavy company;
- bank/insurer;
- REIT.

For every fixture, assert the exact filing cutoff, share basis, net-debt bridge, Fair Value range, terminal share, and release gate. This is more valuable than adding more valuation formulas.

### E. Add explicit units and sign conventions at adapter boundaries
Financial APIs differ on CapEx signs, debt composition, lease liabilities, cash definitions and share units. Normalize these once at ingestion and attach metadata such as `unit`, `scale`, `signConvention`, and `sourceTag`.

This prevents a mathematically correct DCF from being fed economically inconsistent numbers.

## Files changed
- `core.js`
- `package.json`
- `scripts/regression-fair-value.mjs` (new)
- `BUGFIX-REPORT.md` (new)

## Validation performed
- `npm test` -> passed
- syntax check for `core.js`, all `lib/*.js`, `api/*.js`, and `scripts/*.mjs` -> passed
- synthetic full valuation-engine smoke test -> completed without runtime errors and confirmed that the primary and Economic DCF equity bridges deduct net debt.

---

## Systemweiter Follow-up Audit — v10.6.2

Weitere systemweite Korrekturen an Missing-Data-Semantik, Cash/Debt-Bridge, Invested Capital, R&D-Anpassung, Multiples und Zeitreihen sind in `SYSTEM-BUGFIX-REPORT.md` dokumentiert. Operative Equity-Fair-Values werden nun nicht mehr freigegeben, wenn Cash oder Debt unbekannt sind.
