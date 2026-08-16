# Dynamic DCF — course page

A static course on **discounting cash flows when expected returns move**: why one joint
model of cash flows and expected returns is required, what a VAR is and why it is the
right tool, how the model is estimated from data, and what it changes in valuation
practice — built up equation by equation from the Gordon/Damodaran DCF, with interactive
figures and a calibration playground.

The course is an independent teaching resource built around two reference papers (PDFs in
this repo); it is not an authors' site:

- `w10042.pdf` — Ang & Liu (2004), "How to Discount Cash Flows with Time-Varying
  Expected Returns," *Journal of Finance* 59(6), 2745–2783 (NBER WP 10042 version)
- `valuations-model.pdf` — Ang & Liu (2001), "A General Affine Earnings Valuation
  Model," *Review of Accounting Studies* 6, 397–425

## Course structure (13 steps)

- **00–06** — the original derivation: Damodaran benchmark → definition of value →
  growth form → VAR → lognormal step → closed-form solution → Gordon as degenerate case
- **03** — expanded: why one joint model (value is the expectation of a product, so the
  joint distribution is the minimum required), what a VAR concretely is (a system of
  simultaneous regressions, with the 2×2 case written out), recursive forecasting, and
  the four requirements a VAR uniquely meets (jointness, mean reversion, testable
  predictability, Gaussian closed-form)
- **07** — spot discount rates μt(n): the paper's practical bridge that keeps the
  two-step (forecast, then discount) workflow while replacing the single WACC with a curve
- **08** — estimation: the five-stage empirical pipeline from raw data to a priced
  discount curve (observables → rolling betas → risk-premium regression → VAR →
  recursions), the division of labor between standard tools, and what can go wrong
- **09** — the mental map: where the state variables come from. Territory 1 links the
  cash-flow side to the profitability literature (Fama–French 2000 mean reversion,
  Nissim–Penman 2001 ROE structure and the rates-profitability link, Vuolteenaho 2002
  firm-level cash-flow dominance, Ang–Liu 2001 / Lee–Myers–Swaminathan 1999
  persistence-pricing). Territory 2 links the discount-rate side to the
  return-predictability literature, with a predictor-by-predictor survival table
  (dividend yield dropped; short rate, cay, inflation, moving betas kept). The bridge
  territory (Bansal–Yaron 2004, Croce 2014) explains why one state vector can drive
  both sides; Cochrane 2011 and dividend strips frame the field
- **10** — the frontier, worked: greenness in the VAR. The NLP-greenness literature in
  three waves (Khan–Serafeim–Yoon 2016 materiality-weighted scores → profitability;
  Sautner–van Lent–Vilkov–Zhang 2023 ML earnings-call climate exposure with
  opportunity/physical/regulatory splits; Grewal–Hauptmann–Serafeim 2021, Bingler et
  al. 2024; Engle et al. 2020 pricing), then the six-step recipe for adding a greenness
  column to the VAR: build the text series → admission tests on both sides → augment
  X_t → re-estimate with new fragilities (mixed frequency, short samples, near-unit-root
  persistence) → extend the affine loadings on both sides → read the new outputs
  (green-vs-brown term structures, variance shares, decomposed P/D gaps)
- **11** — what the paper finds: the December 2000 upward-sloping discount curve, the
  perpetuity mis-pricing table (−15.3% mean B/M error, −57.9% worst industry), the
  horizon-dependent variance decomposition, and why the approach turns price-watching
  into price-explaining (each valuation narrative becomes a measured object)
- **12** — the 2001 companion: residual income + pricing kernel, Corollary 2.2 (a
  constant discount factor is not always possible even with constant rates), affine
  goodwill, P/B comparative statics, and the Jensen-vs-risk-aversion sign result

A note on model class: the course's Steps 05–06 present the exponential-affine solution,
which is exact when beta or the risk premium is constant; the 2004 paper's full model is
exponential-quadratic (the β×λ interaction drives an H(n) recursion). Step 05's
"Honesty about the special case" note makes this explicit.

## Files

| File | Purpose |
|---|---|
| `index.html` | The course: 11 steps + comparison + estimation pipeline + playground + references |
| `styles.css` | Vercel/Geist design language (shadow-borders, three weights, negative tracking) |
| `course.js` | KaTeX bootstrap, scroll-spy, SVG chart engine, playground math |
| `vercel.json` | Deploy config (cache/security headers) |

No build step. Math renders via KaTeX CDN; charts are hand-rolled SVG; the playground
computes equations (2), (6) and (7) of the course derivation exactly for a scalar
(one-state, two-shock) special case of the model.

## Run locally

Any static file server works, e.g.:

    npx serve .

or just open `index.html` in a browser.

## Deploy to Vercel

CLI:

    npm i -g vercel
    vercel        # preview
    vercel --prod # production

Or push to GitHub (`tlorans/var_valuation`) and import the repo at
<https://vercel.com/new> — no framework preset needed (Other).

## The playground model (what it computes)

Scalar state = expected-return gap, AR(1) with persistence φ:

- Term structure: `E_t[r_{t+j}] = r̄ + φ^(j−1)(r₁ − r̄)`
- Cumulative discount: `Σ r = r̄·j + (r₁ − r̄)·L_j`, with `L_j = (1 − φ^j)/(1 − φ)`
- Variances/covariance of cumulated shocks follow from the same geometric sums
- Strip_j = `exp(E_j + ½Var_j)`, P/D = Σ strips (60 horizons)

Presets: high-rate regime, low-rate regime (where the constant-rate DCF diverges but
Ang–Liu still prices the asset), near-Gordon, and a growth–rate hedge (negative ρ).

## Educational disclaimer

Stylized calibrations for intuition, not the paper's estimated system. Equation
numbering follows the course derivation on the page.
