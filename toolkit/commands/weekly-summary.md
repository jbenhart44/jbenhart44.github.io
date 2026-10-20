# /weekly-summary — Weekly Work Summary

Your advisor wants a Friday update and you've been in three different workstreams this week.

## When You Need This

- End of a work week — consolidate daily summaries into one view
- Before a lab meeting, advisor check-in, or weekly status report
- When you want to see which workstreams are active vs. stalled across the full week

## What It Does — And What It Won't

`/weekly-summary` reads all daily summaries from the current ISO calendar week, groups them by workstream, carries forward open TODOs, and flags workstreams that went quiet. Re-running it overwrites the existing weekly summary for the same week — it's a live document until the week closes.

**Prerequisites**: Requires Sonnet model availability — this command will fail on Haiku-only plans. Also requires that daily summaries exist for the week; if you haven't written any, the output will be thin.

## Worked Example

Dario's advisor asks for a brief Friday update every week. He also uses it for the "last week" section of his lab meeting slides.

```
/weekly-summary
```

`/weekly-summary` reads five daily summaries from ISO week 16, then produces `Weekly Summary/week_2026-W16.md` grouped by workstream: *Wage Regression — 3 sessions, completed placebo tests, identified heteroskedasticity issue, next: clustered SEs. Lit Review — 2 sessions, extracted 6 papers, drafted 800 words.* Open items from the prior week that are still unresolved are surfaced at the top.

## Try It

```
/weekly-summary
```

> *Run `/commit` after generating the weekly summary — it won't appear in your git history unless it's committed.*
