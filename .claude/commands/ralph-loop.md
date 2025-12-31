# Ralph Loop - Autonomous Iteration Command

Start an autonomous development loop that continues until completion.

## Usage

```
/ralph-loop "Your task description" --max-iterations 20 --completion-promise "DONE"
```

## Arguments

- `prompt` - Your task description (required)
- `--max-iterations <n>` - Stop after N iterations (default: unlimited, use 0)
- `--completion-promise <text>` - Phrase to output when complete

## How It Works

1. You provide a task with clear completion criteria
2. Claude works on the task iteratively
3. Each time Claude tries to exit, the stop hook intercepts
4. Claude sees its previous work and continues improving
5. Loop ends when completion promise is output or max iterations reached

## Example

```
/ralph-loop "Build a REST API for user management.

Requirements:
- CRUD endpoints for users
- Input validation with Zod
- Error handling
- Unit tests with >80% coverage

When ALL requirements are met, output: <promise>COMPLETE</promise>" --max-iterations 30 --completion-promise "COMPLETE"
```

## Best Practices

1. **Clear completion criteria** - Be specific about what "done" means
2. **Set max-iterations** - Always use as a safety net
3. **Use <promise> tags** - Output `<promise>YOUR_PROMISE</promise>` when truly complete
4. **Don't lie to exit** - Only output the promise when the task is actually done

---

```bash
bash .claude/scripts/setup-ralph-loop.sh $ARGUMENTS
```

Based on the script output, respond with:

If RALPH_STARTED=true:
"Ralph loop started!

**Task:** [PROMPT value]
**Max Iterations:** [MAX_ITERATIONS value] (0 = unlimited)
**Completion Promise:** [COMPLETION_PROMISE value]

I'll now work on this task iteratively. When complete, I'll output:
`<promise>[COMPLETION_PROMISE]</promise>`

Let's begin..."

Then immediately start working on the task.
