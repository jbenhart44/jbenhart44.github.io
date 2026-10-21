#!/usr/bin/env python3
"""Pull the scores every five minutes during games, from ONE long GitHub Actions job.

    python3 score_loop.py              # run the loop (inside Actions; needs the env below)
    python3 score_loop.py --self-test  # check the decisions, no network

WHY THIS EXISTS. GitHub's scheduler is best-effort, and on Sunday 2026-10-18 it ran the
five-minute `refresh.yml` 5 times out of 168 (gaps of 109-234 min). A job that has STARTED is
not subject to that: it can sleep and tick on its own clock. So the scheduled trigger only has
to land once, any time in the LEAD hours before kickoff, and the job takes it from there.

    hourly starter (best-effort)  ->  this loop: sleep until kickoff-15m, tick every 5 min
                                      until the last game is 6 h past kickoff, then exit
    at ~5h40m (Actions caps a job at 6 h)  ->  dispatch a successor with the repo's own
                                      GITHUB_TOKEN (workflow_dispatch is the documented
                                      exception to "GITHUB_TOKEN events start no runs")

One tick does exactly what refresh.yml does: ask the Worker which week is in play, fetch that
week from ESPN here (ESPN refuses Cloudflare, answers a runner), POST it to /ingest. With no
week in play it POSTs /refresh, which only records the hourly heartbeat. The Worker owns the
parse and the write budget; this file owns only the clock.

WHAT THIS DOES NOT PROVE: that GitHub honours the successor dispatch on the day. The first
live run is the evidence for that, and `outside_timer.py check` measures the gaps afterwards.

Env: WORKER, TOKEN (the Worker's refresh secret), GH_TOKEN, GITHUB_REPOSITORY.
Stdlib only, so the workflow needs no install step.
"""

import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.request

TICK_SECONDS = 300
PRE_KICK = dt.timedelta(minutes=15)    # the Worker's window opens kickoff-15min
POST_KICK = dt.timedelta(hours=6)      # ...and closes kickoff+6h
LEAD = dt.timedelta(hours=5)           # stay alive this long before a kickoff
MAX_SECONDS = 340 * 60                 # hand over before the 360-min job cap
WORKFLOW = "refresh-loop.yml"
SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"


def parse_events(payload):
    """ESPN scoreboard -> [(kickoff UTC datetime, state)], state in pre / in / post."""
    out = []
    for e in payload.get("events", []):
        kick = dt.datetime.fromisoformat(e["date"].replace("Z", "+00:00"))
        out.append((kick, e["status"]["type"]["state"]))
    return out


def decide(now, events):
    """What to do right now: "tick", "wait" or "exit".

    events is None when ESPN could not be read. That is NOT evidence of no football, so the
    loop ticks and lets the Worker decide, rather than exiting through a gap it cannot see.
    """
    if events is None:
        return "tick"
    for kick, state in events:
        if state == "in":
            return "tick"
        if kick - PRE_KICK <= now < kick + POST_KICK:
            return "tick"
    upcoming = [k for k, s in events if s == "pre" and k > now]
    if upcoming and min(upcoming) - now <= LEAD:
        return "wait"
    return "exit"


def next_boundary(now_s):
    """Seconds until the next five-minute wall-clock boundary (never zero)."""
    return TICK_SECONDS - (now_s % TICK_SECONDS) or TICK_SECONDS


def _req(method, url, headers=None, body=None, timeout=30):
    r = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


