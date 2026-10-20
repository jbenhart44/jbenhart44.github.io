# /bulletproof — Tests That Would Actually Notice

Your test suite is green, but you have never seen it fail, so you do not know if it would catch a real bug.

## When You Need This

- You just added a function, a fetcher, a page or a guard, and you want tests behind it
- You are about to build something and want the tests written first
- You have an existing suite that has never been watched fail

## What It Does — And What It Won't

`/bulletproof` puts tests behind a piece of functionality and then proves they can fail. It first works through four questions, and skips any that your request already answers: what kind of project this is, what level the behavior lives at, what defect the guard exists to prevent, and what cannot be tested yet. It then writes the test before the code where it can and registers the suite in your project's runner. Last, it plants the defect on purpose and checks that the named tests go red. A green suite only counts after that.

It will not overwrite an existing suite. It will not remove one unless you name it. If something cannot be tested yet, it writes that down as a stated gap, so a green run does not imply cover that does not exist. Its runner, `bulletproof_run.py`, needs a `tests/` folder with `harness.py`, `run_all.py` and `mutation_check.py`. For a project without them, or one that is not Python, it keeps the same steps, but you write the test runner by hand in the language of your analysis.

`/bulletproof` is a skill, installed by the full install.

## Worked Example

Tomás has a Python script that downloads weather station records. It has five validity checks, and none of them has ever rejected anything. He wants to know if they work.

```
/bulletproof the validity checks in fetch_stations.py
```

`/bulletproof` first checks the project's test layout. Tomás's project already has a `tests/` folder with `harness.py`, `run_all.py` and `mutation_check.py`, so it scaffolds a test suite for the fetcher. The scaffold is full of `[GAP: ]` markers, and Tomás fills them in. For each check, he writes a test that hands the check the thing it should reject, such as a value out of range or a station id the source does not have. Each test is paired with one that must be accepted. The new suite is registered in the runner. For each check, he adds a mutation that plants the matching defect and names the tests that must fail. Then `bulletproof_run.py check` runs them. The work is done when the suite is green, every new mutation reports `DETECTED`, and `audit` exits 0. Any check that cannot yet be tested is written down as a gap.

## Try It

```
/bulletproof
/bulletproof <the function, page or guard you want covered>
python3 ~/.claude/skills/bulletproof/assets/bulletproof_run.py audit --tests tests
```
