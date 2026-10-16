// Shared harness for the game mockups (mockups/build_game_mockups.py writes data.js; this file reads window.GAME).
// Every number shown comes from GAME, which is the built site's own front-<year>.json data; every hexagon fill is
// the site's own color, computed in Python by build_site.color(). Nothing here invents a value.
//
// Contract for a mode script (mode-*.js):
//   SM.register({id, title, blurb, round(el, rng, done)})
//     round(el, rng, done) draws ONE round into el using rng() for every random choice, and calls
//     done({correct, total, detail}) once the player has answered (correct <= total, both integers).
//   index.html gives every mode a "Practice" tab that runs round() with a fresh seed; daily.js runs a fixed,
//   date-seeded sequence of rounds across all modes.
(function () {
  var G = window.GAME, Q = G.geom, SQ3 = Math.sqrt(3.0), S = Q.w / SQ3;
  var SM = (window.SM = { modes: [] });

  SM.register = function (m) { SM.modes.push(m); };
  SM.esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };

  // --- randomness: one seeded generator per game, so a daily challenge is the same for everyone that day ---
  function hash(str) { var h = 1779033703 ^ str.length; for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
  SM.rng = function (seed) { var a = hash(String(seed)); return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // Jake, 2026-10-08 (owner_decisions.md D-D): "today" is the US Eastern date, so everyone gets the same puzzle at the
  // same moment. en-CA formats as YYYY-MM-DD. `at` (a Date) is for tests.
  SM.today = function (at) { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(at || new Date()); };
  SM.pick = function (rng, arr) { return arr[Math.floor(rng() * arr.length)]; };
  SM.sample = function (rng, arr, k) { var a = arr.slice(), out = []; while (out.length < k && a.length) out.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return out; };
  SM.shuffle = function (rng, arr) { return SM.sample(rng, arr, arr.length); };

  // --- the pool: every player-season the site holds ---
  SM.all = [];
  Object.keys(G.seasons).sort().forEach(function (y) { var D = G.seasons[y]; D.players.forEach(function (P) { SM.all.push({ y: y, s: D.s, P: P, D: D }); }); });
  SM.name = function (e) { return e.P.n + " (" + e.s + ")"; };

  // --- levels (Jake, 2026-10-15: "easy being more popular players and harder being lesser known"; popularity by
  // "Wikipedia page views"). P.lv is "easy", "medium" or "hard", written by build_game_mockups.py from
  // data/tables/popularity.json (tools/popularity.py: the most-viewed third of the 374 players is Easy). SM.level is
  // the level being drawn. null means every player, which is exactly how every game drew before 2026-10-15: with it
  // null no filter runs and no extra random number is drawn, so a seed gives the same round as it always has.
  SM.LEVELS = [["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"]];
  SM.level = null;
  SM.inLevel = function (P) { return !SM.level || P.lv === SM.level; };
  var byLevel = {};
  SM.pool = function () {
    if (!SM.level) return SM.all;
    return byLevel[SM.level] || (byLevel[SM.level] = SM.all.filter(function (e) { return e.P.lv === SM.level; }));
  };
  // a season's players at this level, and the seasons with at least k of them (for the games that show one season)
  SM.levelPlayers = function (D) { return SM.level ? D.players.filter(SM.inLevel) : D.players; };
  SM.seasonsWith = function (k) {
    var ys = Object.keys(G.seasons).sort();
    return SM.level ? ys.filter(function (y) { return SM.levelPlayers(G.seasons[y]).length >= k; }) : ys;
  };
  // The Daily mixes the levels (Jake, 2026-10-15: "daily will mix between levels of difficultuy"): from DAILY_LEVELS.from
  // on, round i is drawn at DAILY_LEVELS.rounds[i]. Before that date every round draws from every player, as it did, so
  // no date's puzzle changes after it was published (daily.js, "The Daily in force on a date"; publish.py gate D1).
  SM.DAILY_LEVELS = { from: "2026-10-18", rounds: ["easy", "easy", "medium", "medium", "hard"] };
  SM.dailyLevel = function (date, i) { return date >= SM.DAILY_LEVELS.from ? SM.DAILY_LEVELS.rounds[i] || null : null; };
  SM.levelName = function (lv) { for (var i = 0; i < SM.LEVELS.length; i++) if (SM.LEVELS[i][0] === lv) return SM.LEVELS[i][1]; return ""; };

  // two different PEOPLE (never the same player in two seasons, which would make a pair trivially guessable), from the
  // players at the level being drawn
  SM.pair = function (rng, pool) { pool = pool || SM.pool(); var a = SM.pick(rng, pool), b; do { b = SM.pick(rng, pool); } while (b.P.p === a.P.p); return [a, b]; };

  // --- stats: label, direction, display ---
  SM.label = function (k) { return G.stats[k][0]; };
  SM.lowerIsBetter = function (k) { return G.stats[k][1] === "lower"; };
  SM.num = function (v) { var x = parseFloat(v); return isFinite(x) ? x : null; };
  SM.stat = function (e, k) { return e.P.stats[k]; };
  // Can stat k be ASKED about for this player-season? A stat with no printed value never is. 3P% is asked only when
  // made threes are at least GAME.three_share_min (5%) of made field goals (Jake, 2026-10-08, owner_decisions.md D-C);
  // e.P.three_ok carries that test, computed in build_game_mockups.py from Basketball-Reference's totals.
  SM.askable = function (e, k) { return SM.num(SM.stat(e, k)) !== null && (k !== "fg3_pct" || e.P.three_ok === true); };
  // the six card essentials, in the order D-B lists them (Jake, 2026-10-08: Head to Head asks these). The built
  // season-page card prints PPS second, so this is the decision's order, not the card's.
  SM.ESSENTIALS = ["ppg", "fg_pct", "fg3_pct", "fga_per_g", "team_share", "pps"];
  // who leads a stat: 1 = first, -1 = second, 0 = tied or not comparable. Compared on the printed value, which is
  // the value the player sees, so the key never disagrees with what is on the screen.
  SM.leader = function (a, b, k) {
    var x = SM.num(SM.stat(a, k)), y = SM.num(SM.stat(b, k));
    if (x === null || y === null || x === y) return 0;
    var s = x > y ? 1 : -1;
    return SM.lowerIsBetter(k) ? -s : s;
  };

  // --- efficiency at one spot, pooled exactly as the map colors it ---
  SM.hexOf = function (e, q, r) { for (var i = 0; i < e.P.hex.length; i++) { var h = e.P.hex[i]; if (h[0] === q && h[1] === r) return h; } return null; };
  // {pa, pm, fg, lg, rel}: pooled attempts and makes, his FG%, the league's FG% there, and his FG% over the league's
  SM.spot = function (e, q, r) { var h = SM.hexOf(e, q, r); if (!h || h[4] < G.floor) return null; var fg = h[5] / h[4], lg = h[7] / h[6]; return { pa: h[4], pm: h[5], fg: fg, lg: lg, rel: fg / lg }; };
  SM.pct = function (v) { return (v * 100).toFixed(1) + "%"; };

  // --- drawing: the comparison page's geometry (DRAW_JS hexPts), the site's precomputed fills ---
  function px(x) { return +((x + Q.cw / 2) * Q.scale + Q.pad).toFixed(2); }
  function py(y) { return +((Q.ymax - y) * Q.scale + Q.pad).toFixed(2); }
  function center(q, r) { var k = Q.corner[q + "," + r]; return k ? k : [Q.rimx + S * SQ3 * (q + r / 2), Q.rimy + 1.5 * S * r]; }
  SM.hexPts = function (q, r, a, full) {
    var c = center(q, r), s = S * Q.fill * (full ? 1 : Math.max(0.3, Math.min(1.0, Math.sqrt(a / Q.full)))), p = [];
    for (var k = 0; k < 6; k++) { var t = (60 * k - 30) * (Math.PI / 180); p.push(px(c[0] + s * Math.cos(t)) + "," + py(c[1] + s * Math.sin(t))); }
    return p.join(" ");
  };
  var nid = 0;
  function frame(body, label) {
    var c = Q.clip, id = "mc" + (++nid);
    return '<svg class="gmap" viewBox="0 0 ' + Q.vw + " " + Q.vh + '" role="img" aria-label="' + SM.esc(label) + '" xmlns="http://www.w3.org/2000/svg">' + G.court
      + '<defs><clipPath id="' + id + '"><rect x="' + c[0] + '" y="' + c[1] + '" width="' + c[2] + '" height="' + c[3] + '"/></clipPath></defs><g clip-path="url(#' + id + ')">' + body + "</g>" + Q.lines + "</svg>";
  }
  // one player's map as the site draws it. opts: {label, ring:[q,r], pick:true (adds data-q/data-r and class "hx" so a
  // click handler can read the spot), blank:true (court only; with pick, every hexagon either player shot from is an
  // empty target)}
  SM.map = function (e, opts) {
    opts = opts || {};
    var body = "";
    if (!opts.blank) {
      e.P.hex.forEach(function (h) {
        var pts = SM.hexPts(h[0], h[1], h[2]), at = opts.pick ? ' class="hx" data-q="' + h[0] + '" data-r="' + h[1] + '"' : "";
        body += h[8] ? '<polygon points="' + pts + '" fill="' + h[8] + '" stroke="#555" stroke-width="0.4"' + at + "/>"
                     : '<polygon points="' + pts + '" fill="none" stroke="#9aa0a6" stroke-width="0.6" data-thin="1"' + at + "/>";
      });
    }
    if (opts.targets) opts.targets.forEach(function (t) { body += '<polygon class="hx tgt" data-q="' + t[0] + '" data-r="' + t[1] + '" points="' + SM.hexPts(t[0], t[1], 0, true) + '" fill="#e5e7eb" fill-opacity="0.55" stroke="#9aa0a6" stroke-width="0.5"/>'; });
    if (opts.ring) body += '<polygon class="ring" points="' + SM.hexPts(opts.ring[0], opts.ring[1], 0, true) + '" fill="none" stroke="#111827" stroke-width="2.4"/>';
    // a zone of the floor (Hot Spot): shade fills its hexagons whole; outline draws only its outer edge, so a player's
    // own colors stay readable inside it
    if (opts.shade) opts.shade.forEach(function (t) { body += '<polygon class="zone" points="' + whole(t[0], t[1]) + '" fill="' + SM.ZONE_FILL + '" fill-opacity="0.6" stroke="none"/>'; });
    if (opts.shade || opts.outline) body += '<path class="zone-edge" d="' + SM.zoneEdge(opts.shade || opts.outline) + '" fill="none" stroke="' + SM.ZONE_EDGE + '" stroke-width="2" stroke-linejoin="round"/>';
    return frame(body, opts.label || (e ? SM.name(e) : "court"));
  };
  SM.ZONE_FILL = "#f59e0b"; SM.ZONE_EDGE = "#b45309";
  // a zone's hexagons are drawn at full size (not the map's 0.9), so the shaded area has no gaps and its edge is unbroken
  function corner(c, k) { var t = (60 * k - 30) * (Math.PI / 180); return px(c[0] + S * Math.cos(t)) + " " + py(c[1] + S * Math.sin(t)); }
  function whole(q, r) { var c = center(q, r), p = []; for (var k = 0; k < 6; k++) p.push(corner(c, k).replace(" ", ",")); return p.join(" "); }
  // The outer edge of a set of grid hexagons: each hexagon side whose neighbour across it is not in the set. Side k runs
  // from corner k to corner k + 1 (corners at 60k - 30 degrees, as hexPts draws them), and faces the neighbour at 60k
  // degrees: (1,0), (0,1), (-1,1), (-1,0), (0,-1), (1,-1) in this axial layout.
  var SIDE = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  SM.zoneEdge = function (hexes) {
    var inSet = {}, d = "";
    hexes.forEach(function (t) { inSet[t[0] + "," + t[1]] = 1; });
    hexes.forEach(function (t) {
      var c = center(t[0], t[1]);
      for (var k = 0; k < 6; k++) {
        if (inSet[(t[0] + SIDE[k][0]) + "," + (t[1] + SIDE[k][1])]) continue;
        d += "M" + corner(c, k) + "L" + corner(c, k + 1);
      }
    });
    return d;
  };

  // --- small UI helpers shared by the modes ---
  SM.h = function (tag, attrs, html) { var el = document.createElement(tag); if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); }); if (html != null) el.innerHTML = html; return el; };
  // the RULES box every game opens with (Jake, 2026-10-10: "create collaspable rules ... on each of these pages"):
  // closed until opened, one short bullet per rule, how you score first. items are HTML strings.
  SM.rules = function (items) {
    return SM.h("details", { class: "g-rules" }, "<summary>RULES</summary><ul>"
      + items.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>");
  };
  // --- teams (Jake, 2026-10-11: "for the player options we can use their team colors"): the team a player-season is
  // drawn with is the one he played the most games for (build_game_mockups.py team_of), with teams.json's colors and
  // NBA.com's logo. A button keeps the player's name as its only text; the team rides on the color, the logo and the
  // title, so every name lookup by text still works.
  SM.team = function (e) { return G.teams[e.P.t]; };
  SM.logo = function (e, cls) { var t = SM.team(e); return '<img class="' + (cls || "tlogo") + '" src="' + SM.esc(t.logo) + '" alt="" width="22" height="22">'; };
  SM.teamName = function (e) { var t = SM.team(e), more = e.P.nt - 1; return t.name + (more > 0 ? " (most games; " + e.P.nt + " teams that season)" : ""); };
  // the colors go in as CSS variables (--tc fill, --ti text, --tb border), never as inline colors, so a mode's own
  // answer styling (right, wrong, revealed) still wins by ordinary CSS
  SM.teamVars = function (el, e) {
    var t = SM.team(e), c = t.colors;
    el.style.setProperty("--tc", c[0]); el.style.setProperty("--ti", t.ink); el.style.setProperty("--tb", c[1] || c[0]);
    el.setAttribute("data-team", e.P.t);
    return el;
  };
  SM.teamButton = function (b, e) {
    SM.teamVars(b, e);
    b.classList.add("tbtn");
    b.title = SM.teamName(e);
    var label = SM.h("span", { class: "tname" }); label.textContent = b.textContent;
    b.textContent = ""; b.appendChild(label);
    b.insertAdjacentHTML("afterbegin", '<span class="tlogo-wrap" aria-hidden="true">' + SM.logo(e) + "</span>");
    return b;
  };
  // change a team button's words without dropping its logo
  SM.setLabel = function (b, text) {
    var label = b.querySelector(".tname");
    if (label) label.textContent = text; else b.textContent = text;
  };
  SM.button = function (text, cls, onclick) { var b = SM.h("button", { type: "button", class: "gbtn " + (cls || "") }); b.textContent = text; b.addEventListener("click", onclick); return b; };
})();