class Live:
    """The real network. Tests replace this with a fake of the same four methods."""

    def __init__(self, env):
        self.worker, self.token = env["WORKER"], env["TOKEN"]
        self.gh, self.repo = env["GH_TOKEN"], env["GITHUB_REPOSITORY"]

    def events(self):
        code, body = _req("GET", SCOREBOARD)
        return parse_events(json.loads(body)) if code == 200 else None

    def tick(self):
        auth = {"Authorization": f"Bearer {self.token}"}
        _, body = _req("GET", f"{self.worker}/health")
        week = json.loads(body).get("weekInPlay")
        if not week:
            code, body = _req("POST", f"{self.worker}/refresh", auth)
            return f"refresh {code} {body[:200]!r}"
        code, espn = _req("GET", f"{SCOREBOARD}?dates=2026&seasontype=2&week={week}")
        if code != 200:
            return f"ESPN {code} for week {week}"
        code, body = _req("POST", f"{self.worker}/ingest?week={week}",
                          {**auth, "Content-Type": "application/json"}, espn)
        return f"ingest week {week}: {code} {body[:200]!r}"

    def dispatch(self):
        code, body = _req(
            "POST", f"https://api.github.com/repos/{self.repo}/actions/workflows/{WORKFLOW}/dispatches",
            {"Authorization": f"Bearer {self.gh}", "Accept": "application/vnd.github+json",
             "X-GitHub-Api-Version": "2022-11-28"}, b'{"ref":"main"}')
        return code

    def now(self):
        return time.time()

    def sleep(self, s):
        time.sleep(s)


def run(io, max_seconds=MAX_SECONDS, log=print):
    """The loop. Returns the process exit code. Every outcome is logged with its UTC time."""
    start = io.now()
    while True:
        t = io.now()
        now = dt.datetime.fromtimestamp(t, dt.timezone.utc)
        try:
            events = io.events()
        except Exception as e:  # a dead ESPN must not kill the loop
            log(f"{now:%H:%M:%SZ} ESPN unreadable: {e}")
            events = None
        action = decide(now, events)
        if action == "tick":
            try:
                log(f"{now:%H:%M:%SZ} tick: {io.tick()}")
            except Exception as e:
                log(f"{now:%H:%M:%SZ} tick failed: {e}")
        elif action == "exit":
            log(f"{now:%H:%M:%SZ} no game within {LEAD}; exiting, the hourly starter restarts me")
            return 0
        if t - start >= max_seconds:
            code = io.dispatch()
            log(f"{now:%H:%M:%SZ} hand-over: successor dispatch HTTP {code}")
            # 204 is GitHub's success. Anything else fails the run LOUDLY, so a broken hand-over
            # shows red in the Actions tab instead of as a silent gap.
            return 0 if code == 204 else 1
        io.sleep(next_boundary(io.now()))


def self_test():
    ok = True

    def t(name, cond):
        nonlocal ok
        ok &= bool(cond)
        print(("  pass  " if cond else "  FAIL  ") + name)

    k = dt.datetime(2026, 10, 25, 17, 0, tzinfo=dt.timezone.utc)
    m = dt.timedelta(minutes=1)
    t("ESPN unreadable ticks", decide(k, None) == "tick")
    t("in-progress ticks", decide(k + 3 * 60 * m, [(k, "in")]) == "tick")
    t("kickoff-15 ticks", decide(k - 15 * m, [(k, "pre")]) == "tick")
    t("kickoff-20 waits", decide(k - 20 * m, [(k, "pre")]) == "wait")
    t("kickoff+5h59 still ticks (final lands)", decide(k + 359 * m, [(k, "post")]) == "tick")
    t("kickoff+6h with nothing next exits", decide(k + 360 * m, [(k, "post")]) == "exit")
    t("6 h before kickoff exits", decide(k - 360 * m, [(k, "pre")]) == "exit")
    t("boundary is never zero", next_boundary(600) == 300)
    print("self-test " + ("passed" if ok else "FAILED"))
    return 0 if ok else 1


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    if os.environ.get("LOOP_TEST_HANDOVER") == "1":
        # Out of season the hand-over never comes due, so this proves the two live pieces on
        # demand: one real tick, then one real successor dispatch. The successor is an
        # ordinary run (no test flag), so it exits normally.
        io = Live(os.environ)
        print(f"test tick: {io.tick()}")
        code = io.dispatch()
        print(f"test hand-over: successor dispatch HTTP {code}")
        sys.exit(0 if code == 204 else 1)
    sys.exit(run(Live(os.environ)))
