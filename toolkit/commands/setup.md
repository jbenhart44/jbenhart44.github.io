# /setup — Toolkit Setup Interview

You just installed the toolkit, and now every command needs to know your project name, your folders and your workstreams.

## When You Need This

- You have just installed the toolkit and want the other commands to use your folders, not default ones
- Your project changed shape: a new workstream, or a folder you moved
- A command asked you for a value it could not find, and you want to answer once for all of them

## What It Does — And What It Won't

`/setup` is a short interview. It asks about your project and writes one file, `~/.claude/toolkit-config.md`, which the other commands read. It asks for your project name, the author name for summaries, your workstreams, three folders (daily summaries, weekly summaries, run evidence), whether the project is research or teaching, and which Claude account you use. It looks first and offers what it finds as defaults: the repository name, your git user name, and the top-level folders of the project. It asks in at most four short rounds.

If the file already exists, `/setup` updates it. It shows each current value as the default and keeps any key it does not recognise. It shows you the complete file and writes it only after you say "yes". It creates the three folders if they do not exist.

It does not ask for anything beyond those keys. Some optional values are asked later, by the command that needs them. It does not store secrets: if you offer an API key or a token, it tells you where that belongs instead. Other commands still work if you skip `/setup`. They use defaults and ask for a missing value the first time they need it. `/setup` is in both install modes, the full install and `--minimal`.

## Worked Example

Tomas has just installed the toolkit and opened Claude Code in his thesis repository.

```
/setup
```

`/setup` offers the repository name as the project name, his git user name as the author, and the top-level folders as workstreams, each marked as detected. It asks which Claude account he uses and runs a few read-only checks. It prints the names of any relevant settings that are set, never their values. Tomas accepts the folder defaults. `/setup` then shows the whole config file and asks for a "yes". He says yes. It writes `~/.claude/toolkit-config.md`, creates the summary, weekly and evidence folders, and closes with three lines: the file written, the folders created, and the next command to try, `/startup` or `/help`.

## Try It

```
/setup
/setup    (run it again later to change an answer)
```
