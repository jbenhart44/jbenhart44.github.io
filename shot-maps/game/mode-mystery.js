// Mode "Guess the Hooper" (id mystery; it was "Mystery Stat Line" until Jake renamed it 2026-10-10) for the Shot Maps
// game mockups. Reads window.GAME through shared.js (SM).
//
// One round: rng picks a season, then four different players from that season's top 50 (20 until 2026-10-14), then which of the four is
// the mystery. The page shows a closed RULES box, the season and the mystery's stat line (the nine stats in LINE, a ""
// value skipped), with the name hidden, then the mystery's shot map, unnamed, then four name buttons. The map is always
// shown (Jake, 2026-10-10: "always give the map for the gues the player"): right = 2, wrong = 0; total is always 2.
// The reveal puts all four stat lines side by side (rows = the stats shown, columns = the four names in button order),
// marks the mystery's column and, after a wrong answer, the picked column, and draws the mystery's map with its name.
//
// Every number on screen is a GAME string, printed as is. Nothing here computes a statistic. GAME is read, never
// written. Test: tests/js/mockups/test_mystery.mjs
(function () {
  var G = window.GAME, ID = "mystery", TOTAL = 2;
  // the stat line, in this order (spec 2026-10-08): PPG, FG%, 3P%, FGA, TS%, USG%, PER, WS, BPM
  var LINE = ["ppg", "fg_pct", "fg3_pct", "fga_per_g", "ts_pct", "usg_pct", "per", "ws", "bpm"];
  // The site's own map legend, byte for byte: build_site.py view_controls() as the live pages print it. The color line
  // is identical on all 30 season pages and the player pages; the size line is POOL_CAVEAT (build_site.py:93), which
  // the player pages print right under it (checked 2026-10-08 against jbenhart44.github.io/shot-maps/2024.html and
  // player-101115.html). The test compares this string to a live page.
  // One change from the site's markup (Jake, 2026-10-10: "make this scale all be on one line"): the seven swatches sit
  // in one <span class="scale">, which index.html keeps on a single row. Strip that wrapper and the string is the site's.
  // Since 2026-10-21 the heading sits in its own paragraph above the scale, as build_site.league_key prints it (Jake,
  // 2026-10-18, "one key everywhere"). The size line under it is still this game's own.
  var LEGEND = '<p class="scale-h">Percentage points above or below league average</p><p class="legend">'
    + '<span class="scale"><span style="background:#4761ad">-15%</span><span style="background:#667bb9">-10%</span>'
    + '<span style="background:#8e9dc9">-5%</span><span style="background:#f0f0f0">+0%</span>'
    + '<span style="background:#d96f80">+5%</span><span style="background:#cf3952">+10%</span>'
    + '<span style="background:#c8102e">+15%</span></span></p>'
    + '<p class="legend">Size is about attempts and color is about efficiency.</p>';

  var CSS = [
    ".m-mystery .mq{margin:0 0 4px;font-weight:600}",
    ".m-mystery .mq .ssn{display:inline-block;background:var(--blue,#1D428A);color:#fff;border-radius:4px;padding:0 7px;margin-right:6px;font-size:.85rem}",
    ".m-mystery .mline{grid-template-columns:repeat(3,minmax(0,1fr));max-width:420px}",
    ".m-mystery .mline{margin-bottom:10px}",
    ".m-mystery .mopts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-width:620px}",
    ".m-mystery .mopts .gbtn{width:100%;white-space:normal;overflow-wrap:anywhere;text-align:left;justify-content:flex-start;line-height:1.3}",
    ".m-mystery .mopts .gbtn:disabled{opacity:.45}",
    // a phone: a tighter stat line, so the shot map starts on the first screen (council 2026-10-11)
    "@media (max-width:640px){.m-mystery .mline{gap:4px;margin:6px 0 8px}.m-mystery .mline .bc-cell{padding:3px 4px}"
      + ".m-mystery .mline .bc-cell b{font-size:1rem}.m-mystery .mline .bc-cell small{font-size:.66rem}}",
    ".m-mystery .mopts .gbtn.is-key{opacity:1;background:#dcfce7;border-color:#166534;color:#14532d}",
    ".m-mystery .mopts .gbtn.is-wrong{opacity:1;background:#fee2e2;border-color:#C8102E;color:#7f1d1d}",
    ".m-mystery .mapbox{max-width:520px;margin:10px 0 0}",
    ".m-mystery .hintmap{margin:0 0 10px}",
    ".m-mystery .mapbox figure{margin:0}",
    ".m-mystery .mapbox figure:focus{outline:none}",
    ".m-mystery .mapbox figure:focus-visible{outline:2px solid var(--blue,#1D428A);outline-offset:2px}",
    ".m-mystery .mapbox figcaption{font-size:.82rem;font-weight:600;color:var(--ink,#111827);margin:0 0 4px}",
    ".m-mystery .mapbox .legend{margin:6px 0 0;font-size:.82rem}",
    ".m-mystery .verdict{font-size:1rem;margin:12px 0 6px;max-width:620px}",
    ".m-mystery .verdict:focus{outline:2px solid var(--blue,#1D428A);outline-offset:2px}",
    // auto layout: a column is never narrower than its longest word, so a name breaks only at a space or a hyphen; a
    // round too wide for a phone scrolls inside .mtbl, never the page
    ".m-mystery .mtbl{max-width:620px;overflow-x:auto}",
    ".m-mystery table.mt{border-collapse:collapse;width:100%;font-size:.8rem}",
    ".m-mystery table.mt caption{text-align:left;font-size:.78rem;color:var(--muted,#4b5563);padding:0 0 4px}",
    ".m-mystery table.mt th,.m-mystery table.mt td{padding:4px 3px;text-align:right;vertical-align:bottom;overflow-wrap:normal;word-break:normal}",
    ".m-mystery table.mt thead th{font-size:.72rem;line-height:1.25;-webkit-hyphens:manual;hyphens:manual}",
    ".m-mystery table.mt th[scope=row],.m-mystery table.mt thead th:first-child{text-align:left;width:3.7em;color:var(--muted,#4b5563);white-space:nowrap}",
    ".m-mystery table.mt td{font-weight:700}",
    ".m-mystery table.mt td.na{font-weight:400;color:var(--muted,#4b5563)}",
    ".m-mystery table.mt .mys{background:#fef3c7}",
    ".m-mystery table.mt thead th.you{background:#fee2e2}",
    ".m-mystery table.mt .tag{display:block;font-size:.66rem;font-weight:700;letter-spacing:.02em;color:var(--red,#C8102E)}",
    ".m-mystery table.mt .tag.you{color:#7f1d1d;font-style:italic}",
    // a phone: smaller headers and cells, so a round with a long surname fits more often without the sideways scroll
    "@media (max-width:400px){.m-mystery table.mt thead th{font-size:.66rem}.m-mystery table.mt th,.m-mystery table.mt td{padding:4px 2px}"
      + ".m-mystery table.mt td{font-size:.76rem}.m-mystery table.mt th[scope=row],.m-mystery table.mt thead th:first-child{width:auto}}",
    ".m-mystery .draft{font-size:.78rem;color:var(--muted,#4b5563);margin:12px 0 0}"
  ].join("\n");

  function css() {
    if (document.getElementById("css-" + ID)) return;
    var s = document.createElement("style");
    s.id = "css-" + ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function has(v) { return v != null && v !== ""; }
  // the stats this player's line shows: the nine, minus any the site has no value for
  function shown(P) { return LINE.filter(function (k) { return has(P.stats[k]); }); }
  // one stat cell, the site's baseball-card markup (build_site.stat_link) without the link; the league figure where
  // the season has one
  function cell(k, v, lg) {
    return '<div class="bc-cell" data-k="' + k + '"><span class="ab">' + SM.esc(SM.label(k)) + "</span><b>" + SM.esc(v) + "</b>"
      + (has(lg) ? '<span class="lg">League ' + SM.esc(lg) + "</span>" : "") + "</div>";
  }

  SM.register({
    id: ID,
    title: "Guess the Hooper",
    // no blurb (Jake, 2026-10-11: "get rid of this"); the round's own question says what to do
    blurb: "",
    round: function (el, rng, done) {
      css();
      // the four names come from one season's players at the level being drawn (SM.level; null = everyone, as before)
      var years = SM.seasonsWith(4), y = SM.pick(rng, years), D = G.seasons[y];
      var four = SM.sample(rng, SM.levelPlayers(D), 4).map(function (P) { return { y: y, s: D.s, P: P, D: D }; });
      var mi = Math.floor(rng() * four.length), M = four[mi], keys = shown(M.P);
      var over = false;

      var root = SM.h("div", { class: "m-" + ID });
      // the rules, closed until opened (Jake, 2026-10-10: "explain this at the top in a collapsable RULES tab")
      root.appendChild(SM.rules(["2 points for the right name, 0 for a wrong one.",
        "The stat line and the shot map are both the mystery player's, from that one season."]));
      // the question (Jake, 2026-10-11: change "Whose stat line is this? It is one of these four top-20 scorers." to
      // "Whos the Hooper?")
      root.appendChild(SM.h("p", { class: "mq" }, '<span class="ssn">' + SM.esc(D.s) + "</span>Who's the Hooper?"));
      root.appendChild(SM.h("div", { class: "bc-grid mline" }, keys.map(function (k) { return cell(k, M.P.stats[k], D.lgavg[k]); }).join("")));

      // the map sits between the stat line and the names; it is not tabbable, so Tab goes from the RULES box to the first name
      var hintbox = SM.h("div", { class: "mapbox hintmap" });
      root.appendChild(hintbox);

      var opts = SM.h("div", { class: "mopts", role: "group", "aria-label": "Pick the player" });
      // each name in its team's colors, with the logo (Jake, 2026-10-11)
      var btns = four.map(function (e, i) { var b = SM.teamButton(SM.button(e.P.n, "", function () { answer(i); }), e); opts.appendChild(b); return b; });
      root.appendChild(opts);

      var reveal = SM.h("div", { class: "reveal" });
      var mapbox = SM.h("div", { class: "mapbox" });
      root.appendChild(reveal);
      root.appendChild(mapbox);
      el.appendChild(root);

      // tabindex -1: focus can be moved here by the script (which scrolls it into view), but Tab never stops here
      // href: after the answer, the caption links the player's map on the site (plan 2026-10-20_173559, Phase 1)
      function figure(caption, svg, href) {
        var c = href ? SM.link(href, SM.esc(caption)) : SM.esc(caption);
        return '<figure tabindex="-1"><figcaption>' + c + "</figcaption>" + svg + LEGEND + "</figure>";
      }

      // the label names no one: the map is a clue, not the answer
      hintbox.innerHTML = figure("Mystery player's shot map, " + D.s, SM.map(M, { label: "Mystery player's shot map, " + D.s }));

      function answer(i) {
        if (over) return;
        over = true;
        var right = i === mi, pts = right ? TOTAL : 0;
        btns.forEach(function (b, j) {
          b.disabled = true;
          if (j === mi) b.classList.add("is-key");
          else if (j === i) b.classList.add("is-wrong");
        });
        hintbox.innerHTML = ""; // the reveal draws the map again, named, under the table

        var who = SM.esc(M.P.n);
        var verdict = right
          ? '<span class="ok">Right.</span> The stat line is ' + who + "'s, " + SM.esc(D.s) + ". 2 points."
          : '<span class="no">Not this one.</span> You picked ' + SM.esc(four[i].P.n) + ". The stat line is " + who + "'s, "
            + SM.esc(D.s) + ". 0 points.";

        // the mystery's column is shaded and tagged; after a wrong answer the picked column gets its own tag and header
        // color, so the two can be compared without hunting for the name
        var head = '<tr><th scope="col">Stat</th>' + four.map(function (e, j) {
          var mine = !right && j === i;
          return "<th scope=\"col\"" + (j === mi ? ' class="mys"' : mine ? ' class="you"' : "") + ">" + SM.esc(e.P.n)
            + (j === mi ? ' <span class="tag">Mystery</span>' : "") + (mine ? ' <span class="tag you">Your pick</span>' : "") + "</th>";
        }).join("") + "</tr>";
        var body = keys.map(function (k) {
          return '<tr><th scope="row">' + SM.esc(SM.label(k)) + "</th>" + four.map(function (e, j) {
            var v = e.P.stats[k], cls = [j === mi ? "mys" : "", has(v) ? "" : "na"].filter(Boolean).join(" ");
            return "<td" + (cls ? ' class="' + cls + '"' : "") + ">" + (has(v) ? SM.esc(v) : "n/a") + "</td>";
          }).join("") + "</tr>";
        }).join("");

        reveal.innerHTML = '<p class="verdict" tabindex="-1">' + verdict + "</p>"
          + '<div class="mtbl"><table class="mt"><caption>All four stat lines, ' + SM.esc(D.s)
          + ". The column marked Mystery is the answer." + (right ? "" : " The column marked Your pick is the name you chose.")
          + " Check any number on the site's " + SM.link(SM.SITE + encodeURIComponent(y) + ".html", SM.esc(D.s) + " page") + ".</caption>"
          + "<thead>" + head + "</thead><tbody>" + body + "</tbody></table></div>";
        mapbox.innerHTML = figure(M.P.n + "'s shot map, " + D.s, SM.map(M, { label: M.P.n + "'s shot map, " + D.s }), SM.mapHref(M));
        var v = reveal.querySelector(".verdict");
        if (v && v.focus) v.focus();

        done({ correct: pts, total: TOTAL, detail: { season: D.s, mystery: M.P.n, picked: four[i].P.n } });
      }
    }
  });
})();
