# /step-by-step — One Thing at a Time

You changed a lot in one session, and a summary written from memory will skip the things you forgot you did.

## When You Need This

- A session changed several files or repositories and you need to understand each change
- You want to be walked through the work and have the toolkit prove nothing was skipped
- You have a numbered `/list-maker` list and want to work through it one item per turn

## What It Does — And What It Won't

`/step-by-step` works on two subjects. The first is a manifest of what a session changed. The list comes from git, never from memory: it holds the commits in the window and everything still uncommitted or untracked. The toolkit shows you the numbered list first. Then it explains one item per turn in three beats: what changed, why, and whether it is closed. It marks the item as covered and stops. It does not ask "shall I continue?" Your next message is the signal. Before it will call the walkthrough finished, a script checks that every item was explained. If one was not, it names what is left.

The second subject is the numbered work list that `/list-maker` keeps. There you can walk it, which explains one open item per turn and changes nothing. Or you can execute it: the toolkit does the next item in full, under the project's own rules, marks it done with its evidence, and stops. An item marked outward, such as an email or a push, stops for your approval first. When every tier-1 item is done, deferred or dropped, it stops and asks before starting a new list.

It does not judge the work, so it is not a review. While walking a manifest it changes nothing. It does not write a summary, which belongs to `/daily-summary`. An empty window is an error, because "nothing happened" is an answer a walkthrough must never invent. A skill, installed by the full install.

## Worked Example

Lena spent an afternoon changing her analysis repository. She made a few commits and left some files uncommitted.

```
/step-by-step walk me through what changed this afternoon in the analysis repository
```

The toolkit builds the manifest from git and shows Lena a numbered list of the commits and the uncommitted and untracked files. It orders the items so each one builds on the one before. It takes the first item and tells her what changed, why, and whether it is closed, closed with a caveat, or still open. Then it marks the item covered and stops. When Lena types "next", she gets the next item. At the end, the check passes only if every item was explained.

## Try It

```
/step-by-step
/step-by-step walk the work list in clientA/worklist.json
/step-by-step execute the work list in clientA/worklist.json
```
