#!/bin/bash
# resolve-pr-threads.sh — Reply to and resolve a PR review comment thread
# Usage: resolve-pr-threads.sh <pr_number> <comment_id> <reply_body>
#
# 1. Replies to the comment
# 2. Finds the thread ID via GraphQL
# 3. Resolves the thread
#
# Requires: gh CLI authenticated with repo scope

set -euo pipefail

PR="${1:?Usage: resolve-pr-threads.sh <pr_number> <comment_id> <reply_body>}"
COMMENT_ID="${2:?Usage: resolve-pr-threads.sh <pr_number> <comment_id> <reply_body>}"
REPLY_BODY="${3:?Usage: resolve-pr-threads.sh <pr_number> <comment_id> <reply_body>}"

# Get owner/repo from current git remote
REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
OWNER=$(echo "$REPO" | cut -d/ -f1)
NAME=$(echo "$REPO" | cut -d/ -f2)

echo ">>> Replying to comment $COMMENT_ID on PR #$PR..."
gh api "repos/$REPO/pulls/$PR/comments" \
  --method POST \
  -F "in_reply_to=$COMMENT_ID" \
  -f "body=$REPLY_BODY" \
  --jq '.id' 2>&1 || { echo "ERROR: Failed to reply"; exit 1; }

echo ">>> Finding thread ID for comment $COMMENT_ID..."
THREAD_ID=$(gh api graphql -f query="
  { repository(owner:\"$OWNER\", name:\"$NAME\") {
    pullRequest(number:$PR) {
      reviewThreads(first:100) {
        nodes {
          id
          isResolved
          comments(first:1) {
            nodes { databaseId }
          }
        }
      }
    }
  }
}" --jq ".data.repository.pullRequest.reviewThreads.nodes[] | select(.comments.nodes[0].databaseId == $COMMENT_ID) | .id" 2>/dev/null)

if [ -z "$THREAD_ID" ]; then
  echo "WARNING: Could not find thread ID for comment $COMMENT_ID — may be an issue comment, not a review comment"
  exit 0
fi

echo ">>> Resolving thread $THREAD_ID..."
gh api graphql -f query="
  mutation {
    resolveReviewThread(input: {threadId: \"$THREAD_ID\"}) {
      thread { isResolved }
    }
  }
" --jq '.data.resolveReviewThread.thread.isResolved' 2>&1

echo ">>> Done: comment $COMMENT_ID replied and thread resolved"
