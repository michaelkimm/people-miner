---
name: create-pr
description: Create a pull request. Auto-detects repository, base branch, and workflow type (fork/direct). Commits changes, pushes to origin, and creates PR with proper formatting.
allowed-tools: Bash, Read, Grep, TodoWrite
---

# Create Pull Request Skill

This skill automates the PR creation process for any repository, auto-detecting workflow type and repository configuration.

## What it does

When you invoke this skill, it will:

1. **Detect workflow type**: Determine if using fork or direct push workflow
2. **Detect base branch**: Auto-detect the default branch (main, master, develop, etc.)
3. **Check current status**: Verify git status and identify uncommitted changes
4. **Commit changes**: Create a commit with proper conventional commit format
   - Include ticket number prefix if detected from branch name (optional)
   - Include conventional commit type (feat, fix, refactor, etc.)
   - Add Claude Code attribution
5. **Push to origin**: Push the current branch to origin
6. **Create PR**: Use `gh pr create` to submit PR to the appropriate target

## Repository Detection

### Workflow Type Detection

The skill automatically detects the workflow type:

```bash
# Check if fork workflow (upstream remote exists)
if git remote | grep -q '^upstream$'; then
  # Fork workflow: PR goes to upstream repo
  WORKFLOW="fork"
  TARGET_REPO=$(git remote get-url upstream | sed -E 's/.*[:/]([^/]+\/[^/]+?)(\.git)?$/\1/')
  HEAD_PREFIX=$(git remote get-url origin | sed -E 's/.*[:/]([^/]+)\/.*$/\1:/')
else
  # Direct workflow: PR goes to origin repo
  WORKFLOW="direct"
  TARGET_REPO=""
  HEAD_PREFIX=""
fi
```

### Base Branch Detection (Priority Order)

1. User-specified branch (if provided)
2. `gh repo view --json defaultBranchRef` (GitHub API)
3. `git symbolic-ref refs/remotes/origin/HEAD` (local reference)
4. Fallback to `main`

### Ticket Prefix Detection (Optional)

Auto-detect from branch name patterns:
- `PROJ-123-feature` → `[PROJ-123]`
- `feature/PROJ-456-add-login` → `[PROJ-456]`
- `fix-bug` → (no prefix)

If no ticket pattern found, the prefix is omitted from commit messages and PR titles.

## Workflow Types

### Fork Workflow (upstream + origin)
- **When**: Remote `upstream` exists
- **PR Target**: `--repo {upstream-owner}/{repo}`
- **Head**: `--head {your-username}:{branch}`

### Direct Workflow (origin only)
- **When**: No `upstream` remote
- **PR Target**: origin repository (no `--repo` flag needed)
- **Head**: current branch (no `--head` flag needed)

## Commit Message Format

```
[TICKET] type: Description

Detailed explanation of changes.
- Bullet points for key changes
- Technical details

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Note**: `[TICKET]` prefix is optional and only included when detected from branch name.

**Commit types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `test`: Test additions/changes
- `chore`: Maintenance tasks

## PR Title Format

```
[TICKET] Brief description of the changes
```

Example with ticket: `[PROJ-123] Add user authentication flow`
Example without ticket: `Add user authentication flow`

## PR Body Structure

```markdown
## Summary
Brief overview of what this PR does.

## Changes
- List of key changes
- Organized by category if needed

## Technical Details
**Modified files:**
- List of modified files with brief explanation

## Test Plan
- [ ] Test case 1
- [ ] Test case 2
- [ ] Test case 3

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Common Workflows

### Fork Workflow (with upstream)
```bash
# 1. Detect configuration
TARGET_REPO=$(git remote get-url upstream | sed -E 's/.*[:/]([^/]+\/[^/]+?)(\.git)?$/\1/')
HEAD_USER=$(git remote get-url origin | sed -E 's/.*[:/]([^/]+)\/.*$/\1/')
BASE_BRANCH=$(gh repo view "$TARGET_REPO" --json defaultBranchRef -q '.defaultBranchRef.name')
BRANCH=$(git branch --show-current)

# 2. Check status and commit (if needed)
git status
git commit -m "[TICKET] type: Description..."

# 3. Push to origin
git push -u origin "$BRANCH"

# 4. Create PR
gh pr create --repo "$TARGET_REPO" \
  --base "$BASE_BRANCH" \
  --head "${HEAD_USER}:${BRANCH}" \
  --title "[TICKET] Title" \
  --body "..."
```

### Direct Workflow (no fork)
```bash
# 1. Detect configuration
BASE_BRANCH=$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name')
BRANCH=$(git branch --show-current)

# 2. Check status and commit (if needed)
git status
git commit -m "[TICKET] type: Description..."

# 3. Push to origin
git push -u origin "$BRANCH"

# 4. Create PR
gh pr create \
  --base "$BASE_BRANCH" \
  --title "[TICKET] Title" \
  --body "..."
```

## Pre-commit Hooks

Some projects use pre-commit hooks that may fail due to dependency issues. In such cases:
- First attempt commit normally
- If hooks fail due to environment/dependency issues (not code issues), use `--no-verify` flag
- Document the reason in commit message if needed

## Usage Examples

### Example 1: User asks to create PR
**User**: "Create a PR for this work"

**Steps**:
1. Detect workflow type and base branch
2. Check git status for uncommitted changes
3. If changes exist, create appropriate commit
4. Push to origin
5. Create PR with auto-detected configuration

### Example 2: User specifies PR details
**User**: "Create a PR with title 'Add user authentication'"

**Steps**:
1. Detect workflow type and base branch
2. Commit any pending changes
3. Push to origin
4. Create PR with specified title and auto-generated body

### Example 3: Already committed, just need PR
**User**: "The commits are ready, create the PR"

**Steps**:
1. Verify commits exist
2. Push to origin (if not already pushed)
3. Create PR directly

## Error Handling

### If commits are not ready
- Ask user if they want to commit current changes
- Suggest reviewing `git status` first

### If push fails
- Check if remote branch exists
- Verify authentication
- Suggest `git push -u origin <branch>`

### If PR already exists
- Provide link to existing PR
- Ask if user wants to update it

### If pre-commit hooks fail
- If failure is due to environment/dependency issues, retry with `--no-verify`
- If failure is due to code issues (lint, tests), inform user and suggest fixes
- Inform user about skipped hooks when using `--no-verify`

## When to use this skill

Use this skill when the user:
- Says "create a PR" or "make a pull request"
- Asks to "submit for review"
- Says "push and create PR"
- Mentions "ready for review"
- Asks to create PR to any branch

## Requirements

- Git repository must be initialized
- Remote `origin` must be configured
- Remote `upstream` required only for fork workflow
- GitHub CLI (`gh`) must be installed and authenticated

## Best Practices

1. **Always check git status first**: Understand what will be committed
2. **Write descriptive commit messages**: Include context and reasoning
3. **Organize PR body clearly**: Make it easy for reviewers
4. **Include test plan**: Show you've thought about testing
5. **Reference ticket number**: Include ticket prefix when available
6. **Skip hooks when necessary**: Use `--no-verify` for dependency issues, but document it
