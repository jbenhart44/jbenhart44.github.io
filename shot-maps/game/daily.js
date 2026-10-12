// Daily Challenge for the Shot Maps game mockups. Not a registered mode: it runs the registered modes' own round()
// in a fixed order, each with a generator seeded from the date, so everyone who plays on the same date gets the same
// five rounds. Sets SM.daily = {mount(el)}.
//
// Rules Jake decided on 2026-10-08 (pcvplans/research_runs/2026-10-08_102700/owner_decisions.md), stated on the start
// screen as "Rule:" lines (the rest are still "Draft rule:"):
//   D-D  "today" is the US Eastern date, for everyone. SM.today() gives it; it seeds the puzzle, numbers it (days since
//        2026-10-08, counted on Eastern dates) and dates the stored result. A screen left open across midnight still
//        shows the day it opened on, so every button that starts or resumes a puzzle (Start, Resume, Play again) reads
//        SM.today() again first and, when the date has moved, shows the new day's screen instead (see moved()).
//        NOT decided, so stated on the start screen as a "Draft rule:": a puzzle being played at midnight is finished
//        and counts for the day it started; a puzzle left unfinished cannot be picked up after midnight.
//   D-E  was "points first, time breaks ties"; Jake, 2026-10-10: "get rid of the timer". There is no clock: a result
//        is its points. Results stored before that may still carry an ms field; it is read past and never shown.
//
// It computes no statistic. Every score it shows is a sum of the rounds' own reported {correct, total}, so the maximum
// is the sum of the five rounds' reported totals (Head to Head's varies from round to round), and the end screen lists
// each round's figures so the sum can be checked by eye. Results are kept on this device only, in localStorage, and
// every storage access is guarded so the page works when the browser refuses storage (then nothing is kept, and the
// page says so).
//
//   "shotmaps-daily"      {date, points, max}  the latest scored result
//   "shotmaps-daily-log"  [{date, points, max}, ...]  every scored result on this device, one per date
//   "shotmaps-daily-run"  {date, results: [{id, correct, total}, ...]}  today's scored run while it is unfinished
//
// The played-today guard reads all three, every time a screen is chosen (on mount, and again when Start or Resume is
// pressed, because another tab may have moved on since this screen opened). The first scored result saved for a date
// is the one kept. A run left unfinished is resumed, never restarted.
(function () {
  var SM = window.SM;
  var ORDER = ["h2h", "spot", "mystery", "match", "h2h"];
  // What one round of each game is worth, as the games report it. A number is a fixed total (mode-spot.js total 2,
  // mode-mystery.js TOTAL = 2, mode-match.js total 1). Head to Head asks the card essentials it can (SM.ESSENTIALS; Jake,
  // 2026-10-08, D-B), so its total varies from round to round, up to that many: {upTo: n}. Shown on the start screen
  // so the weights are known before playing; the end screen shows what each round actually reported, and its maximum
  // is their sum. tests/js/mockups/test_daily.mjs compares these with the real games' reports, so a game that changes
  // its scoring turns that test red.
  var WORTH = { h2h: { upTo: SM.ESSENTIALS ? SM.ESSENTIALS.length : null }, spot: 2, mystery: 2, match: 1 };
  var TRIES = 20;                                         // redraws per round to keep the rounds' player-seasons apart
  var EPOCH = Date.UTC(2026, 9, 8);                       // puzzle #1 is 2026-10-08
  var KEY = "shotmaps-daily", LOG = "shotmaps-daily-log", RUN = "shotmaps-daily-run";
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var NOTE = "Mockup: a shared leaderboard needs a small server (for example Cloudflare Pages with a key-value store, "
    + "the setup the NFL picks site uses). This list lives only on this device.";
  // the rule Jake decided (D-D); D-E's clock was removed 2026-10-10
  var MIDNIGHT = "A new puzzle at midnight US Eastern time, the same for everyone.";
  var uid = 0;

  // --- dates, share line ---
  function parts(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d)); return m ? [+m[1], +m[2], +m[3]] : null; }
  // days since 2026-10-08, plus 1, on the date strings SM.today() gives (US Eastern dates); counted on UTC midnights of
  // those strings so a daylight-saving change never shifts the number. A date before 2026-10-08 gives 0 or less: that
  // is a practice puzzle with no number (see mount).
  function puzzleNo(d) { var p = parts(d); return p ? Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - EPOCH) / 86400000) + 1 : null; }
  function longDate(d) { var p = parts(d); return p ? MONTHS[p[1] - 1] + " " + p[2] + ", " + p[0] : String(d); }
  function shareLine(r) { return "Shot Maps Daily #" + puzzleNo(r.date) + ": " + r.points + "/" + r.max; }

  // --- storage: every access in try/catch; a refusal reads as "nothing saved" ---
  function readJSON(k) { try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function writeJSON(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function drop(k) { try { window.localStorage.removeItem(k); return true; } catch (e) { return false; } }
  function storageWorks() { try { window.localStorage.getItem(KEY); return true; } catch (e) { return false; } }
  function isInt(x) { return typeof x === "number" && isFinite(x) && Math.floor(x) === x; }
  // a stored result: a numbered puzzle's date (so a row from before puzzle #1 is never listed as #0 or #-36)
  function valid(r) { return !!r && typeof r === "object" && !!parts(r.date) && puzzleNo(r.date) >= 1 && isInt(r.points) && isInt(r.max) && r.points >= 0 && r.points <= r.max; }
  // this device's scored results, one per date (the first one saved for a date wins, because save() never replaces
  // one), newest first
  function past() {
    var l = readJSON(LOG), seen = {}, out = [];
    (Array.isArray(l) ? l : []).concat([readJSON(KEY)]).forEach(function (r) {
      if (valid(r) && !seen[r.date]) { seen[r.date] = 1; out.push({ date: r.date, points: r.points, max: r.max }); }
    });
    return out.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }
  // the same results, more points first, then the newer date. This list spans puzzles whose maximum differs (14 to 17,
  // from Head to Head), and whether it should rank by raw points or by points of the maximum is NOT decided; it ranks
  // raw points, as the build spec says, and its order line says so without calling the top row "best".
  function ranked() {
    return past().sort(function (a, b) { return (b.points - a.points) || (a.date < b.date ? 1 : a.date > b.date ? -1 : 0); });
  }
  function todays(date) { var l = past(); for (var i = 0; i < l.length; i++) if (l[i].date === date) return l[i]; return null; }
  // "kept" when this device already has a result for the date (a second tab finished first): that one stays
  function save(r) {
    if (todays(r.date)) return "kept";
    var l = past();
    l.push({ date: r.date, points: r.points, max: r.max });
    var a = writeJSON(LOG, l), b = writeJSON(KEY, r);
    return a && b ? "saved" : "failed";
  }
  // today's unfinished scored run, or null
  function runOf(date) {
    var x = readJSON(RUN);
    if (!x || typeof x !== "object" || x.date !== date || !Array.isArray(x.results) || x.results.length >= ORDER.length) return null;
    var ok = x.results.every(function (r, i) { return !!r && r.id === ORDER[i] && isInt(r.correct) && isInt(r.total) && r.correct >= 0 && r.correct <= r.total; });
    return ok ? x : null;
  }
  function writeRun(date, results) {
    return writeJSON(RUN, { date: date, results: results.map(function (x) { return { id: x.id, correct: x.correct, total: x.total }; }) });
  }

  function find(id) { for (var i = 0; i < SM.modes.length; i++) if (SM.modes[i].id === id) return SM.modes[i]; return null; }

  // --- the five rounds' seeds ---
  // Round i is drawn from seed + ":" + i, as the brief says, unless that round would show a player-season that an
  // earlier round already showed (by name, with its stats or its map); then it is drawn again from
  // seed + ":" + i + ":" + b, for b = 1, 2, ..., until it shows none. Everyone still gets the same five rounds that day.
  // After TRIES redraws the brief's seed is used as it is.
  //
  // A round's player-seasons are read from a copy drawn off-page (never answered), through the hooks the games put in
  // their own markup, as "p-y": any element with data-p and data-y (Head to Head's cards), data-left and data-right
  // (Hot Spot), and a season label with the names offered under it (Mystery Stat Line's .ssn and its .mopts buttons,
  // Map Match's .mm-head and its maps' menus). Not the round's whole text: a game's rule line can name a player-season
  // as an example (an earlier Head to Head rule line named Elton Brand 2006-07 in every round). A game without these hooks reads as
  // showing no one and is never redrawn; tests/js/mockups/test_daily.mjs reads every round by its own code and fails
  // if two rounds of one puzzle share a player-season.
  function yearOf(s) { var S = window.GAME.seasons; for (var y in S) if (S[y].s === s) return y; return null; }
  function idOf(y, name) {
    var P = window.GAME.seasons[y].players;
    for (var i = 0; i < P.length; i++) if (P[i].n === name) return P[i].p + "-" + y;
    return null;
  }
  // a hook's value counts only when it names a player-season GAME holds ("p-y"), so an unrelated attribute that
  // happens to share a hook's name (a data-right="1" answer marker, say) is never read as a player
  function real(v) {
    var m = /^(\d+)-(\d{4})$/.exec(String(v)), D = m && window.GAME.seasons[m[2]];
    if (!D) return false;
    for (var i = 0; i < D.players.length; i++) if (String(D.players[i].p) === m[1]) return true;
    return false;
  }
  function who(box) {
    var out = [];
    function add(v) { if (v && real(v) && out.indexOf(v) < 0) out.push(v); }
    function each(sel, fn) { Array.prototype.forEach.call(box.querySelectorAll(sel), fn); }
    each("[data-p][data-y]", function (x) { add(x.getAttribute("data-p") + "-" + x.getAttribute("data-y")); });
    each("[data-left],[data-right]", function (x) { add(x.getAttribute("data-left")); add(x.getAttribute("data-right")); });
    [[".ssn", ".mopts button"], [".mm-head b", ".mm-card option"]].forEach(function (h) {
      var lab = box.querySelector(h[0]), y = lab && yearOf(lab.textContent.trim());
      if (y) each(h[1], function (x) { add(idOf(y, x.textContent.trim())); });
    });
    return out;
  }
  // a game with a difficulty setting (Map Match's setHard) is pinned to its normal level for its next round only, so
  // the pin goes in just before every draw, the off-page ones included
  function normal(m) { if (typeof m.setHard === "function") m.setHard(false); }
  function shows(m, s) {
    var box = document.createElement("div");
    normal(m);
    try { m.round(box, SM.rng(s), function () {}); } catch (e) { return null; }
    return who(box);
  }
  function planRounds(seed) {
    var used = {}, out = [];
    ORDER.forEach(function (id, i) {
      var m = find(id), first = null, pick = null;
      for (var b = 0; b <= TRIES && !pick; b++) {
        var s = seed + ":" + i + (b ? ":" + b : ""), ids = shows(m, s);
        if (ids === null) { pick = { s: seed + ":" + i, ids: [] }; break; }   // the real draw will show the error
        if (!first) first = { s: s, ids: ids };
        if (!ids.some(function (x) { return used[x]; })) pick = { s: s, ids: ids };
      }
      pick = pick || first;
      pick.ids.forEach(function (x) { used[x] = 1; });
      out.push(pick.s);
    });
    return out;
  }

  function css() {
    if (document.getElementById("css-daily")) return;
    var s = document.createElement("style");
    s.id = "css-daily";
    s.textContent = [
      ".m-daily{max-width:760px}",
      ".m-daily h2{margin:0 0 4px;font-size:1.25rem}",
      ".m-daily h3{margin:14px 0 6px;font-size:1.02rem}",
      ".m-daily .dmeta{color:var(--muted,#4b5563);margin:0 0 10px}",
      ".m-daily .dplan{margin:6px 0 10px;padding-left:1.4em}",
      ".m-daily .dplan .dw{color:var(--muted,#4b5563)}",
      ".m-daily .draft{font-size:.82rem;color:var(--muted,#4b5563);margin:6px 0}",
      ".m-daily .dorder{font-size:.85rem;color:var(--muted,#4b5563);margin:0 0 4px}",
      ".m-daily .dbar{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;align-items:center;gap:4px 16px;background:var(--card,#fff);border:1px solid var(--line,#d9dce1);border-radius:8px;padding:8px 12px;margin:0 0 10px;font-weight:600}",
      ".m-daily .dprac{color:#9a3412}",
      ".m-daily .dmode{font-weight:700;margin:0 0 6px;scroll-margin-top:64px}",
      ".m-daily .dmode:focus{outline:none}",
      ".m-daily .dbig{font-size:1.15rem;margin:4px 0 10px}",
      ".m-daily .dbig:focus{outline:none}",
      ".m-daily .derr{color:#C8102E;font-weight:600}",
      ".m-daily table{width:100%;border-collapse:collapse;font-size:.88rem;margin:4px 0 8px}",
      ".m-daily td,.m-daily th{padding:4px 6px;border-bottom:1px solid var(--line,#d9dce1);text-align:left}",
      ".m-daily td.n,.m-daily th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}",
      ".m-daily tr.dsum td{font-weight:700}",
      ".m-daily .dshare{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0}",
      ".m-daily .dshare .dlab{font-weight:600}",
      ".m-daily .dshare .dline{flex:1 1 200px;min-width:0;margin:0;padding:7px 8px;border:1px solid var(--line,#d9dce1);border-radius:6px;background:var(--gray,#f2f3f5);overflow-wrap:anywhere;user-select:all;-webkit-user-select:all}",
      ".m-daily .dmsg{font-size:.85rem;color:var(--muted,#4b5563)}",
      ".m-daily .dnote{font-size:.82rem;background:var(--warn,#fff7ed);border:1px solid #f59e0b;border-radius:6px;padding:6px 10px;margin:8px 0 0}",
      ".m-daily .gbar .gbtn{min-height:40px}",
      // inside the daily, Map Match is the two-map puzzle for everyone. Since 2026-10-08 mode-match.js draws no Hard
      // mode switch in a round pinned by setHard; this rule is a backstop if it stops doing it
      ".m-daily .m-match .mm-hard{display:none}"
    ].join("\n");
    document.head.appendChild(s);
  }

  // --- screens ---
  function mount(el) {
    css();
    el.innerHTML = "";
    var root = SM.h("div", { class: "m-daily" });
    el.appendChild(root);
    var date = SM.today(), n = puzzleNo(date);
    var ctx = { el: el, root: root, date: date, n: n, pre: !(n >= 1), seed: "shotmaps-daily:" + date };
    var missing = ORDER.filter(function (id, i) { return !find(id) && ORDER.indexOf(id) === i; });
    if (missing.length) {
      root.appendChild(SM.h("p", { class: "derr" }, "The Daily Challenge needs these games, which are not loaded: " + SM.esc(missing.join(", ")) + "."));
      return;
    }
    route(ctx);
  }

  // D-D: has US Eastern midnight passed since this screen was drawn? Then show the new day's screen in its place (its
  // puzzle, number and seed), put focus on its first button so a keyboard player can press it at once, and say so to
  // the caller, which then does nothing more. Called by every button that starts or resumes a puzzle; never during play,
  // so a puzzle being played at midnight is not cut off.
  function moved(ctx) {
    if (SM.today() === ctx.date) return false;
    mount(ctx.el);
    var b = ctx.el.querySelector(".m-daily button");
    if (b) { try { b.focus(); } catch (e) {} }
    return true;
  }

  // the screen today calls for, read from storage now rather than when the page opened
  function route(ctx) {
    if (ctx.pre) return startScreen(ctx);
    var r = todays(ctx.date);
    if (r) return playedScreen(ctx, r);
    var run = runOf(ctx.date);
    if (run) return resumeScreen(ctx, run);
    startScreen(ctx);
  }

  function heading(ctx, box) {
    box.appendChild(SM.h("h2", null, ctx.pre ? "Shot Maps Daily: practice puzzle" : "Shot Maps Daily #" + ctx.n));
    box.appendChild(SM.h("p", { class: "dmeta" }, SM.esc(longDate(ctx.date)) + " &middot; 5 rounds"));
    rules(box);
  }
  // a round's worth: the most it can score (null when unknown), and how the start screen says it ("2", "up to 6")
  function worthMax(id) { var w = WORTH[id]; return isInt(w) ? w : w && isInt(w.upTo) && w.upTo > 0 ? w.upTo : null; }
  function worthText(id) { var n = worthMax(id); return n === null ? null : (isInt(WORTH[id]) ? "" : "up to ") + n; }
  // the RULES box, shortened by /humanize on 2026-10-10: the decided rules (D-D; D-E's clock removed) and the ones still
  // open, same content, three bullets. The maximum is summed from WORTH, never typed.
  function rules(box) {
    var max = ORDER.every(function (id) { return worthMax(id) !== null; }) ? ORDER.reduce(function (s, id) { return s + worthMax(id); }, 0) : null;
    box.appendChild(SM.rules([
      SM.esc(MIDNIGHT),
      "No clock. Your score is the five rounds' points added up" + (max !== null ? ", up to " + max : "") + ". Map Match uses two maps, and no player-season shows up twice.",
      "Leave and come back to pick up at your next round. If midnight comes mid-puzzle you can finish, and it counts for the day you started. An unfinished puzzle cannot be picked up after midnight."
    ]));
  }
  function startScreen(ctx) {
    ctx.root.innerHTML = "";
    var box = SM.h("div", { class: "round dstart" });
    heading(ctx, box);
    if (ctx.pre) box.appendChild(SM.h("p", { class: "dprac" }, "Numbered puzzles start on " + SM.esc(longDate("2026-10-08"))
      + ". This one is practice: it is not scored or saved."));
    var ol = SM.h("ol", { class: "dplan" });
    ORDER.forEach(function (id) {
      var w = worthText(id);
      ol.appendChild(SM.h("li", null, SM.esc(find(id).title) + (w ? ' <span class="dw">(' + w + (worthMax(id) === 1 ? " point" : " points") + ")</span>" : "")));
    });
    box.appendChild(ol);
    var bar = SM.h("div", { class: "gbar" });
    bar.appendChild(SM.button("Start", "dgo", function () { begin(ctx); }));
    box.appendChild(bar);
    ctx.root.appendChild(box);
  }

  function begin(ctx) {
    if (moved(ctx)) return;                                 // midnight passed while this screen was open
    if (ctx.pre) return play(ctx, true, null);
    // another tab may have started or finished today's puzzle since this screen opened
    if (todays(ctx.date) || runOf(ctx.date)) return route(ctx);
    // the run exists from now on, so a reload resumes it
    var run = { date: ctx.date, results: [] };
    writeRun(run.date, run.results);
    play(ctx, false, run);
  }

  function resumeScreen(ctx, run) {
    ctx.root.innerHTML = "";
    var box = SM.h("div", { class: "round dresume" });
    heading(ctx, box);
    var k = run.results.length, c = 0, t = 0;
    run.results.forEach(function (x) { c += x.correct; t += x.total; });
    box.appendChild(SM.h("p", { class: "dbig" }, "You started this puzzle and answered " + k + " of " + ORDER.length + " rounds"
      + (t ? ", " + c + " of " + t + " points so far" : "") + "."));
    var bar = SM.h("div", { class: "gbar" });
    bar.appendChild(SM.button("Resume at round " + (k + 1), "dresumebtn", function () {
      if (moved(ctx)) return;                               // after midnight the old day's run is not picked up (Draft rule)
      if (todays(ctx.date)) return route(ctx);
      var cur = runOf(ctx.date);
      if (!cur) return route(ctx);
      play(ctx, false, cur);
    }));
    box.appendChild(bar);
    ctx.root.appendChild(box);
  }

  function play(ctx, practice, run) {
    ctx.root.innerHTML = "";
    var plan = planRounds(ctx.seed);
    var results = (run ? run.results : []).map(function (x) { return { id: x.id, title: find(x.id).title, correct: x.correct, total: x.total }; });
    var k = results.length, rec = null, outcome = null;
    var bar = SM.h("div", { class: "dbar" });
    var lab = SM.h("span", { class: "dround" }), pts = SM.h("span", { class: "dpoints" });
    if (practice) bar.appendChild(SM.h("span", { class: "dprac" }, "Practice, not scored"));
    bar.appendChild(lab); bar.appendChild(pts);
    var title = SM.h("p", { class: "dmode", tabindex: "-1" });
    var host = SM.h("div", { class: "dhost" });
    var nav = SM.h("div", { class: "gbar" });
    var next = SM.button("Next round", "dnext", advance);
    nav.appendChild(next);
    [bar, title, host, nav].forEach(function (x) { ctx.root.appendChild(x); });

    function showPoints() {
      var c = 0, t = 0;
      results.forEach(function (x) { c += x.correct; t += x.total; });
      pts.textContent = !t ? "Points: 0" : "Points: " + c + " of " + t + (results.length < ORDER.length ? " so far" : "");
    }
    function runRound() {
      var i = k, m = find(ORDER[i]), answered = false;
      host.innerHTML = "";
      lab.textContent = "Round " + (i + 1) + " of " + ORDER.length;
      title.textContent = m.title;
      next.disabled = true;
      next.textContent = i === ORDER.length - 1 ? "See results" : "Next round";
      var el = SM.h("div", { class: "round" });
      host.appendChild(el);
      if (!practice) writeRun(ctx.date, results);
      function done(res) {
        if (answered) return;                               // a round counts once, however often its game reports
        answered = true;
        var c = Number(res && res.correct), t = Number(res && res.total);
        results.push({ id: m.id, title: m.title, correct: isFinite(c) ? c : 0, total: isFinite(t) ? t : 0 });
        if (results.length < ORDER.length) {
          if (!practice) writeRun(ctx.date, results);       // a reload or another tab resumes from here
        } else {                                            // the last answer records the day
          // the maximum is the sum of the rounds' reported totals (Head to Head's varies), never a fixed figure
          rec = { date: ctx.date, points: 0, max: 0 };
          results.forEach(function (x) { rec.points += x.correct; rec.max += x.total; });
          if (!practice) { outcome = save(rec); drop(RUN); }
        }
        showPoints();
        next.disabled = false;
        // keyboard: Enter goes on to the next round, unless the game put focus on its own reveal; then Next is reached
        // by Tab after the reveal's own controls (Head to Head's two site links, for example). Never scroll, so the
        // reveal stays in view.
        var a = document.activeElement;
        if (!(a && el.contains(a) && !/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(a.tagName))) {
          try { next.focus({ preventScroll: true }); } catch (e) {}
        }
      }
      try {
        // a game with a difficulty switch (Map Match's hard mode) is played at its normal level, and any switch it still
        // draws is hidden and disabled here, so the daily is the same puzzle for everyone whatever they chose in practice
        normal(m);
        m.round(el, SM.rng(plan[i]), done);
        Array.prototype.forEach.call(el.querySelectorAll(".mm-hard input, .mm-hard button"), function (x) { x.disabled = true; });
      } catch (e) {
        el.appendChild(SM.h("p", { class: "derr" }, "This round could not be drawn: " + SM.esc(e && e.message || e)));
        done({ correct: 0, total: 0 });
      }
    }
    function advance() {
      if (k < ORDER.length - 1) { k += 1; runRound(); try { title.focus(); } catch (e) {} }
      else endScreen(ctx, rec, results, practice, outcome);
    }

    showPoints();
    runRound();
    try { title.focus(); } catch (e) {}
  }

  // the share line is plain text that wraps (an input would cut it off on a phone); Copy falls back to selecting it
  function shareBox(r) {
    var id = "dshare" + (++uid), text = shareLine(r);
    var box = SM.h("div", { class: "dshare" });
    box.appendChild(SM.h("span", { class: "dlab", id: id + "-l" }, "Share"));
    var line = SM.h("p", { class: "dline", id: id, "aria-labelledby": id + "-l" });
    line.textContent = text;
    var msg = SM.h("span", { class: "dmsg", "aria-live": "polite" });
    function selectIt() {
      try { var rg = document.createRange(), s = window.getSelection(); rg.selectNodeContents(line); s.removeAllRanges(); s.addRange(rg); } catch (e) {}
      msg.textContent = "Selected. Use your device's copy command to copy it.";
    }
    var btn = SM.button("Copy", "ghost dcopy", function () {
      try {
        navigator.clipboard.writeText(text).then(function () { msg.textContent = "Copied."; }, selectIt);
      } catch (e) { selectIt(); }
    });
    box.appendChild(line); box.appendChild(btn); box.appendChild(msg);
    return box;
  }

  function board() {
    var sec = SM.h("section", { class: "dboard" });
    sec.appendChild(SM.h("h3", null, "Your results on this device"));
    var list = ranked();
    if (!list.length) {
      sec.appendChild(SM.h("p", { class: "dempty" }, storageWorks() ? "No saved results on this device yet."
        : "This browser does not let the page save results, so none are listed."));
    } else {
      sec.appendChild(SM.h("p", { class: "dorder" }, "Most points first, then the most recent."));
      var t = SM.h("table", { class: "dlog" });
      t.innerHTML = '<thead><tr><th>Date</th><th class="n">Puzzle</th><th class="n">Points</th></tr></thead>';
      var tb = SM.h("tbody");
      list.forEach(function (r) {
        tb.appendChild(SM.h("tr", null, "<td>" + SM.esc(r.date) + '</td><td class="n">#' + puzzleNo(r.date) + '</td><td class="n">'
          + r.points + " of " + r.max + "</td>"));
      });
      t.appendChild(tb);
      sec.appendChild(t);
    }
    sec.appendChild(SM.h("p", { class: "dnote" }, SM.esc(NOTE)));
    return sec;
  }

  function againButton(ctx) {
    var bar = SM.h("div", { class: "gbar" });
    bar.appendChild(SM.button("Play again (practice, not scored)", "ghost dagain", function () { if (!moved(ctx)) play(ctx, true, null); }));
    bar.appendChild(SM.h("span", { class: "draft dsame" }, ctx.pre ? "Practice replays this puzzle's five rounds." : "Practice replays today's five rounds."));
    return bar;
  }

  function endScreen(ctx, rec, results, practice, outcome) {
    ctx.root.innerHTML = "";
    var box = SM.h("div", { class: "round dend" });
    heading(ctx, box);
    if (practice) box.appendChild(SM.h("p", { class: "dprac" }, "Practice run, not scored and not saved."));
    // keyboard: See results is gone with the old screen, so focus goes to the result line (tabindex -1, focusable only
    // from here), and the next Tab reaches Copy, not the page's tab bar
    var big = SM.h("p", { class: "dbig", tabindex: "-1" }, "<b class=\"dpts\">" + rec.points + " of " + rec.max + "</b> points");
    box.appendChild(big);
    var t = SM.h("table", { class: "dbreak" });
    t.innerHTML = '<thead><tr><th>Round</th><th>Game</th><th class="n">Points</th></tr></thead>';
    var tb = SM.h("tbody");
    results.forEach(function (x, i) {
      tb.appendChild(SM.h("tr", null, "<td>" + (i + 1) + "</td><td>" + SM.esc(x.title) + '</td><td class="n">' + x.correct + " of " + x.total + "</td>"));
    });
    tb.appendChild(SM.h("tr", { class: "dsum" }, '<td colspan="2">Total</td><td class="n">' + rec.points + " of " + rec.max + "</td>"));
    t.appendChild(tb);
    box.appendChild(t);
    var r = !ctx.pre && (practice || outcome === "kept") ? todays(ctx.date) : null;
    if (!practice && outcome !== "kept") {
      box.appendChild(shareBox(rec));
      if (outcome !== "saved") box.appendChild(SM.h("p", { class: "draft dunsaved" }, "This browser did not let the page save this result, so it is not kept on this device."));
    } else {
      if (outcome === "kept") box.appendChild(SM.h("p", { class: "dkept" }, "This device already had a scored result for this puzzle, "
        + "from another tab or window, so this run is not saved. The first result is the one kept."));
      if (r) {
        box.appendChild(SM.h("p", null, "Today's scored result: <b>" + r.points + " of " + r.max + "</b> points."));
        box.appendChild(shareBox(r));
      }
    }
    box.appendChild(againButton(ctx));
    box.appendChild(board());
    ctx.root.appendChild(box);
    try { big.focus(); } catch (e) {}
  }

  function playedScreen(ctx, r) {
    ctx.root.innerHTML = "";
    var box = SM.h("div", { class: "round dplayed" });
    heading(ctx, box);
    box.appendChild(SM.h("p", { class: "dbig" }, "You played today's puzzle: <b class=\"dpts\">" + r.points + " of " + r.max
      + "</b> points."));
    box.appendChild(shareBox(r));
    box.appendChild(againButton(ctx));
    box.appendChild(board());
    ctx.root.appendChild(box);
  }

  SM.daily = { mount: mount };
})();
