# Worktree Skill - Examples

## Example 1: Basic Feature Worktree (Direct Workflow)

**Scenario**: User wants to start a new feature in a fresh worktree

**User Input**:
```
/worktree feature/add-notifications
```

**Agent Actions**:

1. **Detect base branch**:
```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
# Shows: main
```

2. **Check for upstream (workflow detection)**:
```bash
git remote | grep -q '^upstream$'
# No upstream - direct workflow
```

3. **Fetch latest from origin**:
```bash
git fetch origin
# Fetching origin...
```

4. **Update main branch without checkout**:
```bash
git fetch origin main:main
# Updated main to latest
```

5. **Get repo name and create worktree**:
```bash
REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")
# Shows: myrepo

git worktree add ../myrepo-feature-add-notifications -b feature/add-notifications main
# Preparing worktree (new branch 'feature/add-notifications')
# HEAD is now at abc1234 Latest commit message
```

**Output**:
```
Worktree created successfully!
- Location: ../myrepo-feature-add-notifications
- Branch: feature/add-notifications
- Based on: main (updated to latest)

To start working:
  cd ../myrepo-feature-add-notifications
```

---

## Example 2: Fork Workflow (with upstream)

**Scenario**: User has forked a repo and wants to create a worktree

**User Input**:
```
/worktree fix/memory-leak
```

**Agent Actions**:

1. **Detect base branch**:
```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
# Shows: main
```

2. **Check for upstream**:
```bash
git remote | grep -q '^upstream$'
# upstream exists - fork workflow
```

3. **Fetch from both remotes**:
```bash
git fetch origin
git fetch upstream
```

4. **Update main from upstream**:
```bash
git fetch upstream main:main
# Updated main to upstream's latest
```

5. **Get repo name and create worktree**:
```bash
REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")
# Shows: popular-lib

git worktree add ../popular-lib-fix-memory-leak -b fix/memory-leak main
```

**Output**:
```
Worktree created successfully!
- Location: ../popular-lib-fix-memory-leak
- Branch: fix/memory-leak
- Based on: main (synced with upstream)

To start working:
  cd ../popular-lib-fix-memory-leak
```

---

## Example 3: Worktree with Ticket Number

**Scenario**: User follows ticket-based branch naming

**User Input**:
```
/worktree PROJ-789-implement-caching
```

**Agent Actions**:

1. **Fetch and update main**:
```bash
git fetch origin
git fetch origin main:main
```

2. **Get repo name and create worktree**:
```bash
REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")
# Shows: myproject

git worktree add ../myproject-PROJ-789-implement-caching -b PROJ-789-implement-caching main
```

**Output**:
```
Worktree created successfully!
- Location: ../myproject-PROJ-789-implement-caching
- Branch: PROJ-789-implement-caching
- Based on: main (updated to latest)

To start working:
  cd ../myproject-PROJ-789-implement-caching
```

---

## Example 4: Different Base Branch (develop)

**Scenario**: Repository uses `develop` as the default branch

**User Input**:
```
/worktree feature/new-api
```

**Agent Actions**:

1. **Detect base branch**:
```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
# Shows: develop
```

2. **Fetch and update develop**:
```bash
git fetch origin
git fetch origin develop:develop
```

3. **Get repo name and create worktree based on develop**:
```bash
REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")
# Shows: backend-api

git worktree add ../backend-api-feature-new-api -b feature/new-api develop
```

**Output**:
```
Worktree created successfully!
- Location: ../backend-api-feature-new-api
- Branch: feature/new-api
- Based on: develop (updated to latest)
```

---

## Example 5: Simple Branch Name

**Scenario**: User provides a simple branch name without prefix

**User Input**:
```
/worktree dark-mode
```

**Agent Actions**:

```bash
REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")
# Shows: my-app

git fetch origin
git fetch origin main:main
git worktree add ../my-app-dark-mode -b dark-mode main
```

**Output**:
```
Worktree created successfully!
- Location: ../my-app-dark-mode
- Branch: dark-mode
- Based on: main (updated to latest)

To start working:
  cd ../my-app-dark-mode
```

---

## Error Handling Examples

### Error: Worktree directory already exists

**User Input**:
```
/worktree feature/existing
```

**Agent Actions**:
```bash
git worktree add ../myrepo-feature-existing -b feature/existing main
# fatal: '../myrepo-feature-existing' already exists
```

**Agent Response**:
```
A worktree already exists at ../myrepo-feature-existing

Options:
1. Switch to it: cd ../myrepo-feature-existing
2. Remove it first: git worktree remove ../myrepo-feature-existing
3. Use a different name: /worktree feature/existing-v2
```

---

### Error: Branch already exists

**User Input**:
```
/worktree feature/old-branch
```

**Agent Actions**:
```bash
git worktree add ../myrepo-feature-old-branch -b feature/old-branch main
# fatal: a branch named 'feature/old-branch' already exists
```

**Agent Response**:
```
Branch 'feature/old-branch' already exists.

Options:
1. Use existing branch: git worktree add ../myrepo-feature-old-branch feature/old-branch
2. Delete the branch first: git branch -D feature/old-branch
3. Use a different name: /worktree feature/old-branch-v2

Would you like me to use the existing branch?
```

---

### Error: Cannot update base branch (local changes)

**Agent Actions**:
```bash
git fetch origin main:main
# error: cannot fast-forward local branch 'main'
```

**Agent Response**:
```
Cannot fast-forward main branch. It may have local commits.

Proceeding with current local main branch state.
Note: Your worktree may not be based on the latest upstream changes.

To fix: checkout main and pull/reset to origin/main
```

---

## Utility Commands Reference

### List all worktrees
```bash
git worktree list
# /path/to/myrepo                     abc1234 [main]
# /path/to/myrepo-feature-a           def5678 [feature-a]
# /path/to/myrepo-fix-bug             ghi9012 [fix-bug]
```

### Remove a worktree
```bash
git worktree remove ../myrepo-feature-a
# Or force remove:
git worktree remove --force ../myrepo-feature-a
```

### Prune stale worktree references
```bash
git worktree prune
```

### Move a worktree
```bash
git worktree move ../myrepo-old-name ../myrepo-new-name
```
