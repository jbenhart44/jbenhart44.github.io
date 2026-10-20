# /guard-hook — A Hook Guard That Has Been Made to Fail

You wrote a Claude Code hook to stop a dangerous command, and you have no proof it ever stops anything.

## When You Need This

- You are adding a PreToolUse or PostToolUse hook that is meant to block or flag something
- You want to know if the hooks already in `.claude/hooks/` are real guards
- You use Claude Code hooks. If you do not, skip this command: nothing else in the toolkit needs it

## What It Does — And What It Won't

`/guard-hook` builds a hook guard in three files: a thin `.sh` launcher, a `.py` file that makes the decision by reading the payload as real JSON, and a self-test. The first self-test run is red on purpose, because the scaffold ships a pattern that matches nothing. You write the pattern and the test cases. Then `failfirst` removes the pattern, runs the self-test, and requires it to fail. If the self-test still passes, the test never touched the guard, and you need better cases. Only then does `register` add the guard to `settings.json`, as one entry with no `if:` condition. It refuses an unauthored guard and a failing self-test.

In audit mode, it checks the hooks you already have for six known traps. It reports them and never edits or removes anything. It is not for a hook that only records, such as a counter or a logger, because there is nothing for such a hook to refuse. It also does not install the rule file it drafts. That choice is yours, and it stops to ask before any commit.

`/guard-hook` is a skill, installed by the full install.

## Worked Example

Aisha keeps her raw survey files in `data/raw/`. She wants a hook that refuses any `rm` command that touches that folder.

```
/guard-hook block rm commands that touch data/raw
```

`/guard-hook` first runs `/quick-ten` on this one guard. It asks which rule the guard enforces, whether it should block or only warn, which tools carry the risk, whether to `deny` or `ask`, and which false positive is acceptable. Aisha decides to block, because a delete cannot be undone. The tool scaffolds the three files, and the fresh self-test fails, which is correct. Aisha writes the trigger and the must-block and must-pass cases, including a quoted argument and a `&&` chain. Then `failfirst` proves the self-test fails against a neutered guard, and `register` adds the entry. Until one live call has been refused, the tool says the guard is registered, not that it is working. The tool then drafts a rule file for her to place, and it stops to ask before the commit.

## Try It

```
/guard-hook
/guard-hook <the rule you want a hook to enforce>
python3 ~/.claude/skills/guard-hook/assets/guard_hook_run.py audit
```
