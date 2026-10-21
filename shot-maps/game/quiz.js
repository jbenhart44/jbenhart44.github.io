// The Quiz tab (plan pcvplans/research_runs/2026-10-20_173559, Phase 3). Not a registered mode: like the Daily, it runs
// the four games' own round() in a fixed order. Sets SM.quiz.
//
// Jake, 2026-10-21, answering the plan's owner questions:
//   - "Re-cut within each era": with an era chosen, a player's level is his third of that era's players by Wikipedia
//     page views (P.le, build_game_mockups.era_levels); with All eras it is the site-wide level (P.lv), as the practice
//     games draw it
//   - "Quiz tab only": the era choice lives here and nowhere else; the practice games and the Daily never see it
//   - "8 rounds, raw points": two rounds of each game, scored as each game scores; the score is the points added up, out
//     of the points the eight rounds offered (Head to Head's total varies with the stats it can ask)
//   - "have the quiz added but i can play it later"
// The rule, as built (the assistant's formulation of Jake's answers; its wording is his to rewrite):
//   return:      one visitor's quiz: eight rounds and their points, out of the points they offered
//   subject to:  (a) era: every player-season shown is from the chosen era, or any season under All eras
//                (b) level: every player-season shown is at the chosen level within that era (site-wide under All eras)
//                (c) no repeats: no player-season is shown twice in one quiz
//                (d) order: Head to Head, Hot Spot, Guess the Hooper, Map Match, then the same again
//                (e) the Daily and the practice games are unchanged
//                (f) nothing about a quiz leaves the device, and nothing is stored
//   assumptions: (a) a visitor who picks Hard wants the less-known players of that era
//                (b) the games' points, added up, are a fair score for the quiz
// No repeats is a guarantee, not a best effort: before each round the player-seasons already shown are taken out of the
// pool (shared.js SM.avoid), so a game cannot draw them. A round with nothing left to draw scores 0 of 0 and says so,
// as a Daily round that cannot be drawn does. tests/js/mockups/test_quiz.mjs; tests/browser/play_games.py G10.
(function () {
  var SM = window.SM;
  var ORDER = ["h2h", "spot", "mystery", "match", "h2h", "spot", "mystery", "match"];
  var ALL = "All eras";

  function find(id) { for (var i = 0; i < SM.modes.length; i++) if (SM.modes[i].id === id) return SM.modes[i]; return null; }

  // a quiz: its seed, era (null = All eras), level, and the player-seasons it has shown
  function start(seed, era, level) { return { seed: String(seed), era: era || null, level: level || null, avoid: {}, shown: [] }; }

  // Draw round i of quiz q into el. The era, level and no-repeat filters are on only while the round draws, and are put
  // back however the draw ends, so nothing else on the page ever sees them. Returns {shows, error}.
  function round(el, q, i, done) {
    // Map Match is not pinned (the Daily pins it to two maps with setHard), so it draws its 2 to 4 maps, as in practice
    var m = find(ORDER[i]), keep = [SM.level, SM.era, SM.avoid];
    SM.level = q.level; SM.era = q.era; SM.avoid = q.avoid;
    var error = null;
    try { m.round(el, SM.rng(q.seed + ":" + i), done); } catch (e) { error = String(e && e.message || e); }
    finally { SM.level = keep[0]; SM.era = keep[1]; SM.avoid = keep[2]; }
    var shows = error ? [] : SM.daily.who(el);
    if (!error && !shows.length) error = "nothing left to draw";
    shows.forEach(function (k) { q.avoid[k] = 1; if (q.shown.indexOf(k) < 0) q.shown.push(k); });
    return { shows: shows, error: error };
  }

  function css() {
    if (document.getElementById("css-quiz")) return;
    var s = document.createElement("style");
    s.id = "css-quiz";
    s.textContent = [
      ".m-quiz{max-width:760px}",
      ".m-quiz .qera{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0 12px;font-size:.9rem}",
      ".m-quiz .qera .qlab{font-weight:700;margin-right:2px}",
      ".m-quiz .qera button{border:1px solid #1D428A;background:#fff;color:#1D428A;border-radius:6px;padding:5px 10px;font-weight:600;cursor:pointer;font-size:.86rem;min-height:32px}",
      ".m-quiz .qera button[aria-pressed=\"true\"]{background:#1D428A;color:#fff}",
      ".m-quiz .qera button:focus-visible{outline:2px solid #1D428A;outline-offset:2px}",
      ".m-quiz .qround{font-weight:700;margin:0 0 6px;scroll-margin-top:8px}",
      ".m-quiz .qround:focus{outline:none}",
      ".m-quiz .qbig{font-size:1.15rem;margin:4px 0 10px}",
      ".m-quiz .qerr{color:#C8102E;font-weight:600}",
      ".m-quiz table{width:100%;border-collapse:collapse;font-size:.88rem;margin:4px 0 8px}",
      ".m-quiz td,.m-quiz th{padding:4px 6px;border-bottom:1px solid var(--line,#d9dce1);text-align:left}",
      ".m-quiz td.n,.m-quiz th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}",
      ".m-quiz ul.qwho{margin:4px 0 10px;padding-left:1.2em;font-size:.9rem}",
      ".m-quiz .gbar .gbtn{min-height:40px}"
    ].join("\n");
    document.head.appendChild(s);
  }

  var TITLES = { h2h: "Head to Head", spot: "Hot Spot", mystery: "Guess the Hooper", match: "Map Match" };
  function name(key) {
    var i = key.lastIndexOf("-"), p = key.slice(0, i), y = key.slice(i + 1), D = window.GAME.seasons[y];
    for (var j = 0; j < D.players.length; j++) if (String(D.players[j].p) === p) return { y: y, s: D.s, P: D.players[j] };
    return null;
  }

  // --- screens ---
  // One quiz lives on this page: leaving the Quiz tab and coming back finds it where it was (PACE
  // pace_2026-10-21_124318: a tap on another tab used to throw away the rounds played, the score and the era). The
  // Players bar is hidden while a quiz runs, as on the Daily: tapping it then changed nothing and read as if it had.
  var live = null, playing = false;
  function levelBar(hide) { var b = document.getElementById("levels"); if (b) b.hidden = hide; }
  function mount(el) {
    css();
    el.innerHTML = "";
    if (!live) { live = SM.h("div", { class: "m-quiz" }); startScreen(live); }
    el.appendChild(live);
    levelBar(playing);
  }

  function startScreen(root) {
    playing = false; levelBar(false);
    root.innerHTML = "";
    var era = null;
    root.appendChild(SM.rules(["Eight rounds: two each of Head to Head, Hot Spot, Guess the Hooper and Map Match.",
      // the levels are not defined here (Jake, 2026-10-21: "get rid of the definitnions for easy to hard on all of the games")
      "Every player is from the era you pick, at the level picked above.",
      "Each round scores as its game does. Your score is the points added up.",
      "No player-season appears twice in one quiz."]));
    var bar = SM.h("div", { class: "qera", role: "group", "aria-label": "Era" });
    bar.appendChild(SM.h("span", { class: "qlab" }, "Era:"));
    var btns = [ALL].concat(SM.ERAS).map(function (e) {
      var b = SM.h("button", { type: "button", "aria-pressed": String(e === ALL) });
      b.textContent = e;
      b.addEventListener("click", function () {
        era = e === ALL ? null : e;
        btns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      });
      bar.appendChild(b);
      return b;
    });
    root.appendChild(bar);
    var go = SM.button("Start quiz", "", function () {
      play(root, start("shotmaps-quiz:" + Date.now() + ":" + Math.random(), era, SM.level));
    });
    var gb = SM.h("div", { class: "gbar" });
    gb.appendChild(go);
    root.appendChild(gb);
  }

  function play(root, q) {
    playing = true; levelBar(true);
    root.innerHTML = "";
    var k = 0, results = [];
    var lab = SM.h("p", { class: "qround", tabindex: "-1" });
    var host = SM.h("div", { class: "qhost" });
    var bar = SM.h("div", { class: "gbar" }), pts = SM.h("span", { class: "gscore" });
    var next = SM.button("Next round", "", advance);
    bar.appendChild(pts); bar.appendChild(next);
    root.appendChild(lab); root.appendChild(host); root.appendChild(bar);
    function showPoints() {
      var c = 0, t = 0;
      results.forEach(function (r) { c += r.correct; t += r.total; });
      pts.textContent = "Points: " + c + " of " + t;
    }
    function runRound() {
      host.innerHTML = "";
      next.disabled = true;
      next.textContent = k === ORDER.length - 1 ? "See results" : "Next round";   // the Daily's words for its last round
      lab.textContent = "Round " + (k + 1) + " of " + ORDER.length + " · " + (q.era || ALL) + " · " + SM.levelName(q.level);
      var el = SM.h("div", { class: "round" });
      host.appendChild(el);
      var said = false;
      function done(res) {
        if (said) return;
        said = true;
        results.push({ id: ORDER[k], correct: res.correct, total: res.total });
        showPoints();
        next.disabled = false;
      }
      var r = round(el, q, k, done);
      if (r.error) {
        el.appendChild(SM.h("p", { class: "qerr" }, "This round could not be drawn (" + SM.esc(r.error) + "), so it scores 0 of 0."));
        done({ correct: 0, total: 0 });
      }
    }
    function advance() {
      if (k < ORDER.length - 1) { k += 1; runRound(); SM.toHeading(lab); }
      else endScreen(root, q, results);
    }
    showPoints();
    runRound();
  }

  function endScreen(root, q, results) {
    playing = false; levelBar(false);
    root.innerHTML = "";
    var c = 0, t = 0;
    results.forEach(function (r) { c += r.correct; t += r.total; });
    root.appendChild(SM.h("p", { class: "qbig", tabindex: "-1" }, "<b>" + c + " of " + t + " points</b> · " + SM.esc(q.era || ALL)
      + " · " + SM.esc(SM.levelName(q.level))));
    root.appendChild(SM.h("table", null, "<thead><tr><th>Round</th><th>Game</th><th class=\"n\">Points</th></tr></thead><tbody>"
      + results.map(function (r, i) {
        return "<tr><td>" + (i + 1) + "</td><td>" + SM.esc(TITLES[r.id] || r.id) + "</td><td class=\"n\">" + r.correct + " of " + r.total + "</td></tr>";
      }).join("") + "<tr class=\"qsum\"><td></td><td>Total</td><td class=\"n\">" + c + " of " + t + "</td></tr></tbody>"));
    root.appendChild(SM.h("p", null, "Every player in this quiz, on the site:"));
    root.appendChild(SM.h("ul", { class: "qwho" }, q.shown.map(function (key) {
      var e = name(key);
      return e ? "<li>" + SM.link(SM.mapHref(e), SM.esc(SM.name(e))) + "</li>" : "";
    }).join("")));
    var gb = SM.h("div", { class: "gbar" });
    gb.appendChild(SM.button("New quiz", "", function () {
      startScreen(root);
      // back to the top of the quiz, with focus on the era picked (PACE 2026-10-21 revision review: it left both behind)
      SM.toHeading(root.querySelector('.qera button[aria-pressed="true"]') || root);
    }));
    root.appendChild(gb);
    var big = root.querySelector(".qbig");
    SM.toHeading(big);           // in view in WebKit too (PACE 2026-10-21 revision review)
  }

  SM.quiz = { ORDER: ORDER, start: start, round: round, mount: mount };
})();
