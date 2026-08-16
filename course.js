/* ============================================================
   Ang–Liu course page — rendering, charts, and the playground.
   No dependencies beyond KaTeX (CDN, graceful if absent).
   ============================================================ */

(function () {
  'use strict';

  /* ---------------- KaTeX ---------------- */

  function renderMath() {
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    }
  }
  window.addEventListener('load', renderMath);
  document.addEventListener('DOMContentLoaded', function () {
    // Fallback path if load already fired or KaTeX failed to load.
    setTimeout(function () {
      var any = document.querySelector('.katex');
      if (!any) renderMath();
    }, 800);
  });

  /* ---------------- Reading progress ---------------- */

  var progressBar = document.getElementById('progressBar');
  function onScrollProgress() {
    if (!progressBar) return;
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? h.scrollTop / max : 0;
    progressBar.style.width = (p * 100).toFixed(2) + '%';
  }
  window.addEventListener('scroll', onScrollProgress, { passive: true });
  onScrollProgress();

  /* ---------------- TOC scroll-spy ---------------- */

  (function () {
    var nav = document.getElementById('tocNav');
    if (!nav) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
    var ids = links.map(function (a) { return a.getAttribute('href').slice(1); });
    var sections = ids
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    if (!sections.length) return;

    var active = null;
    function update() {
      var pos = window.scrollY + 160;
      var current = sections[0];
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop <= pos) current = sections[i];
      }
      if (current === active) return;
      active = current;
      links.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + current.id);
      });
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  })();

  /* ============================================================
     Tiny SVG chart engine
     ============================================================ */

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) {
      if (attrs[k] !== undefined && attrs[k] !== null) node.setAttribute(k, attrs[k]);
    }
    return node;
  }

  function Chart(container, o) {
    // o: {w, h, pad:{l,r,t,b}, xmin, xmax, ymin, ymax, xticks:[[val,label]...],
    //     yticks:[...], xtitle, ytitle, fmtX, fmtY}
    this.o = o;
    this.w = o.w; this.h = o.h;
    this.pad = o.pad || { l: 46, r: 18, t: 16, b: 40 };
    this.svg = el('svg', { viewBox: '0 0 ' + this.w + ' ' + this.h, role: 'img' });
    this.g = el('g', {});
    this.svg.appendChild(this.g);
    container.appendChild(this.svg);

    this.px = function (x) {
      var p = this.pad;
      return p.l + (x - o.xmin) / (o.xmax - o.xmin) * (this.w - p.l - p.r);
    };
    this.py = function (y) {
      var p = this.pad;
      return this.h - p.b - (y - o.ymin) / (o.ymax - o.ymin) * (this.h - p.t - p.b);
    };

    var p = this.pad;
    // Gridlines + tick labels
    (o.yticks || []).forEach(function (t) {
      var y = this.py(t[0]);
      this.g.appendChild(el('line', {
        x1: p.l, x2: this.w - p.r, y1: y, y2: y,
        stroke: '#ebebeb', 'stroke-width': 1
      }));
      var lbl = el('text', {
        x: p.l - 8, y: y + 4, 'text-anchor': 'end',
        'font-family': 'Geist Mono, monospace', 'font-size': 10, fill: '#808080'
      });
      lbl.textContent = t[1];
      this.g.appendChild(lbl);
    }, this);
    (o.xticks || []).forEach(function (t) {
      var x = this.px(t[0]);
      this.g.appendChild(el('line', {
        x1: x, x2: x, y1: this.h - p.b, y2: this.h - p.b + 5,
        stroke: '#d4d4d4', 'stroke-width': 1
      }));
      var lbl = el('text', {
        x: x, y: this.h - p.b + 18, 'text-anchor': 'middle',
        'font-family': 'Geist Mono, monospace', 'font-size': 10, fill: '#808080'
      });
      lbl.textContent = t[1];
      this.g.appendChild(lbl);
    }, this);
    // Axis titles
    if (o.ytitle) {
      var t = el('text', {
        x: 12, y: p.t + 2, 'font-family': 'Geist Mono, monospace',
        'font-size': 10, fill: '#666'
      });
      t.textContent = o.ytitle;
      this.g.appendChild(t);
    }
    if (o.xtitle) {
      var tx = el('text', {
        x: this.w - p.r, y: this.h - 6, 'text-anchor': 'end',
        'font-family': 'Geist Mono, monospace', 'font-size': 10, fill: '#666'
      });
      tx.textContent = o.xtitle;
      this.g.appendChild(tx);
    }
  }

  Chart.prototype.line = function (pts, style) {
    var d = '';
    for (var i = 0; i < pts.length; i++) {
      if (pts[i] == null) continue;
      var x = this.px(pts[i][0]).toFixed(1);
      var y = this.py(Math.min(Math.max(pts[i][1], this.o.ymin), this.o.ymax)).toFixed(1);
      d += (d === '' ? 'M' : 'L') + x + ' ' + y;
    }
    this.g.appendChild(el('path', {
      d: d, fill: 'none',
      stroke: style.stroke || '#171717',
      'stroke-width': style.width || 2,
      'stroke-dasharray': style.dash || 'none',
      'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    }));
  };

  Chart.prototype.areaBetween = function (upper, lower, fill) {
    // upper, lower: arrays of [x, y] on the same x grid
    var d = '';
    for (var i = 0; i < upper.length; i++) {
      var x = this.px(upper[i][0]).toFixed(1);
      var y = this.py(upper[i][1]).toFixed(1);
      d += (d === '' ? 'M' : 'L') + x + ' ' + y;
    }
    for (var j = lower.length - 1; j >= 0; j--) {
      d += 'L' + this.px(lower[j][0]).toFixed(1) + ' ' + this.py(lower[j][1]).toFixed(1);
    }
    d += 'Z';
    this.g.appendChild(el('path', { d: d, fill: fill, stroke: 'none' }));
  };

  Chart.prototype.dot = function (x, y, r, fill, stroke) {
    this.g.appendChild(el('circle', {
      cx: this.px(x), cy: this.py(y), r: r || 4,
      fill: fill || '#171717', stroke: stroke || '#fff', 'stroke-width': 1.5
    }));
  };

  Chart.prototype.vline = function (x, stroke, dash) {
    this.g.appendChild(el('line', {
      x1: this.px(x), x2: this.px(x), y1: this.pad.t, y2: this.h - this.pad.b,
      stroke: stroke || '#c9c9c9', 'stroke-width': 1, 'stroke-dasharray': dash || '3 3'
    }));
  };

  Chart.prototype.label = function (x, y, text, o) {
    o = o || {};
    var t = el('text', {
      x: this.px(x), y: this.py(y),
      'text-anchor': o.anchor || 'start',
      'font-family': 'Geist Mono, monospace',
      'font-size': o.size || 10,
      fill: o.fill || '#666'
    });
    t.textContent = text;
    this.g.appendChild(t);
  };

  function niceTicks(min, max, n) {
    var ticks = [];
    var span = max - min;
    if (span <= 0) return [[min, String(min)]];
    var step = span / n;
    var mag = Math.pow(10, Math.floor(Math.log(step) / Math.LN10));
    var norm = step / mag;
    step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
    var v = Math.ceil(min / step) * step;
    while (v <= max + 1e-9) {
      ticks.push([v, String(+v.toFixed(6))]);
      v += step;
    }
    return ticks;
  }

  /* ============================================================
     Scalar Ang–Liu math
     State: expected-return gap, AR(1) with persistence phi.
       E_t[r_{t+j}]   = rbar + phi^(j-1) (r1 - rbar)
       Var(Sum r)     = sigma_r^2 * A_j,   A_j = sum_{n=1}^{j-1} L_n^2
       Cov(Sum g,r)   = rho sigma_g sigma_r * B_j,  B_j = sum_{n=1}^{j-1} L_n
       L_n = (1 - phi^n) / (1 - phi)   (geometric; = n if phi = 1)
       Var(S_j) = j sigma_g^2 + A_j sigma_r^2 - 2 rho sigma_g sigma_r B_j
       strip_j = exp( E_j + 0.5 Var(S_j) ),  P/D = sum_j strip_j
     ============================================================ */

  function geomSum(phi, n) { // L_n
    if (Math.abs(1 - phi) < 1e-12) return n;
    return (1 - Math.pow(phi, n)) / (1 - phi);
  }

  function model(params, J) {
    var r1 = params.r1, rbar = params.rbar, phi = params.phi;
    var g = params.g, sg = params.sg, sr = params.sr, rho = params.rho;
    J = J || 60;

    var A = [0, 0], B = [0, 0]; // A[j] = Var multiplier of sigma_r^2 at horizon j
    // Var_t[Sum_{i<=j} r] = sigma_r^2 * sum_{n=1}^{j-1} L_n^2  (shocks e_{t+1}..e_{t+j-1})
    // Cov_t[Sum g, Sum r]  = rho sigma_g sigma_r * sum_{n=1}^{j-1} L_n
    var runA = 0, runB = 0;
    for (var n = 1; n <= J - 1; n++) {
      var L = geomSum(phi, n);
      runA += L * L;
      runB += L;
      A[n + 1] = runA;
      B[n + 1] = runB;
    }

    var strips = [];      // full Ang–Liu strips
    var stripsE = [];     // E only (no uncertainty)
    var cum = 0, cumE = 0;
    var cumAL = [], cumEonly = [];
    var sumLogVar = 0;

    for (var j = 1; j <= J; j++) {
      var Er = rbar + Math.pow(phi, j - 1) * (r1 - rbar);
      var Ej = j * g - (rbar * j + (r1 - rbar) * geomSum(phi, j));
      var Vj = j * sg * sg + A[j] * sr * sr - 2 * rho * sg * sr * B[j];
      strips.push(Math.exp(Ej + 0.5 * Vj));
      stripsE.push(Math.exp(Ej));
      cum += strips[j - 1];
      cumE += stripsE[j - 1];
      cumAL.push(cum);
      cumEonly.push(cumE);
      sumLogVar += 0.5 * Vj;
    }

    // Gordon (log-space) with a constant rate
    function gordonPD(r) {
      var x = Math.exp(g - r); // per-horizon growth of the strip
      if (x >= 1) return Infinity;
      var first = Math.exp(g - r);
      return first / (1 - first); // infinite sum, closed form
    }

    return {
      J: J,
      strips: strips,
      stripsE: stripsE,
      cumAL: cumAL,
      cumEonly: cumEonly,
      A: A, B: B,
      Er: function (j) { return rbar + Math.pow(phi, j - 1) * (r1 - rbar); },
      Epath: function (j) { return j * g - (rbar * j + (r1 - rbar) * geomSum(phi, j)); },
      V: function (j) { return j * sg * sg + A[j] * sr * sr - 2 * rho * sg * sr * B[j]; },
      gordon: gordonPD,
      pdAL: cumAL[J - 1],
      pdE: cumEonly[J - 1]
    };
  }

  // P/D with only one variance channel switched on (baseline: E only)
  function channelPD(params, channel, J) {
    var r1 = params.r1, rbar = params.rbar, phi = params.phi;
    var g = params.g, sg = params.sg, sr = params.sr, rho = params.rho;
    J = J || 60;
    var cum = 0;
    for (var j = 1; j <= J; j++) {
      var Ej = j * g - (rbar * j + (r1 - rbar) * geomSum(phi, j));
      var adj = 0;
      if (channel === 'g') adj = 0.5 * j * sg * sg;
      if (channel === 'r') adj = 0.5 * AB(params, j).a * sr * sr;
      if (channel === 'c') adj = -rho * sg * sr * AB(params, j).b;
      cum += Math.exp(Ej + adj);
    }
    return cum;
  }

  function AB(params, j) {
    var phi = params.phi;
    var a = 0, b = 0;
    for (var n = 1; n <= j - 1; n++) {
      var L = geomSum(phi, n);
      a += L * L; b += L;
    }
    return { a: a, b: b };
  }

  var fmt1 = function (v) { return (v >= 0 ? '+' : '\u2212') + Math.abs(v).toFixed(1); };

  /* ============================================================
     Fig. 1 — mean reversion of the expected return (static)
     ============================================================ */

  (function () {
    var box = document.getElementById('figMeanReversion');
    if (!box) return;
    var rbar = 6, gap = 4, H = 30;
    var phis = [
      { phi: 0.9, stroke: '#171717', name: '\u03c6 = 0.9' },
      { phi: 0.5, stroke: '#4d4d4d', dash: '6 3', name: '\u03c6 = 0.5' },
      { phi: 0.0, stroke: '#4d4d4d', dash: '2 3', name: '\u03c6 = 0' }
    ];
    var ymax = 10.5;
    var c = new Chart(box, {
      w: 720, h: 300,
      pad: { l: 46, r: 96, t: 16, b: 40 },
      xmin: 1, xmax: H, ymin: 4, ymax: ymax,
      xticks: [1, 5, 10, 15, 20, 25, 30].map(function (v) { return [v, String(v)]; }),
      yticks: niceTicks(4, ymax, 5).map(function (t) { return [t[0], t[0].toFixed(0) + '%']; }),
      xtitle: 'horizon j (years)', ytitle: 'E[r\u209c\u208c\u2c7c]'
    });
    // Unconditional mean
    c.line([[1, rbar], [H, rbar]], { stroke: '#0a72ef', width: 1.5, dash: '4 4' });
    c.label(H + 0.4, rbar, 'r\u0304 = 6%', { fill: '#0a72ef', size: 11 });
    // Damodaran flat line
    c.line([[1, rbar + gap], [H, rbar + gap]], { stroke: '#ff5b4f', width: 1.5, dash: '4 4' });
    c.label(H + 0.4, rbar + gap, 'Damodaran', { fill: '#ff5b4f', size: 11 });
    phis.forEach(function (p) {
      var pts = [];
      for (var j = 1; j <= H; j++) pts.push([j, rbar + Math.pow(p.phi, j - 1) * gap]);
      c.line(pts, { stroke: p.stroke, width: 2, dash: p.dash });
      c.label(H + 0.4, pts[pts.length - 1][1], p.name, { fill: p.stroke, size: 11 });
    });
  })();

  /* ============================================================
     Fig. 2 — covariance and the 10-year strip (interactive)
     ============================================================ */

  (function () {
    var box = document.getElementById('figCorrelation');
    if (!box) return;
    var slider = document.getElementById('corrSlider');
    var out = document.getElementById('corrValue');
    var P = { r1: 0.08, rbar: 0.08, phi: 0.9, g: 0.05, sg: 0.06, sr: 0.015 };
    var J = 10;
    var B10 = AB(P, J).b;

    var ratio = function (rho) { return Math.exp(-rho * P.sg * P.sr * B10); };
    var ymin = Math.min(ratio(1), ratio(-1)) * 100 - 0.4;
    var ymax = Math.max(ratio(1), ratio(-1)) * 100 + 0.4;

    var c = new Chart(box, {
      w: 720, h: 260,
      pad: { l: 56, r: 24, t: 18, b: 40 },
      xmin: -1, xmax: 1, ymin: ymin, ymax: ymax,
      xticks: [[-1, '\u22121'], [-0.5, '\u22120.5'], [0, '0'], [0.5, '0.5'], [1, '+1']],
      yticks: niceTicks(ymin, ymax, 4).map(function (t) { return [t[0], t[0].toFixed(1) + '%']; }),
      xtitle: 'shock correlation \u03c1(g, r)', ytitle: '10y strip vs \u03c1 = 0'
    });

    var pts = [];
    for (var x = -1; x <= 1.0001; x += 0.02) pts.push([x, ratio(x) * 100]);
    c.line(pts, { stroke: '#171717', width: 2 });
    c.line([[-1, 100], [1, 100]], { stroke: '#d4d4d4', width: 1, dash: '3 3' });

    var markerG = el('g', {});
    c.g.appendChild(markerG);

    function draw(rho) {
      while (markerG.firstChild) markerG.removeChild(markerG.firstChild);
      var mx = c.px(rho), my = c.py(ratio(rho) * 100);
      markerG.appendChild(el('line', {
        x1: mx, x2: mx, y1: c.pad.t, y2: c.h - c.pad.b,
        stroke: '#c9c9c9', 'stroke-width': 1, 'stroke-dasharray': '3 3'
      }));
      markerG.appendChild(el('circle', { cx: mx, cy: my, r: 4.5, fill: '#de1d8d', stroke: '#fff', 'stroke-width': 1.5 }));
      out.textContent = (rho >= 0 ? '+' : '\u2212') + Math.abs(rho).toFixed(2);
    }

    if (slider) {
      slider.addEventListener('input', function () { draw(parseFloat(slider.value)); });
      draw(parseFloat(slider.value));
    }
  })();

  /* ============================================================
     Fig. 3 — the discount-curve tilt and the undervaluation wedge
     ============================================================ */

  (function () {
    var box = document.getElementById('figTilt');
    if (!box) return;
    var rbar = 6, gap = 4, phi = 0.9, H = 30;
    var c = new Chart(box, {
      w: 720, h: 300,
      pad: { l: 46, r: 24, t: 18, b: 40 },
      xmin: 1, xmax: H, ymin: 4, ymax: 10.5,
      xticks: [1, 5, 10, 15, 20, 25, 30].map(function (v) { return [v, String(v)]; }),
      yticks: niceTicks(4, 10.5, 5).map(function (t) { return [t[0], t[0].toFixed(0) + '%']; }),
      xtitle: 'horizon j (years)', ytitle: 'discount rate'
    });
    var flat = [], curve = [];
    for (var j = 1; j <= H; j++) {
      flat.push([j, rbar + gap]);
      curve.push([j, rbar + Math.pow(phi, j - 1) * gap]);
    }
    c.areaBetween(flat, curve, 'rgba(10, 114, 239, 0.07)');
    c.line([[1, rbar], [H, rbar]], { stroke: '#0a72ef', width: 1.5, dash: '4 4' });
    c.label(H * 0.62, rbar + 0.25, 'r\u0304 = 6%', { fill: '#0a72ef', size: 11 });
    c.line(flat, { stroke: '#ff5b4f', width: 2, dash: '6 3' });
    c.label(1.4, rbar + gap + 0.35, "Damodaran: today's rate forever", { fill: '#ff5b4f', size: 11 });
    c.line(curve, { stroke: '#171717', width: 2.25 });
    c.label(9.5, rbar + Math.pow(phi, 8) * gap + 0.35, 'Ang\u2013Liu: E[r\u209c\u208c\u2c7c], \u03c6 = 0.9', { fill: '#171717', size: 11 });
    c.label(15, (rbar + gap + rbar + Math.pow(phi, 14) * gap) / 2, 'discount-curve error', { fill: '#0a72ef', size: 11, anchor: 'middle' });
  })();

  /* ============================================================
     Playground
     ============================================================ */

  (function () {
    var root = document.getElementById('playgroundRoot');
    if (!root) return;

    var ids = {
      r1: 'pg-r1', rbar: 'pg-rbar', phi: 'pg-phi', g: 'pg-g',
      sg: 'pg-sg', sr: 'pg-sr', rho: 'pg-rho'
    };
    var sliders = {}, outs = {};
    Object.keys(ids).forEach(function (k) {
      sliders[k] = document.getElementById(ids[k]);
      outs[k] = document.getElementById(ids[k] + '-out');
    });

    var statAL = document.getElementById('statAL');
    var statG1 = document.getElementById('statG1');
    var statGbar = document.getElementById('statGbar');
    var statErr = document.getElementById('statErr');
    var statErrLabel = document.getElementById('statErrLabel');
    var warn = document.getElementById('pgWarn');
    var curveBox = document.getElementById('pgChartCurve');
    var stripsBox = document.getElementById('pgChartStrips');
    var decomp = document.getElementById('pgDecomp');

    var presets = {
      high:  { r1: 10,   rbar: 8.5, phi: 0.9,  g: 5,   sg: 6,   sr: 1.5, rho: 0.3 },
      low:   { r1: 4.5,  rbar: 8.5, phi: 0.9,  g: 5,   sg: 6,   sr: 1.5, rho: 0.3 },
      gordon:{ r1: 9,    rbar: 9,   phi: 0,    g: 4.5, sg: 0.5, sr: 0.1, rho: 0 },
      hedge: { r1: 10,   rbar: 8.5, phi: 0.9,  g: 5,   sg: 8,   sr: 2,   rho: -0.6 }
    };

    function readParams() {
      return {
        r1: +sliders.r1.value / 100,
        rbar: +sliders.rbar.value / 100,
        phi: +sliders.phi.value,
        g: +sliders.g.value / 100,
        sg: +sliders.sg.value / 100,
        sr: +sliders.sr.value / 100,
        rho: +sliders.rho.value
      };
    }

    function setOutputs() {
      outs.r1.textContent = (+sliders.r1.value).toFixed(1) + '%';
      outs.rbar.textContent = (+sliders.rbar.value).toFixed(1) + '%';
      outs.phi.textContent = (+sliders.phi.value).toFixed(2);
      outs.g.textContent = (+sliders.g.value).toFixed(1) + '%';
      outs.sg.textContent = (+sliders.sg.value).toFixed(1) + '%';
      outs.sr.textContent = (+sliders.sr.value).toFixed(1) + '%';
      var r = +sliders.rho.value;
      outs.rho.textContent = (r >= 0 ? '+' : '\u2212') + Math.abs(r).toFixed(2);
    }

    function clearBox(box) { while (box.firstChild) box.removeChild(box.firstChild); }

    function render() {
      setOutputs();
      var p = readParams();
      var m = model(p, 60);

      var pdAL = m.pdAL;
      var pdG1 = m.gordon(p.r1);
      var pdGbar = m.gordon(p.rbar);

      statAL.textContent = pdAL.toFixed(1);
      statG1.textContent = isFinite(pdG1) ? pdG1.toFixed(1) : '\u221e';
      statGbar.textContent = isFinite(pdGbar) ? pdGbar.toFixed(1) : '\u221e';

      var err = isFinite(pdG1) && pdAL > 0 ? (pdG1 / pdAL - 1) * 100 : NaN;
      if (isFinite(err)) {
        statErr.textContent = fmt1(err) + '%';
        statErr.classList.toggle('is-neg', err > 0);
        statErr.classList.toggle('is-pos', err < 0);
        statErrLabel.textContent = err > 0
          ? 'Constant-rate DCF overvalues by'
          : 'Constant-rate DCF undervalues by';
        statErrLabel.appendChild(document.createTextNode(' '));
      } else {
        statErr.textContent = '\u221e';
        statErr.classList.add('is-neg');
        statErr.classList.remove('is-pos');
        statErrLabel.textContent = 'Constant-rate DCF error';
      }

      // Warnings
      var warns = [];
      if (!isFinite(pdG1)) {
        warns.push('r\u2081 \u2264 g: the constant-rate DCF (Gordon at today\u2019s rate) has no finite value \u2014 it needs r > g.');
      }
      var lastRatio = m.strips[59] / (m.strips[58] || 1);
      if (lastRatio > 0.99) {
        warns.push('Strips are still growing at horizon 60 \u2014 this calibration has no finite value in the limit (the r > g analogue fails). Ang\u2013Liu shows the 60-horizon partial sum.');
      }
      warn.hidden = warns.length === 0;
      warn.textContent = warns.join(' ');

      // ---- Chart 1: term structure ----
      clearBox(curveBox);
      var H = 40;
      var rmin = Math.min(p.rbar, p.r1) * 100 - 0.5;
      var rmax = Math.max(p.rbar, p.r1) * 100 + 0.5;
      var c1 = new Chart(curveBox, {
        w: 720, h: 260,
        pad: { l: 46, r: 24, t: 14, b: 38 },
        xmin: 1, xmax: H, ymin: rmin, ymax: rmax,
        xticks: [1, 10, 20, 30, 40].map(function (v) { return [v, String(v)]; }),
        yticks: niceTicks(rmin, rmax, 4).map(function (t) { return [t[0], t[0].toFixed(1) + '%']; }),
        xtitle: 'horizon j', ytitle: 'E[r\u209c\u208c\u2c7c]'
      });
      var curvePts = [];
      for (var j = 1; j <= H; j++) curvePts.push([j, m.Er(j) * 100]);
      c1.line([[1, p.r1 * 100], [H, p.r1 * 100]], { stroke: '#ff5b4f', width: 1.5, dash: '5 4' });
      c1.line([[1, p.rbar * 100], [H, p.rbar * 100]], { stroke: '#0a72ef', width: 1.5, dash: '4 4' });
      c1.line(curvePts, { stroke: '#171717', width: 2.25 });
      c1.label(H - 9.5, p.r1 * 100 + (rmax - rmin) * 0.06, 'r\u2081 forever', { fill: '#ff5b4f', size: 10 });
      c1.label(H - 9.5, p.rbar * 100 - (rmax - rmin) * 0.02, 'r\u0304', { fill: '#0a72ef', size: 10 });
      c1.label(H * 0.28, m.Er(Math.round(H * 0.28)) * 100 - (rmax - rmin) * 0.08, 'Ang\u2013Liu', { fill: '#171717', size: 10 });

      // ---- Chart 2: cumulative P/D ----
      clearBox(stripsBox);
      var cumG1 = [], cumGbar = [];
      if (isFinite(pdG1) && pdG1 > 0) {
        var xg = Math.exp(p.g - p.r1);
        var run = 0;
        for (var j2 = 1; j2 <= 60; j2++) { run += Math.pow(xg, j2); cumG1.push([j2, run]); }
      }
      if (isFinite(pdGbar) && pdGbar > 0) {
        var xgb = Math.exp(p.g - p.rbar);
        var runb = 0;
        for (var j3 = 1; j3 <= 60; j3++) { runb += Math.pow(xgb, j3); cumGbar.push([j3, runb]); }
      }
      var ymax2 = pdAL;
      if (cumG1.length) ymax2 = Math.max(ymax2, Math.min(cumG1[59][1], pdAL * 2.5));
      if (cumGbar.length) ymax2 = Math.max(ymax2, Math.min(cumGbar[59][1], pdAL * 2.5));
      ymax2 = Math.max(ymax2 * 1.06, 1);

      var c2 = new Chart(stripsBox, {
        w: 720, h: 260,
        pad: { l: 52, r: 24, t: 14, b: 38 },
        xmin: 0, xmax: 60, ymin: 0, ymax: ymax2,
        xticks: [0, 10, 20, 30, 40, 50, 60].map(function (v) { return [v, String(v)]; }),
        yticks: niceTicks(0, ymax2, 4).map(function (t) { return [t[0], String(+t[0].toFixed(0))]; }),
        xtitle: 'horizon j (cumulative strips)', ytitle: 'P/D'
      });
      if (cumGbar.length) c2.line(cumGbar, { stroke: '#a3a3a3', width: 1.5, dash: '2 3' });
      if (cumG1.length) c2.line(cumG1, { stroke: '#ff5b4f', width: 1.75, dash: '5 4' });
      var cumPts = m.cumAL.map(function (v, i) { return [i + 1, v]; });
      c2.line(cumPts, { stroke: '#171717', width: 2.25 });
      c2.label(31, ymax2 * 0.9, 'Ang\u2013Liu  ' + pdAL.toFixed(1), { fill: '#171717', size: 10 });
      if (cumG1.length) c2.label(31, ymax2 * 0.82, 'DCF at r\u2081  ' + pdG1.toFixed(1), { fill: '#ff5b4f', size: 10 });
      if (cumGbar.length) c2.label(31, ymax2 * 0.74, 'DCF at r\u0304  ' + pdGbar.toFixed(1), { fill: '#808080', size: 10 });

      // ---- Decomposition ----
      var pd0 = m.pdE; // term structure, no uncertainty
      var rows = [
        {
          name: 'Discount-curve tilt (vs flat r\u2081)',
          val: (isFinite(pdG1) && pdG1 > 0) ? (pd0 / pdG1 - 1) * 100 : NaN,
          note: 'mean reversion alone'
        },
        { name: 'Growth volatility \u00bdVar(\u03a3g)', val: (channelPD(p, 'g') / pd0 - 1) * 100 },
        { name: 'Rate volatility \u00bdVar(\u03a3r)', val: (channelPD(p, 'r') / pd0 - 1) * 100 },
        { name: 'Covariance \u22122Cov(\u03a3g, \u03a3r)', val: (channelPD(p, 'c') / pd0 - 1) * 100 },
        { name: 'Net: all channels (AL vs flat r\u2081 DCF)', val: (isFinite(pdG1) && pdG1 > 0) ? (pdAL / pdG1 - 1) * 100 : NaN }
      ];
      var maxAbs = 1e-9;
      rows.forEach(function (r) { if (isFinite(r.val)) maxAbs = Math.max(maxAbs, Math.abs(r.val)); });

      var html = '<p class="decomp__heading">Where the gap comes from \u2014 each channel alone, % impact on P/D</p><div class="decomp__rows">';
      rows.forEach(function (r) {
        var v = r.val;
        var hasV = isFinite(v);
        var pct = hasV ? fmt1(v) + '%' : 'n/a';
        var w = hasV ? Math.max(2, Math.abs(v) / maxAbs * 100) : 0;
        var cls = !hasV ? '' : v < 0 ? 'decomp__row-fill--neg' : 'decomp__row-fill--pos';
        html += '<div class="decomp__row"><span class="decomp__row-name">' + r.name +
          '</span><span class="decomp__row-val">' + pct + '</span>' +
          '<span class="decomp__row-bar"><span class="decomp__row-fill ' + cls + '" style="width:' + w + '%"></span></span></div>';
      });
      html += '</div><p class="decomp__note">Bars are each channel switched on alone against its baseline: tilt vs the flat-r\u2081 DCF, the three variance channels vs the same term structure with no uncertainty. Level effects compound, so the bars need not sum to the net row. Positive bars raise value (blue), negative bars lower it (red).</p>';
      decomp.innerHTML = html;
    }

    // Slider wiring
    Object.keys(sliders).forEach(function (k) {
      if (sliders[k]) sliders[k].addEventListener('input', function () {
        root.querySelectorAll('.preset').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        render();
      });
    });

    // Presets
    root.querySelectorAll('.preset').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = presets[btn.dataset.preset];
        if (!p) return;
        Object.keys(p).forEach(function (k) { sliders[k].value = p[k]; });
        root.querySelectorAll('.preset').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        render();
      });
    });

    render();
  })();

})();
