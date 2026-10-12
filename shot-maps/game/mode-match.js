// Map Match (mode id "match"): one season, some of its top 20 scorers, their maps shuffled. Put each name on its map.
// Three levels (Jake, 2026-10-10: "easy medium hard with 2 3 4"): Easy two maps, Medium three, Hard four. Every map is SM.map (the site's own drawing and fills). Every number in
// the reveal is read from GAME as the site prints it, except the zone counts and shares, which are computed here
// from the hexagons' attempts and shown WITH their counts so each share can be checked by hand.
// Test: tests/js/mockups/test_match.mjs.
(function () {
  var G = window.GAME, Q = G.geom, SM = window.SM, SQ3 = Math.sqrt(3.0);
  var ID = "match", SITE = "https://jbenhart44.github.io/shot-maps/";
  // The level has two settings, kept apart so neither overwrites the other:
  //   level: the player's own choice on the Practice tab (2, 3 or 4 maps); the level buttons change it, and it carries
  //          from round to round.
  //   pin  : set by setHard(on) (off = Easy, on = Medium, as before) or setLevel(n). It fixes the level of every round
  //          drawn in the same task as the call, and in those rounds the level buttons are kept in the page but hidden
  //          and disabled, so every player of the Daily Challenge
  //          gets the same puzzle. daily.js calls setHard(false) and then, without yielding, draws Map Match several
  //          times off the page (planRounds: up to TRIES redraws to keep player-seasons apart) or once for real
  //          (runRound), so all of those draws are pinned. The pin lapses at the next microtask, so a Practice round,
  //          which always starts from a later click, gets the player's own choice back.
  var level = 2, pin = null;
  var LEVELS = [[2, "Easy"], [3, "Medium"], [4, "Hard"]], WORDS = { 2: "two", 3: "three", 4: "four" };
  function levelName(n) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i][0] === n) return LEVELS[i][1]; return ""; }

  // --- zones -------------------------------------------------------------------------------------------------------
  // A hexagon goes to a zone by its CENTER, using the site's own geometry (GAME.geom, which is build_site.front_geometry).
  // A zone's count is the player's attempts (hex a) summed over its hexagons.
  //
  //   at the rim : hexagon (0,0) only, the one hexagon centered on the basket. It is Q.w = 5 ft across, so it reaches
  //                2.5 to 2.9 ft from the rim, and its six neighbours are centered 5 ft away. It is NOT the 4 ft
  //                restricted area, and the row label says so. A review on 2026-10-08 counted the raw rows: the top
  //                20's shots in this hexagon run 16.5% below a within-4-ft count in 2015-16 and 29.4% below it in
  //                2024-25.
  //   threes     : an ESTIMATE. GAME has no two-or-three flag per hexagon, only attempts, so a hexagon counts as all
  //                threes or all twos. Counted as threes: the two corner-three hexagons (geom.corner; every attempt
  //                NBA.com labels Left or Right Corner 3 is put there, tools/shotmaps.py CORNER_HEX), plus every grid
  //                hexagon whose center is beyond the three-point line or less than INSIDE = 1 ft inside it. Above
  //                the corner break BREAK_Y that is a center more than THREE_R - 1 ft from the rim; below it, more
  //                than CORNER_X - 1 ft out to the side.
  //                Why 1 ft inside: far more shots come from just behind the line than just inside it, so a hexagon
  //                the line cuts through mostly holds threes. Counted 2026-10-08 from NBA.com's own 2PT/3PT flag on
  //                the raw rows (tools/shotmaps.read_mirror and shots_from_mirror on data/sources/raw/mirror-<year>,
  //                with y0 and frame from data/tables/<year>_summary.json, only hexagons the map draws), league
  //                hexagons with 200 or more attempts, above the break: the ring centered 22.91 ft out (0.84 ft
  //                inside the line) was 55% to 90% threes in every season from 1997-98 to 2025-26; the ring centered
  //                21.79 ft out (1.96 ft inside) was 4% to 33% threes. The old rule (center beyond the line only)
  //                undercounted the top 20's threes in all 30 seasons, by 5.5% (2024-25) to 55.9% (1996-97). This
  //                rule lands 1.0% to 10.3% above the flag count in every season, and within 4 points of the true
  //                share for 589 of the 600 player-seasons (worst: Corey Maggette 2004-05, 5.9 points high).
  //   1996-97    : the line was closer to the basket than the arc the site draws (geom.lines is today's 23.75 ft line
  //                in every season). From the same recount: the 21.79 ft ring was 80% to 85% threes in 1996-97 and
  //                4% to 33% in every later season; the 20.0 ft ring was 9% to 16% threes in 1996-97. So in 1996-97 a
  //                hexagon counts as a three when its center is more than SHORT_R = 21 ft from the rim, all the way
  //                around (no corner break). Search summaries say the line was 22 ft all around that season; they
  //                were not opened, so the screen says only "closer to the basket".
  // CORNER_X, BREAK_Y and THREE_R are derived from geom.corner so they cannot disagree with the drawn court: the
  // corner hexagon sits at x = (CORNER_X + cw/2)/2 and y = BREAK_Y/2 (shotmaps._corner_center), and the arc meets the
  // corner line at (CORNER_X, BREAK_Y), so THREE_R = hypot(CORNER_X, BREAK_Y - rimy). For the NBA: 22 ft, 14.20 ft,
  // 23.75 ft (court.py THREE_CORNER_X, corner_break_y, THREE_R).
  // A share divides by the attempts DRAWN on the map (the sum of a over the player's hexagons). That can be a few
  // fewer than the site's half-court attempts, because the map is drawn only to Q.ymax = 40 ft from the baseline
  // (build_site.front_json drops a hexagon centered beyond Y_MAX), so the reveal shows both numbers.
  var INSIDE = 1.0, SHORT_YEAR = "1997", SHORT_R = 21.0;
  var CC = Q.corner[Object.keys(Q.corner)[0]];
  var CORNER_X = 2 * Math.abs(CC[0]) - Q.cw / 2;
  var BREAK_Y = 2 * CC[1];
  var THREE_R = Math.sqrt(CORNER_X * CORNER_X + (BREAK_Y - Q.rimy) * (BREAK_Y - Q.rimy));
  function center(q, r) { var k = Q.corner[q + "," + r]; return k ? k : [Q.rimx + Q.w * (q + r / 2), Q.rimy + 1.5 * (Q.w / SQ3) * r]; }
  function zoneOf(y, q, r) {
    if (Q.corner[q + "," + r]) return "three";
    if (q === 0 && r === 0) return "rim";
    var c = center(q, r), dx = c[0] - Q.rimx, dy = c[1] - Q.rimy, d = Math.sqrt(dx * dx + dy * dy);
    if (y === SHORT_YEAR) return d > SHORT_R ? "three" : "";
    if (c[1] <= BREAK_Y ? Math.abs(dx) > CORNER_X - INSIDE : d > THREE_R - INSIDE) return "three";
    return "";
  }
  function zones(e) {
    var z = { rim: 0, three: 0, drawn: 0 };
    e.P.hex.forEach(function (h) { var k = zoneOf(e.y, h[0], h[1]); z.drawn += h[2]; if (k) z[k] += h[2]; });
    return z;
  }
  function share(k, z) { return k + " of " + z.drawn + "<br>" + (z.drawn ? (100 * k / z.drawn).toFixed(1) + "%" : "none drawn"); }
  function shown(v) { return v === "" || v == null ? "not listed" : SM.esc(v); }

  // the facts the reveal sets side by side: [key, label, value(e, z) as HTML]
  var FACTS = [
    ["rank", "Rank by points per game", function (e) { return SM.esc(String(e.P.rank)); }],
    ["ppg", "Points per game", function (e) { return shown(e.P.stats.ppg); }],
    ["fg3_pct", "Three-point percentage", function (e) { return shown(e.P.stats.fg3_pct); }],
    ["fga_per_g", "Shots per game", function (e) { return shown(e.P.stats.fga_per_g); }],
    ["att", "Half-court shots", function (e) { return shown(e.P.att); }],
    ["drawn", "Shots drawn on the map", function (e, z) { return String(z.drawn); }],
    ["rim", "At the rim (the one hexagon on the basket)", function (e, z) { return share(z.rim, z); }],
    ["three", "Threes (estimated from the hexagons)", function (e, z) { return share(z.three, z); }],
  ];

  var CSS = [
    ".m-match .mm-head{margin:0 0 6px;font-size:1rem}",
    // the three levels on one row, equal widths (council 2026-10-11: they wrapped unevenly on a phone)
    ".m-match .mm-hard{display:flex;flex-wrap:nowrap;gap:6px;margin:0 0 6px}",
    ".m-match .mm-hard .gbtn{flex:1 1 0;min-width:0;padding:8px 4px;white-space:normal;line-height:1.2}",
    ".m-match .mm-hard .gbtn[aria-pressed=\"true\"]{background:#1D428A;color:#fff}",
    ".m-match .mm-hard .gbtn[aria-pressed=\"false\"]{background:#fff;color:#1D428A}",
    ".m-match .mm-hard.mm-locked{display:none}",
    ".m-match .mm-how,.m-match .mm-note,.m-match .mm-hint,.m-match .mm-key,.m-match .mm-pin,.m-match .mm-era{font-size:.85rem;color:var(--muted,#4b5563);margin:4px 0}",
    ".m-match .mm-era{color:var(--ink,#111827)}",
    ".m-match .mm-key b.r{color:#C8102E}",
    ".m-match .mm-key b.b{color:#1D428A}",
    ".m-match .mm-hint{min-height:1.3em;color:var(--ink,#111827);font-weight:600}",
    ".m-match .mm-names{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 10px}",
    ".m-match .gbtn{min-height:44px}",
    ".m-match .mm-names .gbtn{max-width:100%;white-space:normal;text-align:left}",
    // a chosen name keeps its team colors and gains a dark ring
    ".m-match .mm-names .gbtn[aria-pressed=\"true\"]{box-shadow:0 0 0 3px #fff,0 0 0 6px #111827}",
    // after the answer the name buttons carry the true map, so they stay full strength rather than the faded look
    ".m-match .mm-names .gbtn:disabled{opacity:1}",
    ".m-match .mm-maps{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}",
    "@media (min-width:641px){.m-match .mm-maps{grid-template-columns:repeat(2,minmax(0,1fr))}}",
    "@media (min-width:900px){.m-match .mm-maps.mm-n3{grid-template-columns:repeat(3,minmax(0,1fr))}}",
    "@media (min-width:1100px){.m-match .mm-maps.mm-n4{grid-template-columns:repeat(4,minmax(0,1fr))}}",
    ".m-match .mm-card{border:1px solid var(--line,#d9dce1);border-radius:6px;padding:8px;background:#fff;min-width:0}",
    ".m-match .mm-armed .mm-card{border-color:#1D428A;box-shadow:0 0 0 2px #bfd0ee}",
    ".m-match .mm-cap{display:block;width:100%;text-align:left;margin:0 0 6px;white-space:normal}",
    // after the answer the caption carries the true name, so it stays full strength rather than the faded disabled look
    ".m-match .mm-cap:disabled{opacity:1;color:var(--ink,#111827);border-color:var(--line,#d9dce1)}",
    ".m-match .mm-svg{cursor:pointer}",
    ".m-match .mm-sel{display:block;font-size:.85rem;margin:6px 0 0}",
    ".m-match .mm-sel select{font:inherit;max-width:100%;min-height:44px;padding:4px 8px;margin:2px 0 0;display:block}",
    ".m-match .mm-mark{margin:6px 0 0;font-size:.9rem}",
    ".m-match .mm-link{font-size:.8rem;margin:2px 0 0}",
    ".m-match .mm-result{font-size:1rem;margin:10px 0 4px}",
    ".m-match .mm-who{margin:6px 0;padding-left:1.2em;font-size:.88rem}",
    ".m-match table.mm-facts{width:100%;table-layout:fixed;font-size:.82rem;margin:6px 0}",
    ".m-match table.mm-facts th,.m-match table.mm-facts td{padding:4px 5px;overflow-wrap:break-word;vertical-align:top}",
    ".m-match table.mm-facts td{text-align:right;font-weight:600}",
    ".m-match table.mm-facts thead th{text-align:right;white-space:nowrap}",
    ".m-match table.mm-facts tbody th{font-weight:400;color:var(--muted,#4b5563)}",
  ].join("\n");

  function css() {
    if (document.getElementById("css-" + ID)) return;
    var st = document.createElement("style");
    st.id = "css-" + ID;
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // the color key, in Jake's words (2026-10-11: "just say Red - better than league average / Blue - worse than league
  // average"; it replaces the longer "How to read a map" paragraph)
  function key() {
    return '<b class="r">Red</b> - better than league average<br><b class="b">Blue</b> - worse than league average';
  }

  function round(el, rng, done) {
    css();
    var pinned = pin;                              // a setHard() level, while it lasts (see pin, above)
    var cur = pinned ? pinned.n : level;           // this round's level: the number of maps
    // every random choice is made here, up front, so changing the level never draws again and one seed always gives
    // the same round at each level
    var years = Object.keys(G.seasons).sort(), y = SM.pick(rng, years), D = G.seasons[y];
    var trio = SM.sample(rng, D.players, 4).map(function (P) { return { y: y, s: D.s, P: P, D: D }; });
    var lay = { 2: { maps: SM.shuffle(rng, [0, 1]), names: SM.shuffle(rng, [0, 1]) },
                3: { maps: SM.shuffle(rng, [0, 1, 2]), names: SM.shuffle(rng, [0, 1, 2]) },
                4: { maps: SM.shuffle(rng, [0, 1, 2, 3]), names: SM.shuffle(rng, [0, 1, 2, 3]) } };
    // lay[n].maps[k] = which of trio is drawn on Map k+1 (the key); lay[n].names[j] = which of trio is name button j

    var root = SM.h("div", { class: "m-" + ID });
    el.appendChild(root);
    var answered = false, reported = false, n, L, assign, armed;
    var names, caps, sels, labs, cards, mapsBox, hint, checkBtn, out;

    // the RULES box, shortened by /humanize on 2026-10-10 (replaces the "Draft rule" scoring line). How the answer
    // table counts is not a rule of play, so it stays under the table (mm-note), where it is read.
    root.appendChild(SM.rules([
      "1 point when every map has the right name. Some right earns nothing.",
      "Easy has 2 maps, Medium 3, Hard 4."
    ]));
    var head = SM.h("p", { class: "mm-head" });
    root.appendChild(head);
    var toggle = SM.h("div", { class: "mm-hard" + (pinned ? " mm-locked" : ""), role: "group", "aria-label": "Level" });
    var lvBtns = LEVELS.map(function (lv) {
      var b = SM.button(lv[1] + " (" + lv[0] + " maps)", "mm-lv", function () {
        if (answered || pinned || cur === lv[0]) return;
        level = cur = lv[0]; build();
      });
      b.setAttribute("data-n", String(lv[0]));
      b.disabled = !!pinned;
      toggle.appendChild(b);
      return b;
    });
    root.appendChild(toggle);
    if (pinned) root.appendChild(SM.h("p", { class: "mm-pin" }, "This round has " + WORDS[cur]
      + " maps for everyone, so it is " + levelName(cur) + " here."));
    if (y === SHORT_YEAR) root.appendChild(SM.h("p", { class: "mm-era" }, "In " + SM.esc(D.s)
      + " the three-point line was closer to the basket than the arc drawn on these maps."));
    root.appendChild(SM.h("p", { class: "mm-key" }, key()));
    var board = SM.h("div");
    root.appendChild(board);

    function nm(i) { return trio[i].P.n; }

    function build() {
      n = cur; L = lay[n]; armed = -1;
      lvBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-n") === n)); });
      assign = []; for (var k = 0; k < n; k++) assign.push(-1);
      head.innerHTML = "<b>" + SM.esc(D.s) + "</b>: " + WORDS[n]
        + " of that season's top 20 scorers by points per game. Which map is which?";
      board.innerHTML = "";
      var nb = SM.h("div", { class: "mm-names", role: "group", "aria-label": "Names" });
      names = L.names.map(function (i) {
        // each name in its team's colors, with the logo (Jake, 2026-10-11)
        var b = SM.teamButton(SM.button(nm(i), "mm-name", function () { if (answered) return; armed = armed === i ? -1 : i; refresh(); }), trio[i]);
        b.setAttribute("aria-pressed", "false");
        b.setAttribute("data-i", String(i));
        nb.appendChild(b);
        return b;
      });
      board.appendChild(nb);
      hint = SM.h("p", { class: "mm-hint", "aria-live": "polite" });
      board.appendChild(hint);
      mapsBox = SM.h("div", { class: "mm-maps mm-n" + n });
      caps = []; sels = []; labs = []; cards = [];
      for (var m = 0; m < n; m++) (function (k) {
        var card = SM.h("div", { class: "mm-card" });
        var cap = SM.button("Map " + (k + 1), "ghost mm-cap", function () { place(k); });
        var pic = SM.h("div", { class: "mm-svg" }, SM.map(trio[L.maps[k]], { label: "Map " + (k + 1) }));
        pic.addEventListener("click", function () { place(k); });
        var lab = SM.h("label", { class: "mm-sel" }), sel = SM.h("select");
        lab.appendChild(document.createTextNode("Who is Map " + (k + 1) + "?"));
        sel.appendChild(SM.h("option", { value: "" }, "Choose a name"));
        L.names.forEach(function (i) { sel.appendChild(SM.h("option", { value: String(i) }, SM.esc(nm(i)))); });
        sel.addEventListener("change", function () { if (answered) return; set(k, sel.value === "" ? -1 : +sel.value); });
        lab.appendChild(sel);
        card.appendChild(cap); card.appendChild(pic); card.appendChild(lab);
        mapsBox.appendChild(card);
        caps.push(cap); sels.push(sel); labs.push(lab); cards.push(card);
      })(m);
      board.appendChild(mapsBox);
      var bar = SM.h("div", { class: "gbar" });
      checkBtn = SM.button("Check", "mm-check", check);
      bar.appendChild(checkBtn);
      board.appendChild(bar);
      out = SM.h("div", { class: "mm-out" });
      board.appendChild(out);
      refresh();
    }

    // put name i on map k; a name already on another map moves there in exchange, so no name is ever on two maps
    function set(k, i) {
      if (i < 0) assign[k] = -1;
      else { var j = assign.indexOf(i); if (j >= 0 && j !== k) assign[j] = assign[k]; assign[k] = i; }
      armed = -1;
      refresh();
    }
    function place(k) {
      if (answered) return;
      if (armed < 0) { hint.textContent = "Choose a name first, then its map."; return; }
      set(k, armed);
    }
    function ready() {
      for (var k = 0; k < n; k++) { if (assign[k] < 0) return false; for (var j = 0; j < k; j++) if (assign[j] === assign[k]) return false; }
      return true;
    }
    function refresh() {
      for (var k = 0; k < n; k++) {
        // while a name is chosen, every caption repeats where it will go, so the hint is in view at every map on a phone
        // an empty map's caption is just its number (Jake, 2026-10-10: "Dont say no name yet"); the menu under it asks
        caps[k].textContent = "Map " + (k + 1) + (armed >= 0 ? ": put " + nm(armed) + " here"
          : assign[k] >= 0 ? ": " + nm(assign[k]) : "");
        sels[k].value = assign[k] >= 0 ? String(assign[k]) : "";
      }
      names.forEach(function (b, j) {
        var i = L.names[j], at = assign.indexOf(i);
        SM.setLabel(b, nm(i) + (at >= 0 ? " (Map " + (at + 1) + ")" : ""));
        b.setAttribute("aria-pressed", armed === i ? "true" : "false");
      });
      mapsBox.className = "mm-maps mm-n" + n + (armed >= 0 ? " mm-armed" : "");
      hint.textContent = armed >= 0 ? "Now tap or press the map for " + nm(armed) + "." : ready() ? "Every map has a name. Press Check." : "";
      checkBtn.disabled = !ready();
    }

    function check() {
      if (answered || !ready()) return;
      answered = true;
      var right = 0, parts = [];
      lvBtns.forEach(function (b) { b.disabled = true; });
      checkBtn.disabled = true;
      mapsBox.className = "mm-maps mm-n" + n;
      // each name button now says which map is truly that player's, so no guess is left on screen as a statement
      names.forEach(function (b, j) {
        var i = L.names[j];
        b.disabled = true; b.setAttribute("aria-pressed", "false");
        SM.setLabel(b, nm(i) + " is Map " + (L.maps.indexOf(i) + 1));
      });
      for (var k = 0; k < n; k++) {
        var truth = trio[L.maps[k]], ok = assign[k] === L.maps[k];
        if (ok) right += 1;
        caps[k].disabled = true;
        caps[k].textContent = "Map " + (k + 1) + " is " + truth.P.n;
        // the menu held the guess; it goes, and the mark line in its place names the guess as a guess
        cards[k].replaceChild(SM.h("p", { class: "mm-mark" }, ok ? '<span class="ok">Right.</span>'
          : '<span class="no">Wrong.</span> Your pick: ' + SM.esc(nm(assign[k])) + "."), labs[k]);
        cards[k].appendChild(SM.h("p", { class: "mm-link" }, '<a href="' + SITE + "player-" + encodeURIComponent(truth.P.p) + ".html#s-" + y
          + '" target="_blank" rel="noopener">' + SM.esc(truth.P.n) + ", " + SM.esc(D.s) + ", on the site</a>"));
        parts.push("Map " + (k + 1) + " " + truth.P.n + (ok ? " right" : " wrong (you said " + nm(assign[k]) + ")"));
      }
      hint.textContent = "";
      var correct = right === n ? 1 : 0;
      out.appendChild(SM.h("p", { class: "mm-result" }, correct ? '<span class="ok">Right: every map matched.</span>'
        : '<span class="no">Not this time: ' + right + " of " + n + " maps right.</span>"));
      // the facts that tell the maps apart, in map order; the names sit in a list above the table, so a narrow column
      // never has to break a long name
      var shownOrder = []; for (var m = 0; m < n; m++) shownOrder.push(trio[L.maps[m]]);
      var zs = shownOrder.map(zones);
      out.appendChild(SM.h("ul", { class: "mm-who" }, shownOrder.map(function (e, m) {
        return "<li>Map " + (m + 1) + ": " + SM.esc(e.P.n) + "</li>"; }).join("")));
      var t = '<table class="mm-facts"><thead><tr><th scope="col"></th>' + shownOrder.map(function (e, m) {
        return '<th scope="col">Map ' + (m + 1) + "</th>"; }).join("") + "</tr></thead><tbody>";
      FACTS.forEach(function (f) {
        t += '<tr data-k="' + f[0] + '"><th scope="row">' + f[1] + "</th>"
          + shownOrder.map(function (e, m) { return "<td>" + f[2](e, zs[m]) + "</td>"; }).join("") + "</tr>";
      });
      out.appendChild(SM.h("div", { class: "mm-tbl" }, t + "</tbody></table>"));
      out.appendChild(SM.h("p", { class: "mm-note" }, "At the rim is the one " + Q.w + " ft hexagon on the basket, not the "
        + "4 ft restricted area. Threes are estimated: a hexagon counts when its center is past the line or under 1 ft inside it"
        + (y === SHORT_YEAR ? " (in " + SM.esc(D.s) + ", over " + SHORT_R + " ft from the rim)" : "")
        + ". Shares count shots drawn on the map, out to " + Q.ymax + " ft from the baseline."));
      if (!reported) { reported = true; done({ correct: correct, total: 1, detail: D.s + ": " + parts.join("; ") }); }
    }

    build();
  }

  function setLevel(n) {
    var mine = pin = { n: n === 3 || n === 4 ? n : 2 };
    Promise.resolve().then(function () { if (pin === mine) pin = null; });
  }

  SM.register({
    id: ID,
    title: "Map Match",
    blurb: "Maps from one season and the names that go with them. Put each name on its map. Easy has two maps, Medium three, Hard four.",
    round: round,
    // for daily.js: the level of every round drawn before the next microtask, with the level buttons hidden and
    // disabled in them, so everyone gets the same puzzle. The Practice tab's own choice is left as it was.
    setLevel: setLevel,
    setHard: function (on) { setLevel(on ? 3 : 2); },
  });
})();
