# /list-maker — Numbered Work Lists That Last

Your meeting produced more work than one sitting can hold, and next week nobody will agree on which item you meant.

## When You Need This

- You have a meeting transcript, an email thread or notes full of promises and requests
- You want to say "we're on number 14" and have it mean the same item next month
- You work for more than one client or stream and need each to have its own list

## What It Does — And What It Won't

`/list-maker` scans a text file for lines that sound like an obligation ("I'll", "we need to", "can you", "by tomorrow", "follow up") and prints them with line numbers. These are candidates, not items. The scan is over-inclusive on purpose, so you and the toolkit read them and decide what is a real item. Each item gets an owner, a tier from 1 to 4, and a source: a file and a line. The note quotes the source's own words. The items go into a ledger, usually a `worklist.json` in the folder where that stream's transcripts live.

Every item keeps its number for life. Priority moves by tier and the number does not move. A finished item stays in the ledger, and so does a deferred one. Tier 1 is the short list for right now, and the tool warns when it passes seven items. Anything outward-facing, such as an email or a push, is marked now so `/step-by-step` stops on it later. Adding the same meeting again is safe: a repeated item is recognised, not numbered twice.

It does not delete items, and it never sends or pushes anything. It cannot tell who owns an item from the scan alone, because transcription tools often label every speaker with the same account name. Owner comes from what is said. It reads text, so a PDF or Word file must be extracted first with `/readable`. Commit the ledger, or it lives on one disk. A skill, installed by the full install.

## Worked Example

Omar is a research assistant for a client project. He saved a call as `clientA/2026-09-10_call.txt`.

```
/list-maker clientA/2026-09-10_call.txt
```

The toolkit scans the file and prints each line that carries an obligation cue, with its line number. It reads them and keeps the real ones. One line says "I'll send you an email about the infrastructure for the project". It becomes an item owned by Omar, at tier 1, marked outward, with that sentence quoted in the note and its line in the transcript as the source. A vague "it'd be nice if you could just click through that" goes in at tier 4 so it is not lost. The items are added to `clientA/worklist.json`. It shows Omar the numbered list before doing anything else, so he can spot a missing item. Then it hands the list to `/step-by-step`, which by default works it one item per turn.

## Try It

```
/list-maker clientA/2026-09-10_call.txt
/list-maker threads/budget_thread.txt
/list-maker
```

> *Bare `/list-maker` shows what is open on the ledger.*
