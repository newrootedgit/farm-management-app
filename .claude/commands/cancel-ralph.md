# Cancel Ralph Loop

Stop the current autonomous Ralph loop.

## Usage

```
/cancel-ralph
```

---

```bash
if [[ -f .claude/ralph-loop.local.md ]]; then
  ITERATION=$(grep '^iteration:' .claude/ralph-loop.local.md | sed 's/iteration: *//')
  echo "FOUND_LOOP=true"
  echo "ITERATION=$ITERATION"
  rm .claude/ralph-loop.local.md
  echo "REMOVED=true"
else
  echo "FOUND_LOOP=false"
fi
```

Based on the script output:

If FOUND_LOOP=false:
"No active Ralph loop found."

If FOUND_LOOP=true:
"Ralph loop cancelled after [ITERATION] iterations."
