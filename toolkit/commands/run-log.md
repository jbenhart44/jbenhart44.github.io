# /run-log — Longitudinal Toolkit Report

You have used the toolkit for weeks and cannot say which commands you actually ran, or how they went.

## When You Need This

- You have run several toolkit commands and want one table of how each one went
- You want to see which friction points keep coming back across runs
- You teach with the toolkit and want to check which commands a student ran, and how often

## What It Does — And What It Won't

`/run-log` reads the run log that the other commands write and renders one table. For each command it shows the number of runs, the mean convergence, the mean tokens, the outcomes (complete, partial, failed), the last run, and the top improvement signal. It adds aggregate statistics, the improvement signals that recurred at least twice, and a footer with the SHA-256 of each input file. The default window is the last 14 days. It shows the table in the terminal and saves a copy under `runlog_reports/` in your evidence folder.

It changes nothing in the logs it reads, collects no new data, and uses no network. Like the other commands, it adds one row of its own to `run_log.csv` when it finishes, so the next table counts that run too. A command with no runs in the window is left out of the table. A malformed row is skipped, and the footer says how many. If the logs do not exist yet, it says no runs are logged and stops.

It can only report on commands that write to the log, such as /pace, /coa, /audit, /improve, /daily-summary, /commit, /startup and /help. The table gives you evidence to read. It does not replace your judgment. `/run-log` is in the full install. It is not in the `--minimal` install.

## Worked Example

Jonas has used `/pace` and `/coa` on his proposal for a few weeks. He wants to see how they went.

```
/run-log --command pace --command coa
```

`/run-log` reads `.toolkit/evidence/run_log.csv` and `command_performance_log.md` from his evidence folder. It returns a table with one row for `/pace` and one for `/coa`, covering the last 14 days. Each row shows runs, mean convergence, mean tokens, outcomes, last run and top improvement signal. Below the table come the aggregate statistics and any improvement signal that appeared in two or more runs. The footer lists the SHA-256 of both input files and the window used. The same report is saved as a dated file in the `runlog_reports` folder.

## Try It

```
/run-log
/run-log --since 2026-01-01
/run-log --all
/run-log --drill-down <run-id>
/run-log --top-signals
```
