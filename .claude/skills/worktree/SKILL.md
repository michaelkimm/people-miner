---
name: worktree
description: Create a git worktree with a new branch. Updates the main branch to latest before creating the worktree. Use when the user wants to start work on a new feature/fix in a separate directory.
allowed-tools: Bash, Read
---

# Create Worktree Skill

This skill automates the creation of git worktrees, ensuring the base branch is up-to-date before creating a new worktree with the specified branch name.

## What it does

When you invoke this skill, it will:

1. **Detect base branch**: Auto-detect the default branch (main, master, etc.)
2. **Fetch latest**: Fetch from origin (and upstream if fork workflow)
3. **Update base branch**: Fast-forward the base branch to latest
4. **Create worktree**: Create a new worktree with the specified branch name

## Workflow

```bash
# 1. Detect base branch
BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
if [ -z "$BASE_BRANCH" ]; then
  BASE_BRANCH="main"
fi

# 2. Get repo name
REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")

# 3. Fetch latest
git fetch origin
# If upstream exists (fork workflow):
git fetch upstream

# 4. Update base branch (without checkout)
git fetch origin "$BASE_BRANCH":"$BASE_BRANCH"
# Or if upstream exists:
git fetch upstream "$BASE_BRANCH":"$BASE_BRANCH"

# 5. Create worktree with new branch
# Folder name: {repo-name}-{branch-name} (slashes replaced with hyphens)
FOLDER_NAME="${REPO_NAME}-$(echo '<branch-name>' | tr '/' '-')"
git worktree add ../"$FOLDER_NAME" -b <branch-name> "$BASE_BRANCH"
```

## Worktree Location

Worktrees are created as sibling directories with format `{repo-name}-{branch-name}`:
```
parent-directory/
├── my-repo/                      # Main repository (current)
├── my-repo-feature-dark-mode/    # Worktree for feature/dark-mode
└── my-repo-fix-bug/              # Worktree for fix-bug
```

## Usage

**Basic usage**:
```
/worktree feature/add-login
# Creates: ../myrepo-feature-add-login (branch: feature/add-login)
```

**With ticket prefix**:
```
/worktree PROJ-123-add-authentication
# Creates: ../myrepo-PROJ-123-add-authentication (branch: PROJ-123-add-authentication)
```

## Arguments

- `<branch-name>`: Required. The name for the new branch. Folder name will be `{repo-name}-{branch-name}` with slashes replaced by hyphens.

## Examples

### Example 1: Create feature worktree
**User**: `/worktree feature/dark-mode`

**Result** (assuming repo name is `my-app`):
- Fetches latest from origin
- Updates main branch
- Creates worktree at `../my-app-feature-dark-mode` with branch `feature/dark-mode`

### Example 2: Create worktree with ticket
**User**: `/worktree PROJ-456-fix-auth`

**Result** (assuming repo name is `my-app`):
- Fetches latest
- Updates main branch
- Creates worktree at `../my-app-PROJ-456-fix-auth` with branch `PROJ-456-fix-auth`

## Error Handling

### Worktree already exists
```
fatal: '../branch-name' already exists
```
- Inform user the worktree already exists
- Suggest `cd ../branch-name` to switch to it

### Branch already exists
```
fatal: a branch named 'branch-name' already exists
```
- Ask user if they want to use the existing branch
- Or suggest a different branch name

### Uncommitted changes in base branch
- Warn user about uncommitted changes
- Suggest committing or stashing before proceeding

## Requirements

- Git repository must be initialized
- Git version 2.5+ (worktree support)
- Remote `origin` must be configured

## Related Commands

```bash
# List all worktrees
git worktree list

# Remove a worktree
git worktree remove ../myrepo-branch-name

# Prune stale worktrees
git worktree prune
```

## Best Practices

1. **Use descriptive branch names**: Makes it easier to identify worktrees
2. **Clean up old worktrees**: Remove worktrees after PR is merged
3. **Keep base branch updated**: This skill does it automatically
