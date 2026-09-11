# JUKA Fair Value 8.2 — Buffett / Eulerpool-inspired hardening

## Primary valuation
The primary fair value remains an intrinsic value, not a market-price fit. It normalizes owner earnings, deducts maintenance investment and working-capital needs, charges growth for the incremental capital it requires, discounts distributable owner earnings, and deducts net debt from enterprise value.

## Changes in 8.2
- Maintenance capex is less optimistically capped: up to 1.35x D&A when supported by reported capex, rather than 1.15x.
- Mature terminal ROIC is no longer forced to be at least WACC. A weak mature business may earn below its cost of capital; the only floor is the level required to make perpetual-growth reinvestment mathematically coherent.
- Exceptional ROIC is faded/capped in perpetuity. A durable business can retain a modest terminal excess return, but today's moat is not assumed to last unchanged forever.
- A confidence-linked Buffett-style margin of safety is produced (normally 20–30%, widened for terminal-value dependence or model disagreement), together with a `buyBelow` price.
- Historical PE/PFCF observations, when point-in-time prices exist in the supplied history, are retained only as an Eulerpool-style reality check. They never override or calibrate the intrinsic value.
- Engine identity is now `JUKA Fair Value 8.2` / `buffett-owner-earnings-intrinsic-value`.

## Design principle
Historical multiples answer “how did the market usually price this business?” Intrinsic value answers “what are the owner cash flows economically worth?” JUKA 8.2 deliberately keeps those questions separate.
