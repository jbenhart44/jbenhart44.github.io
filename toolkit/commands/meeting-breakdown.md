# /meeting-breakdown — Per-Domain Meeting Plan

Your advisor talked for an hour about five different projects, and now you cannot tell what to do first or what to leave alone.

## When You Need This

- You have a transcript of an advisor, client or collaborator meeting that covers more than one thread of work
- You want the decisions, next steps and deferrals for each thread in one place, so you can read one section at a time
- You want a second, skeptical reading of the advice, to see which "yes" is cheap to say and costly to do

## What It Does — And What It Won't

`/meeting-breakdown` reads the whole transcript and splits it into domains. If your project file names workstreams, it uses those. If not, it proposes four to eight domains from what the meeting covered. Then a team of agents works on it: a conventional Player, an adversarial Player, a Coach for each, and a Cross-Reviewer. The result is one file with a section per domain. Each section holds the decisions you own, the actions for this week, this month and later, and the deferrals. Every direction or number is tied to its line number in the transcript. The file is saved next to the transcript as `<stem>_breakdown.md`. If that name is taken, it adds the date. It never overwrites an earlier breakdown.

On a smaller plan (Pro, a Team Standard seat, "not sure", or no answer in your config) it runs two agents: Player A and Coach C. Coach C also writes the adversarial reading. Every other plan runs all five agents. You can ask for a "full run" or a "light run" in your request. The full run costs roughly 100K to 250K tokens for a one-hour meeting. The light run costs about two fifths of that.

It does not make decisions for you. It never puts a number in a next step unless the transcript or a named file states it. All the agents are the same model, so when they agree, that is not independent confirmation. If the transcript is over 5,000 lines, it says the run will be heavy and offers a single-agent summary or a split by section first. A skill, installed by the full install.

## Worked Example

Dana is a second-year PhD student. She recorded a one-hour meeting with her advisor and saved the transcript as `meetings/4_23.txt`. She is on a smaller plan.

```
/meeting-breakdown 4_23
```

The toolkit finds `meetings/4_23.txt`, prints one line saying it is a light run with two agents, and proceeds without asking. It shows the list of domains it chose and uses it unless Dana corrects it. When the run ends, it saves `meetings/4_23_breakdown.md` and shows it in the conversation. Each domain section has the decisions Dana owns, with a recommendation and its line number in the transcript, then her actions sorted into this week, this month and later, then the deferrals. It also checks its own run files and reports a verdict. At the end it offers to put the actions on a numbered work list with `/list-maker`.

## Try It

```
/meeting-breakdown meetings/2026-04-23.txt
/meeting-breakdown 4_23
/meeting-breakdown 4_23 full run
```
