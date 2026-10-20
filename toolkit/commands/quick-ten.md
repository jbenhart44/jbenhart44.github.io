# /quick-ten — Questions Before a Build

You are about to ask for a big document or script, and you know the first draft will miss something you meant.

## When You Need This

- You are starting a substantial build, redesign, document or plan and want it aimed right the first time
- You have a request in mind but have not yet decided audience, scope or what "done" means
- You want your decisions written down so the build can be checked against them

## What It Does — And What It Won't

`/quick-ten` asks the questions whose answers would change what gets built, at most ten, most important first. It keeps a question only if it can say how the build changes when the answer changes. It never asks what your request already told it. It asks in rounds of one to three questions, with a recommended option first so you can accept quickly. Then it shows a recap of your answers, writes a short brief named `quickten_brief_{slug}.md` with a "Decisions Locked" table, and starts the build. The build cites the brief and flags any need to depart from it.

Ten is the most it asks. It has no minimum, and it stops where the questions stop mattering, even at three. It runs one pass by default. It convenes a council of agents only when the task has three or more conflicting stakeholder views. It skips itself, and says so, when the task is small, easy to undo, already well specified, or when you say to use your judgment. It does not invent answers: a question you decline stays `[open]` in the brief.

`/quick-ten` is a skill, installed by the full install. It is not in the `--minimal` install.

## Worked Example

Omar needs a two-page summary of his pilot study for his committee.

```
/quick-ten build a two-page summary of my pilot study for my committee
```

`/quick-ten` states what it will build, for whom, and its one job. Omar already named the audience, so it does not ask about it. It picks a few questions from its checklist, such as what "done" looks like and what the summary should leave out, and asks them in one or two short rounds with a recommended option first. It then shows a recap, one line per question and answer, and waits for Omar to confirm or correct a line. It saves the brief as `quickten_brief_{slug}.md` and starts the summary, citing the brief.

## Try It

```
/quick-ten
/quick-ten <describe the build>
/quick-ten build a one-page handout for my methods workshop
```
