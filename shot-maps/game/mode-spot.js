// Hot Spot (mode id "spot"): one area of the floor, two players. Slide toward the one who shot better from there and
// say by how much. Reads window.GAME through shared.js (SM). The area is one of NBA.com's own shot zones (GAME.zones,
// Jake 2026-10-10: "a range of the floor in general not just a specific spot"), shaded on the court; a player's makes
// and attempts there are the shots NBA.com filed in that zone that season (P.z, built by build_game_mockups.py, which
// checks that they add up to the attempts on the player's map). The only computed numbers are differences of two
// printed percentages, each shown beside its two terms: the gap, and (when the order flips against each season's
// league) each player's FG% minus the league's.
// Test: tests/js/mockups/test_spot.mjs.
(function () {
  var MIN = 25;          // both players need 25+ attempts in the zone (task spec)
  var TRIES = 200;       // pair draws before the fallback (task spec)
  var END = 30;          // the slider runs -30 to +30 percentage points
  var CLOSE = 50;        // "within 5 points", in tenths of a point
  var G = window.GAME;
  var uid = 0, mounts = 0;   // rounds drawn on this page load (the first one never takes focus)

  // A FG% in tenths of a point, printed the way the site's hexagon tooltip prints it: Python f"{pm / pa:.1%}"
  // (tools/build_site.py svg_for) multiplies the double by 100 and rounds its exact binary value half to even. JS
  // toFixed rounds an exact tie half up instead. The only exact ties a double can hold at the hundredths are x.25 and
  // x.75; x.75 goes to x.8 both ways, x.25 to x.2 in Python and x.3 in JS, so that one case is moved down. Checked
  // 2026-10-08 against Python for all 12,583 distinct (made, attempted) pairs in GAME: 0 differ (plain toFixed: 30).
  function tenths(fg) {
    var v = fg * 100, t = parseInt(v.toFixed(1).replace(".", ""), 10), f = v * 4;
    if (f === Math.floor(f) && f % 4 === 1) t -= 1;
    return t;
  }
  function fmt(t) { var a = Math.abs(t); return (t < 0 ? "-" : "") + Math.floor(a / 10) + "." + (a % 10); }
  function pct(t) { return fmt(t) + "%"; }

  // The score for a guess g (whole points, + toward the right-hand player) against the true gap in tenths (right minus
  // left, from the printed percentages). 1 for the right side (a gap of exactly 0 takes any guess within 2 of even),
  // 1 more within 5 points. An end of the slider counts as within 5 for any gap past it, since a guess cannot go further.
  function score(gapT, g) {
    var side = gapT === 0 ? Math.abs(g) <= 2 : gapT > 0 ? g > 0 : g < 0;
    var close = Math.abs(10 * g - gapT) <= CLOSE || (g === END && gapT >= 10 * END) || (g === -END && gapT <= -10 * END);
    return { side: side, close: close, n: (side ? 1 : 0) + (close ? 1 : 0) };
  }

  // The words for an answer: "Even", or the leader's name and the gap in FG% points ("points" alone reads as points
  // scored on a basketball site).
  function unit(n) { return n === 1 ? " FG% point" : " FG% points"; }

  // The question over the slider (Jake, 2026-10-11: "Who shot better in the paint?"), said for whichever zone the round
  // shades. One phrase per zone, in GAME.zones order; "in the paint" is Jake's own words for "paint, outside the
  // restricted area".
  var QWHERE = ["in the restricted area", "in the paint",
    "from mid-range on the left baseline", "from mid-range on the left wing", "from mid-range in the center",
    "from mid-range on the right wing", "from mid-range on the right baseline",
    "from the left corner three", "from the right corner three",
    "from above-the-break three on the left wing", "from above-the-break three in the center",
    "from above-the-break three on the right wing"];
  function question(z) { return "Who shot better " + QWHERE[z] + "?"; }

  // A zone's figures for one player-season: {pa, pm, fg} from P.z, or null below min attempts
  function zfig(e, z, min) { var c = e.P.z[z]; return c && c[0] >= min ? { pa: c[0], pm: c[1], fg: c[1] / c[0] } : null; }
  // Zones both players took at least min shots from, in GAME.zones order.
  function zonesFor(L, R, min) {
    var out = [];
    G.zones.forEach(function (_, z) { if (zfig(L, z, min) && zfig(R, z, min)) out.push(z); });
    return out;
  }
  // A pair sharing a zone where both took 25+ shots, redrawn with rng up to 200 times. The fallback ranks the 200 pairs
  // by zones clearing the site's 10-attempt floor.
  function draw(rng) {
    var best = null;
    for (var t = 0; t < TRIES; t++) {
      var p = SM.pair(rng), hot = zonesFor(p[0], p[1], MIN);
      if (hot.length) return { L: p[0], R: p[1], z: SM.pick(rng, hot), min: MIN };
      var warm = zonesFor(p[0], p[1], G.floor);
      if (!best || warm.length > best.warm.length) best = { L: p[0], R: p[1], warm: warm };
    }
    return best && best.warm.length ? { L: best.L, R: best.R, z: SM.pick(rng, best.warm), min: G.floor } : null;
  }

  function css() {
    if (document.getElementById("css-spot")) return;
    var s = document.createElement("style");
    s.id = "css-spot";
    s.textContent = [
      ".m-spot .sp-who{margin:0 0 6px;font-size:1rem}",
      ".m-spot .sp-court{max-width:420px;margin:0 auto}",
      ".m-spot .sp-where{margin:6px 0 2px;text-align:center}",
      ".m-spot .sp-slide{max-width:520px;margin:0 auto}",
      ".m-spot .sp-q{display:block;font-weight:600;margin:0 0 2px}",
      ".m-spot .sp-unit{font-size:.85rem;color:var(--muted,#4b5563);margin:0 0 6px}",
      ".m-spot .sp-range{display:block;width:100%;margin:4px 0;accent-color:#1D428A}",
      ".m-spot .sp-ends{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;font-size:.85rem;color:var(--muted,#4b5563)}",
      ".m-spot .sp-ends span{min-width:0;overflow-wrap:break-word}",
      ".m-spot .sp-ends span:last-child{text-align:right}",
      ".m-spot .sp-live{font-weight:700;margin:6px 0 10px;min-height:2.8em}",
      ".m-spot .sp-reveal{margin-top:12px;border-top:1px solid var(--line,#d9dce1);padding-top:10px}",
      ".m-spot .sp-reveal p{margin:4px 0}",
      ".m-spot .sp-t{table-layout:fixed;margin:8px 0}",
      ".m-spot .sp-t .sp-c0{width:30%}",
      ".m-spot .sp-t th,.m-spot .sp-t td{overflow-wrap:break-word;hyphens:auto;padding:6px 4px}",
      ".m-spot .sp-t thead th{font-size:.8rem;line-height:1.3}",
      ".m-spot .sp-t thead small{font-weight:400;color:var(--muted,#4b5563)}",
      ".m-spot .sp-colors{font-size:.85rem;color:var(--muted,#4b5563)}",
      ".m-spot .sp-maps{display:grid;grid-template-columns:1fr;gap:12px;margin-top:10px}",
      ".m-spot .sp-maps figure{margin:0;min-width:0}",
      ".m-spot .sp-maps figcaption{font-size:.9rem;font-weight:700;color:var(--ink,#111827);margin-bottom:4px}",
      "@media (min-width:641px){.m-spot .sp-maps{grid-template-columns:1fr 1fr}}"
    ].join("\n");
    document.head.appendChild(s);
  }

  function round(el, rng, done) {
    css();
    var root = SM.h("div", { class: "m-spot" }), answered = false;
    el.appendChild(root);
    var pick = draw(rng);
    if (!pick) {
      root.appendChild(SM.h("p", null, "No area both players shot from was found for this round."));
      var skip = SM.button("Skip round", "", function () {
        if (answered) return;
        answered = true; skip.disabled = true;
        // 0 of 0, as the Daily scores a round it cannot draw: a failed draw costs the player nothing (plan
        // 2026-10-20_173559, Phase 1). Unreachable on today's data (every player-season has 62+ restricted-area attempts).
        done({ correct: 0, total: 0, detail: "Hot Spot: no shared area, round skipped" });
      });
      root.appendChild(skip);
      return;
    }
    var L = pick.L, R = pick.R, z = pick.z, where = G.zones[z], area = G.zhex[z];
    var sL = zfig(L, z, 0), sR = zfig(R, z, 0);
    var tL = tenths(sL.fg), tR = tenths(sR.fg);
    // the answer key: the right-hand player's FG% here minus the left-hand player's, in tenths of a percentage point,
    // taken from the two percentages as printed so the key never disagrees with the screen
    var gapT = tR - tL;
    var nL = SM.esc(L.P.n), nR = SM.esc(R.P.n), id = "sp-range-" + (++uid);
    root.setAttribute("data-left", L.P.p + "-" + L.y);
    root.setAttribute("data-right", R.P.p + "-" + R.y);
    root.setAttribute("data-zone", String(z));

    function words(v) {
      if (v === 0) return "Even";
      var n = Math.abs(v);
      return (v > 0 ? R : L).P.n + " by " + n + (n >= END ? " or more FG% points" : unit(n));
    }

    // the RULES box, shortened by /humanize on 2026-10-10 (same rules as the two "Draft rule" lines it replaces)
    root.appendChild(SM.rules([
      "1 point for sliding toward the player who shot better from the shaded area, and 1 more for landing within 5 FG% points of the gap.",
      "If they shot the same, any guess within 2 of even earns the first point. The slider stops at 30, so an end counts as within 5 for any bigger gap.",
      "FG% uses every shot NBA.com put in this zone that season (" + pick.min + " or more each), with no era adjustment. The shading shows where most of those shots land."
    ]));
    root.appendChild(SM.h("p", { class: "sp-who" }, "<b>" + SM.esc(SM.name(L)) + "</b> vs <b>" + SM.esc(SM.name(R)) + "</b>"));
    root.appendChild(SM.h("div", { class: "sp-court" }, SM.map(null, { blank: true, shade: area, label: "Court with the area shaded: " + where })));
    root.appendChild(SM.h("p", { class: "sp-where" }, "The shaded area: <b>" + SM.esc(where) + "</b>"));
    var slide = SM.h("div", { class: "sp-slide" });
    root.appendChild(slide);
    slide.appendChild(SM.h("label", { class: "sp-q", for: id }, SM.esc(question(z))));
    slide.appendChild(SM.h("p", { class: "sp-unit", id: id + "-unit" },
      "Better means a higher field-goal percentage (FG%) from this area. The slider counts FG% points."));
    var input = SM.h("input", { type: "range", class: "sp-range", id: id, min: String(-END), max: String(END), step: "1", value: "0",
      "aria-valuetext": "Even", "aria-describedby": id + "-unit" });
    slide.appendChild(input);
    slide.appendChild(SM.h("div", { class: "sp-ends" }, "<span>" + nL + "</span><span>even</span><span>" + nR + "</span>"));
    var live = SM.h("p", { class: "sp-live", "aria-live": "polite" }, "Even");
    slide.appendChild(live);
    function update() {
      var v = parseInt(input.value, 10) || 0;
      live.textContent = words(v);
      input.setAttribute("aria-valuetext", words(v));
    }
    input.addEventListener("input", update);
    input.addEventListener("change", update);
    var lock = SM.button("Lock in guess", "", function () {
      if (answered) return;
      answered = true;
      var g = Math.max(-END, Math.min(END, parseInt(input.value, 10) || 0));
      input.disabled = true; lock.disabled = true;
      var sc = score(gapT, g);
      root.setAttribute("data-gap", String(gapT));
      root.setAttribute("data-guess", String(g));
      reveal(sc, g);
      done({ correct: sc.n, total: 2, detail: "Hot Spot, " + where + ": " + gapWords() + ". Guess: " + words(g) + "." });
    });
    slide.appendChild(lock);
    function gapWords() {
      if (gapT === 0) return "Even, " + pct(tL) + " each";
      var hi = gapT > 0 ? R : L, a = gapT > 0 ? tR : tL, b = gapT > 0 ? tL : tR;
      return hi.P.n + " by " + fmt(Math.abs(gapT)) + " FG% points (" + pct(a) + " minus " + pct(b) + ")";
    }

    function reveal(sc, g) {
      // "Even" is not a side, so a guess of Even against a nonzero gap is named as such rather than "the wrong side"
      var sideText = gapT === 0 ? (sc.side ? "close enough to even" : "too far from even")
        : g === 0 ? "you said even, so no point for a side" : sc.side ? "right side" : "wrong side";
      var verdict = sideText + (sc.side === sc.close ? ", and " : ", but ") + (sc.close ? "within 5 FG% points." : "not within 5 FG% points.");
      var cls = sc.n === 2 ? "ok" : sc.n === 0 ? "no" : "";
      var zl = L.D.zlg[z], zr = R.D.zlg[z], tlg = tenths(zl[1] / zl[0]), trg = tenths(zr[1] / zr[0]);
      // Each player against that season's league, from the printed figures in the table (FG% minus league FG%). When
      // that order is the reverse of the raw gap, the two maps' colors in the area can point the other way from the key
      // (seen at seed "st-17", 2026-10-08), so the reveal spells out both differences.
      var relL = tL - tlg, relR = tR - trg, flip = gapT !== 0 && relR !== relL && (relR > relL) !== (gapT > 0);
      function rel(e, t, tl) {
        var dlt = t - tl;
        return SM.esc(e.P.n) + (dlt === 0 ? " was level with that season's league (" + pct(t) + " each)"
          : " was " + fmt(Math.abs(dlt)) + " FG% points " + (dlt > 0 ? "above" : "below")
            + " that season's league (" + pct(t) + " minus " + pct(tl) + ")");
      }
      function row(label, a, b) { return "<tr><th scope=\"row\">" + label + "</th><td>" + a + "</td><td>" + b + "</td></tr>"; }
      function head(e) { return "<th scope=\"col\">" + SM.esc(e.P.n) + " <br><small>(" + SM.esc(e.s) + ")</small></th>"; }
      function fig(e) {
        // the caption links his map on the site (plan 2026-10-20_173559, Phase 1): the same words, now a way into the maps
        return "<figure><figcaption>" + SM.link(SM.mapHref(e), SM.esc(SM.name(e))) + "</figcaption>"
          + SM.map(e, { outline: area, label: SM.name(e) + ", area outlined" }) + "</figure>";
      }
      var box = SM.h("div", { class: "sp-reveal" },
        "<p class=\"sp-res\" tabindex=\"-1\"><span class=\"" + cls + "\">" + sc.n + " of 2</span>: " + verdict + "</p>"
        + "<p class=\"sp-guess\">Your guess: " + SM.esc(words(g)) + ".</p>"
        + "<p class=\"sp-gap\">True gap: " + SM.esc(gapWords()) + ".</p>"
        + "<table class=\"sp-t\"><colgroup><col class=\"sp-c0\"><col><col></colgroup><thead><tr><th scope=\"col\">"
        + "The shaded area</th>" + head(L) + head(R) + "</tr></thead><tbody>"
        + row("FG%", pct(tL), pct(tR))
        + row("Makes of attempts", sL.pm + " of " + sL.pa, sR.pm + " of " + sR.pa)
        + row("League FG%, that season", pct(tlg), pct(trg))
        + "</tbody></table>"
        + "<div class=\"sp-maps\">" + fig(L) + fig(R) + "</div>"
        + "<p class=\"sp-colors\">Map colors compare each player with that season's league at each spot: red is above the league, blue is below. The gap above uses raw FG% over the whole area, so the colors can point the other way.</p>"
        + (flip ? "<p class=\"sp-flip\">Against each season's league the order flips here: " + rel(L, tL, tlg) + ", and " + rel(R, tR, trg) + ".</p>" : ""));
      root.appendChild(box);
      var res = box.querySelector(".sp-res");
      if (res && res.focus) res.focus();
    }

    // Keyboard: after "Next round" the focused button is disabled and the old round is removed, so focus falls out of
    // the page. Put it on the new slider then, but never on the first round of a page load (that would skip the tabs)
    // and never when focus is still on a live control, such as the tab that opened this mode.
    mounts += 1;
    var a = document.activeElement;
    if (mounts > 1 && (!a || a === document.body || a.disabled || !a.isConnected)) {
      try { input.focus({ preventScroll: true }); } catch (e) { /* focus is a convenience */ }
    }
  }

  SM.register({
    id: "spot",
    title: "Hot Spot",
    // no blurb (Jake, 2026-10-11: "get rid of this"); the question over the slider says what to do
    blurb: "",
    round: round,
    // exposed for tests/js/mockups/test_spot.mjs; nothing in index.html or daily.js needs them
    score: score, tenths: tenths, zfig: zfig, question: question, QWHERE: QWHERE
  });
})();
