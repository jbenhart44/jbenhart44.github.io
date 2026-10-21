// Head to Head (Taylor's game, 2026-10-07): two random player-seasons; pick who leads each of the card's six essentials.
// Every value shown is the printed string from GAME (the built site's front-<year>.json); nothing is computed into a
// new statistic. The key compares the printed values (SM.leader), so it never disagrees with what is on the screen.
//
// Rules, Jake 2026-10-08 (pcvplans/research_runs/2026-10-08_102700/owner_decisions.md):
//   D-B  each round asks the six card essentials, SM.ESSENTIALS, in D-B's written order (PPG, FG%, 3P%, FGA, team shot
//        share, PTS/shot; owner_decisions.md). That is NOT the card's order: the built card prints PPS second (PPG, GP,
//        PPS, FG%, 3P%, FGA, Team shot share; 2016.html, checked 2026-10-08). A tie as printed is skipped (the plan's
//        default, recorded in Jake's D-B answer as "Ties not asked").
//   D-C  3P% is asked only when made threes are at least GAME.three_share_min (5%) of made field goals, for BOTH
//        players (SM.askable reads e.P.three_ok).
// So a round asks 1 to 6 rows, and total is the number asked. Skipped rows are listed, greyed, at the reveal with
// the reason, so the player sees why a category is missing.
//
// Contract: SM.register({id:"h2h", ...}); round(el, rng, done) draws one round, uses rng() for every random choice,
// and calls done({correct, total, detail}) exactly once, when the player presses Check. total = rows asked (1..6).
// Test: tests/js/mockups/test_h2h.mjs
(function () {
  var ID = "h2h", SITE = "https://jbenhart44.github.io/shot-maps/";
  // Row names. Full names are the site's own, from its stats page (jbenhart44.github.io/shot-maps/stats.html, checked
  // 2026-10-08); the abbreviation is GAME's label. Team shot share's line there reads "His share of his team's
  // field-goal attempts" (stats.html#team-share); the game says "the team's" so it names no one as he or his.
  var FULL = {
    ppg: "Points per game", fg_pct: "Field Goal Percentage", fg3_pct: "3-Point Field Goal Percentage",
    fga_per_g: "Field Goal Attempts per game", pps: "Points per shot"
  };
  function rowName(k) {
    if (k === "team_share") return "Team shot share (share of the team's field-goal attempts)";
    return (FULL[k] || SM.label(k)) + " (" + SM.label(k) + ")";
  }

  // Why a category is not asked for this pair, or null when it is asked. Asked means SM.askable for BOTH players and a
  // leader as printed (SM.leader not 0); the reason text only explains that decision, it never makes it.
  function why(A, k) {
    if (SM.askable(A[0], k) && SM.askable(A[1], k) && SM.leader(A[0], A[1], k) !== 0) return null;
    if (k === "fg3_pct") {
      var low = A.filter(function (e) { return e.P.three_ok !== true; });
      if (low.length) return "3P% not asked: " + low.map(function (e) {
        var m = e.P.fg3m, a = e.P.fgm;
        return Number.isInteger(m) && Number.isInteger(a) ? e.P.n + " made " + m + " of " + a + " field goals from three"
          : "made threes are not on file for " + e.P.n;
      }).join("; ") + ".";
    }
    var blank = A.filter(function (e) { return !SM.askable(e, k); });
    if (blank.length) return "Not asked: no value printed for " + blank.map(function (e) { return e.P.n; }).join(" or ") + ".";
    var va = String(SM.stat(A[0], k)), vb = String(SM.stat(A[1], k));
    return "Not asked: tied, " + (va === vb ? "both " + va : va + " and " + vb) + ".";
  }

  // one round's content: a pair of different people, the essentials asked (D-B's order) and the ones skipped
  function draw(rng) {
    for (var tries = 0; tries < 100; tries++) {
      var pr = SM.pair(rng), keys = [], skipped = [];
      SM.ESSENTIALS.forEach(function (k) { var w = why(pr, k); if (w === null) keys.push(k); else skipped.push({ k: k, why: w }); });
      // every pair of different people in the data has at least 2 asked (checked 2026-10-08 over all 356,082 ordered
      // pairs); the redraw only guards a future data change
      if (keys.length) return { pair: pr, keys: keys, skipped: skipped };
    }
    throw new Error("h2h: no pair with an askable category");
  }

  // The map's color key, verbatim from the built site: the <p class="legend"> in each season page's "Figure
  // Description" (jbenhart44.github.io/shot-maps/1997.html to 2026.html, identical on all 30, checked 2026-10-08), and
  // the player pages' one-line legend. site.css already styles .legend. The map fills in GAME are the same site's
  // colors, so this key reads them. "Below the floor, not colored" is the site's own hexagon tooltip wording.
  // One change from the site's markup (Jake, 2026-10-10: "make this scale all be on one line"): the seven swatches sit
  // in one <span class="scale">, which index.html keeps on a single row. Strip that wrapper and the string is the site's.
  // Since 2026-10-21 the site's key as build_site.league_key prints it (Jake, 2026-10-18, "one key everywhere"): the
  // heading in its own paragraph, then the scale. Until then this held the old inline form, "...league average: " and
  // the scale in one paragraph, which the site dropped on 2026-10-18.
  var KEY = '<p class="scale-h">Percentage points above or below league average</p><p class="legend"><span class="scale"><span style="background:#4761ad">-15%</span>'
    + '<span style="background:#667bb9">-10%</span><span style="background:#8e9dc9">-5%</span><span style="background:#f0f0f0">+0%</span>'
    + '<span style="background:#d96f80">+5%</span><span style="background:#cf3952">+10%</span><span style="background:#c8102e">+15%</span></span></p>';
  // No note under the key (Jake, 2026-10-21: "Get rid of this for me please: Size is about attempts and color is about
  // efficiency. An outlined hexagon is below the floor ..."). The heading and the scale say what the colors mean.

  // The rule lines, all three settled by owner_decisions.md. Its "Not yet answered" line leaves open only D-B's pool,
  // pairing rules and set size, and no line here states any of those. The 3P% share is D-C. Ties are D-B(6), listed in
  // Jake's D-B answer ("Ties not asked"). The leader rule is D-B(1): the record does not state it in so many words, but
  // keeping PPG, FGA and team share rules out the league-relative option (it drops all three), and the build spec
  // states it as a Rule. The 3P% share is read from GAME, never typed; without it that line is left out (the rule
  // still holds through SM.askable). The lines name NO player and NO season label, on purpose: an earlier daily.js
  // found a round's player-seasons from its text, and a name here would count as shown in every round.
  // Shown in the RULES box, shortened by /humanize on 2026-10-10 (same three rules, plus how a round scores).
  function ruleLines() {
    var x = window.GAME.three_share_min, three = typeof x === "number" && isFinite(x)
      ? ", and so is 3P% when either player's threes are under " + String(+(x * 100).toFixed(2)) + "% of their made field goals" : "";
    return ["1 point for each row you get right.",
      "The higher number wins, as printed on the cards, even when the seasons differ.",
      "Ties are skipped" + three + "."];
  }
  // The result box's note on what was not asked. Focus moves to the result box at Check, below the list, so a keyboard
  // or screen-reader player hears this even without going back up to the greyed rows. Labels are GAME's, in D-B's
  // order; null when all six were asked.
  function skipNote(skipped) {
    if (!skipped.length) return null;
    var L = skipped.map(function (s) { return SM.label(s.k); });
    var list = L.length === 1 ? L[0] : L.slice(0, -1).join(", ") + " and " + L[L.length - 1];
    return "Not asked this round: " + list + ". " + (L.length === 1 ? "The greyed row above says why." : "The greyed rows above say why.");
  }

  var CSS = [
    ".m-h2h .h2h-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 12px;margin:0 0 8px}",
    ".m-h2h .h2h-cards{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}",
    "@media (min-width:641px){.m-h2h .h2h-cards{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}",
    ".m-h2h .h2h-card{border:1px solid var(--line,#d9dce1);border-radius:8px;padding:10px;min-width:0;background:var(--card,#fff)}",
    ".m-h2h .h2h-card h3{margin:0 0 2px;font-size:1.05rem;overflow-wrap:anywhere}",
    ".m-h2h .h2h-meta{margin:0 0 4px;color:var(--muted,#4b5563);font-size:.9rem}",
    // team colors (Jake, 2026-10-11): a stripe on each card, the team line under it, and each pick button edged in its
    // player's team color and filled with it when chosen; the answer styling (is-done) still overrides by plain CSS
    ".m-h2h .h2h-card{border-top:6px solid var(--tc,#d9dce1)}",
    ".m-h2h .h2h-team{display:flex;align-items:center;gap:6px;margin:0 0 8px;font-size:.88rem;font-weight:600}",
    ".m-h2h .h2h-team .tlogo-wrap{border:1px solid var(--line,#d9dce1)}",
    ".m-h2h .h2h-map{margin-top:8px}",
    ".m-h2h .h2h-key{margin:8px 0 0}",
    ".m-h2h .h2h-key .legend{margin:0 0 2px;font-size:.85rem}",
    ".m-h2h .h2h-keynote{margin:0;font-size:.8rem;color:var(--muted,#4b5563)}",
    ".m-h2h .h2h-rows{list-style:none;padding:0;margin:12px 0 4px}",
    ".m-h2h .h2h-row{padding:10px 0;border-top:1px solid var(--line,#d9dce1)}",
    ".m-h2h .h2h-cat{display:block;font-weight:600;margin:0 0 6px}",
    ".m-h2h .h2h-skip{padding:8px 0;border-top:1px solid var(--line,#d9dce1);color:var(--muted,#6b7280)}",
    ".m-h2h .h2h-skip .h2h-cat{margin:0 0 2px}",
    ".m-h2h .h2h-why{display:block;font-size:.88rem;overflow-wrap:anywhere}",
    ".m-h2h .h2h-picks{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}",
    ".m-h2h .h2h-pick{min-width:0;border:1px solid var(--blue,#1D428A);background:var(--card,#fff);color:var(--blue,#1D428A);border-radius:6px;padding:8px 6px;font:inherit;font-weight:600;cursor:pointer;text-align:center;overflow-wrap:anywhere}",
    ".m-h2h .h2h-pick small{display:block;font-weight:400;font-size:.8rem}",
    ".m-h2h .h2h-pick{border-left:6px solid var(--tc,#1D428A)}",
    ".m-h2h .h2h-pick[aria-pressed=\"true\"]{background:var(--tc,#1D428A);color:var(--ti,#fff);border-color:var(--tb,#1D428A);box-shadow:0 0 0 2px #111827}",
    ".m-h2h .h2h-pick[aria-disabled=\"true\"]{cursor:default}",
    ".m-h2h.is-done .h2h-pick{background:var(--card,#fff);color:var(--ink,#111827);border-color:var(--line,#d9dce1)}",
    ".m-h2h.is-done .h2h-pick.is-lead{border:2px solid #166534}",
    ".m-h2h .h2h-val{display:block;font-size:1.3rem;font-weight:700;margin:2px 0}",
    ".m-h2h .h2h-badge{display:inline-block;font-size:.75rem;font-weight:700;border-radius:4px;padding:1px 6px;margin:2px 2px 0}",
    ".m-h2h .h2h-badge.lead{background:#166534;color:#fff}",
    ".m-h2h .h2h-badge.ok{background:#dcfce7;color:#166534}",
    ".m-h2h .h2h-badge.no{background:#fee2e2;color:#C8102E}",
    ".m-h2h .h2h-verdict{font-weight:700;margin-left:6px}",
    ".m-h2h .h2h-left{color:var(--muted,#4b5563)}",
    ".m-h2h .h2h-out{margin:10px 0 0;padding:10px;border-radius:6px;background:var(--gray,#f2f3f5)}",
    ".m-h2h .h2h-out p{margin:0 0 4px}",
    ".m-h2h .h2h-out a{overflow-wrap:anywhere}"
  ].join("\n");
  function css() {
    if (document.getElementById("css-" + ID)) return;
    var s = document.createElement("style"); s.id = "css-" + ID; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  var nround = 0;
  function round(el, rng, done) {
    css();
    var R = draw(rng), A = R.pair, N = R.keys.length, rid = "h2h" + (++nround), picks = {}, finished = false;
    var root = SM.h("div", { class: "m-" + ID });
    root.appendChild(SM.rules(ruleLines().map(SM.esc)));

    // one instruction line, the question itself (Jake, 2026-10-11: "just say 'Which player led in the following
    // stats?'"). No clock (Jake, 2026-10-10: "get rid of the timer")
    var top = SM.h("div", { class: "h2h-top" });
    top.appendChild(SM.h("span", { class: "h2h-left" }, "Which player led in the following stats?"));
    root.appendChild(top);

    // the two header cards, each with its map behind a toggle (Taylor: condensed, not every hexagon); one shared color
    // key under the cards shows while either map is open
    var cards = SM.h("div", { class: "h2h-cards" }), boxes = [];
    var key = SM.h("div", { class: "h2h-key" }, KEY);
    key.hidden = true;
    A.forEach(function (e, i) {
      var nm = SM.name(e);
      var card = SM.h("div", { class: "h2h-card", "data-side": String(i), "data-p": e.P.p, "data-y": e.y });
      card.appendChild(SM.h("h3", null, SM.esc(e.P.n)));
      card.appendChild(SM.h("p", { class: "h2h-meta" }, SM.esc(e.s) + " season &middot; " + SM.esc(e.P.pos)));
      // the team, in its colors and logo (Jake, 2026-10-11); a traded player shows the team of most games, and says so
      SM.teamVars(card, e);
      card.appendChild(SM.h("p", { class: "h2h-team" }, '<span class="tlogo-wrap" aria-hidden="true">' + SM.logo(e) + "</span>" + SM.esc(SM.teamName(e))));
      var box = SM.h("div", { class: "h2h-map", id: rid + "-map" + i });
      box.hidden = true;
      boxes.push(box);
      var tog = SM.button("Show map", "ghost h2h-maptog", function () {
        var open = box.hidden;
        if (open && !box.firstChild) box.innerHTML = SM.map(e, { label: "Shot map: " + nm });
        box.hidden = !open;
        tog.textContent = open ? "Hide map" : "Show map";
        // the visible words first, then whose map, so a screen reader can tell the two toggles apart
        tog.setAttribute("aria-label", tog.textContent + ": " + nm);
        tog.setAttribute("aria-expanded", String(open));
        key.hidden = boxes.every(function (b) { return b.hidden; });
      });
      tog.setAttribute("aria-label", "Show map: " + nm);
      tog.setAttribute("aria-expanded", "false");
      tog.setAttribute("aria-controls", box.id);
      card.appendChild(tog); card.appendChild(box);
      cards.appendChild(card);
    });
    root.appendChild(cards);
    root.appendChild(key);

    // one row per asked category, one button per player
    var list = SM.h("ol", { class: "h2h-rows" }), rows = {};
    R.keys.forEach(function (k) {
      var li = SM.h("li", { class: "h2h-row", "data-k": k });
      var head = SM.h("span", { class: "h2h-cat" }, SM.esc(rowName(k)));
      var grid = SM.h("div", { class: "h2h-picks", role: "group", "aria-label": rowName(k) }), btns = [];
      A.forEach(function (e, i) {
        var b = SM.teamVars(SM.h("button", { type: "button", class: "h2h-pick", "data-side": String(i), "aria-pressed": "false" },
          SM.esc(e.P.n) + "<small>" + SM.esc(e.s) + "</small>"), e);
        b.addEventListener("click", function () {
          if (finished) return;
          picks[k] = i;
          btns.forEach(function (x, j) { x.setAttribute("aria-pressed", String(j === i)); });
          status();
        });
        btns.push(b); grid.appendChild(b);
      });
      li.appendChild(head); li.appendChild(grid); list.appendChild(li);
      rows[k] = { li: li, head: head, btns: btns };
    });
    root.appendChild(list);

    var bar = SM.h("div", { class: "gbar" });
    var check = SM.button("Check", "h2h-check", grade);
    check.disabled = true;
    var left = SM.h("span", { class: "h2h-left" }, "Pick " + N + " more");
    bar.appendChild(check); bar.appendChild(left);
    root.appendChild(bar);
    var out = SM.h("div", { class: "h2h-out", tabindex: "-1" });
    out.hidden = true;
    root.appendChild(out);

    function status() {
      var n = R.keys.filter(function (k) { return picks[k] === 0 || picks[k] === 1; }).length;
      check.disabled = finished || n < N;
      left.textContent = n < N ? "Pick " + (N - n) + " more" : "Ready to check";
    }

    function grade() {
      if (finished) return;
      if (R.keys.some(function (k) { return picks[k] !== 0 && picks[k] !== 1; })) return;
      finished = true;
      root.className += " is-done";
      check.disabled = true;
      var right = 0, detail = [];
      R.keys.forEach(function (k) {
        var lead = SM.leader(A[0], A[1], k) === 1 ? 0 : 1, pick = picks[k], ok = pick === lead, r = rows[k];
        if (ok) right += 1;
        detail.push({ k: k, a: SM.stat(A[0], k), b: SM.stat(A[1], k), lead: lead, pick: pick, right: ok });
        // the verdict once, on the row; the buttons mark the leader and the pick. The buttons stay focusable
        // (aria-disabled, not disabled) so a keyboard or screen-reader user can step through the revealed values.
        r.head.innerHTML = SM.esc(rowName(k))
          + '<span class="h2h-verdict ' + (ok ? "ok" : "no") + '">' + (ok ? "Right" : "Wrong") + "</span>";
        r.btns.forEach(function (b, i) {
          b.setAttribute("aria-disabled", "true");
          if (i === lead) b.className += " is-lead";
          // name, then the season on its own line, so a phone never breaks "2003-04" at its hyphen
          b.innerHTML = '<small>' + SM.esc(A[i].P.n) + ",<br>" + SM.esc(A[i].s) + "</small>"
            + '<span class="h2h-val">' + SM.esc(SM.stat(A[i], k)) + "</span>"
            + (i === lead ? '<span class="h2h-badge lead">Leads</span>' : "")
            + (i === pick ? '<span class="h2h-badge ' + (ok ? "ok" : "no") + '">Your pick</span>' : "");
        });
      });
      // the categories not asked, greyed, in D-B's order (owner_decisions.md) among the asked rows, each with its reason
      R.skipped.forEach(function (s) {
        var li = SM.h("li", { class: "h2h-skip", "data-k": s.k },
          '<span class="h2h-cat">' + SM.esc(rowName(s.k)) + '</span><span class="h2h-why">' + SM.esc(s.why) + "</span>");
        var at = SM.ESSENTIALS.indexOf(s.k), next = null;
        [].forEach.call(list.children, function (c) { if (!next && SM.ESSENTIALS.indexOf(c.getAttribute("data-k")) > at) next = c; });
        list.insertBefore(li, next);
      });
      left.textContent = "";
      var links = A.map(function (e) {
        return '<a href="' + SITE + "player-" + encodeURIComponent(e.P.p) + ".html#s-" + encodeURIComponent(e.y)
          + '" target="_blank" rel="noopener">' + SM.esc(e.P.n + ", " + e.s) + "</a>";
      }).join(" and ");
      var note = skipNote(R.skipped);
      out.innerHTML = '<p class="gscore">You got ' + right + " of " + N + " right.</p>"
        + (note ? '<p class="h2h-skipnote">' + SM.esc(note) + "</p>" : "")
        + "<p>Check these numbers on the site: " + links + ".</p>";
      out.hidden = false;
      try { out.focus(); } catch (e) {}
      done({ correct: right, total: N, detail: { pair: A.map(function (e) { return { p: e.P.p, y: e.y }; }), rows: detail,
        skipped: R.skipped.map(function (s) { return { k: s.k, why: s.why }; }) } });
    }

    el.appendChild(root);
  }

  SM.register({
    id: ID,
    title: "Head to Head",
    // no blurb: the round's own line asks the question (Jake, 2026-10-11), and index.html skips an empty blurb
    blurb: "",
    round: round
  });
})();
