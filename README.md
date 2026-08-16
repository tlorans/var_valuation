# var_valuation — Ang–Liu (2004) course page

A static course page explaining **Ang & Liu (2004), "How to Discount Cash Flows with
Time-Varying Expected Returns," *Journal of Finance* 59(6), 2745–2783** — built up
equation by equation from the Gordon/Damodaran DCF, with interactive figures and a
calibration playground.

## Files

| File | Purpose |
|---|---|
| `index.html` | The course page (7 steps + comparison + playground + references) |
| `styles.css` | Vercel/Geist design language (shadow-borders, three weights, negative tracking) |
| `course.js` | KaTeX bootstrapping, scroll-spy, SVG chart engine, playground math |
| `vercel.json` | Deploy config (clean URLs, cache headers) |

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
