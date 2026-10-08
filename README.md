# claude-tldr-length

A Claude Code hook that sends a long answer back once to be rewritten as a tldr.

Rules about brevity at the top of the context fade as the session grows. This one checks every
answer, after it is written.

```
Answer is 951 characters, limit 600. Rewrite it as a tldr below, following ASD-STE100 writing rules
adapted to the answer's language: one idea per sentence, active voice, one word per meaning, no
terms coined in this session.
```

## Install

```
/plugin marketplace add mikhin/claude-plugins
/plugin install tldr-length@mikhin
```

Installed it with `curl` before? Remove its entry from `~/.claude/settings.json`, or it runs twice.

Needs Node 18+.

## Configure

| Variable     | Default | What it is                                   |
| ------------ | ------- | -------------------------------------------- |
| `TLDR_LIMIT` | `600`   | Longest answer, in characters, let through   |

A prompt containing `подробно` or `detail` lets a long answer through.

## How it works

When Claude stops, the hook measures `last_assistant_message` from the hook input. Over
`TLDR_LIMIT` exits `2`, which is how a `Stop` hook makes Claude continue: the message goes back to
Claude, and the tldr is written below the long answer. The second stop carries `stop_hook_active`
and always passes, so an answer is sent back at most once.

The prompt is read from `transcript_path`. The answer is not: the transcript is written
asynchronously and may not hold the final message yet when the hook runs.

## Caveats

- The long answer stays on screen and is already paid for. The rewrite costs one more request,
  the same as typing "tldr" yourself.
- Only the last message counts, not text written between tool calls.

## License

MIT
