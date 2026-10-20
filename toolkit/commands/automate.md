# /automate — Turn a Finished Task Into a Skill

You just spent an afternoon on a multi-step task, and you know you will have to do it again next month.

## When You Need This

- You finished a complex task, and the same kind of task will come back
- You want the repeatable steps turned into a script, not re-explained to Claude each time
- You want proof that the new skill gives the same result as the original task

## What It Does — And What It Won't

`/automate` reads what you actually did, from the conversation, from git, from your session notes and from the files the task produced. It sorts every step into one of four kinds. Deterministic and parametric steps go into a real script. Judgment steps stay as instructions in `SKILL.md`. Steps that need your decision stay as questions. It states the share of steps it could automate as a number. It runs `/quick-ten` on the skill being built, and the new skill opens with its own `/quick-ten` gate. Then it runs the self-test, watches a case that must fail actually fail, and runs the script on the original task's inputs. It reports the result as reproduced, partial or not reproduced.

It does not guess. A step with no evidence gets a `[GAP:]` marker. An approval you gave in the original task, such as a push, a delete or a send, stays in the new skill as a mandatory stop. It stops if the task is not finished, not repeatable or not stable. It writes a new skill and never overwrites an existing `SKILL.md`. If the name is taken, it asks. To improve a skill it made, after real use, run `/automate --revise <name>`: it proposes edits, shows the diff, and waits for your OK. If a task is mostly judgment, it offers a checklist skill with no script.

`/automate` is a skill, installed by the full install. It needs `/quick-ten`, which ships with it.

## Worked Example

Wei just finished cleaning a monthly sensor export. He merged three CSV files, dropped rows with missing timestamps, wrote a summary table, and checked the totals by hand. He expects to do the same next month.

```
/automate the monthly sensor export cleanup
```

`/automate` reconstructs the numbered trace from the conversation, git and the output files, and shows it to Wei. It tags each step and states the automatable fraction. The merge, the row filter and the summary table go into a script, with the month as an argument. The hand check of the totals stays as a question for the person running it. After the `/quick-ten` questions and a collision check on the name, it writes the skill folder: `SKILL.md`, `BRIEF.md`, a runnable script and a self-test. It then runs the script on last month's files and compares the output with what Wei produced by hand. The final report lists what was installed, the share automated, where a human must still decide, the self-test count and the reproduction result.

## Try It

```
/automate
/automate <describe the task>
/automate --dry-run
/automate --revise <name>
```
