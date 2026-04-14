#!/bin/bash
# run-opencode.sh — Run opencode with activity-based watchdog
# Usage: run-opencode.sh [--devcontainer] <model> <idle_timeout_secs> <max_retries> <prompt...>
#
# Monitors opencode output. If no new output appears for $idle_timeout_secs,
# kills the process and retries (up to $max_retries times).
#
# --devcontainer: Run opencode inside the devcontainer via `devcontainer exec`

USE_DEVCONTAINER=false
if [ "$1" = "--devcontainer" ]; then
  USE_DEVCONTAINER=true
  shift
fi

MODEL="${1:?Usage: run-opencode.sh [--devcontainer] <model> <idle_timeout> <max_retries> <prompt...>}"
IDLE_TIMEOUT="${2:-120}"
MAX_RETRIES="${3:-2}"
shift 3
PROMPT="$*"

ATTEMPT=0

while [ $ATTEMPT -lt $MAX_RETRIES ]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo ">>> opencode attempt $ATTEMPT of $MAX_RETRIES (idle timeout: ${IDLE_TIMEOUT}s)" >&2

  OUTFILE=$(mktemp /tmp/opencode-out.XXXXXX)

  # Start opencode in background, tee output to file and stdout
  if [ "$USE_DEVCONTAINER" = true ]; then
    devcontainer exec --workspace-folder . \
      opencode run -m "$MODEL" --dangerously-skip-permissions "$PROMPT" > "$OUTFILE" 2>&1 &
  else
    opencode run -m "$MODEL" --dangerously-skip-permissions "$PROMPT" > "$OUTFILE" 2>&1 &
  fi
  OC_PID=$!

  LAST_SIZE=0
  IDLE_COUNT=0

  POLL_INTERVAL=3

  while kill -0 $OC_PID 2>/dev/null; do
    sleep $POLL_INTERVAL
    CURRENT_SIZE=$(wc -c < "$OUTFILE" 2>/dev/null || echo 0)

    if [ "$CURRENT_SIZE" -gt "$LAST_SIZE" ]; then
      # Output is growing — reset idle counter
      IDLE_COUNT=0
      LAST_SIZE=$CURRENT_SIZE
    else
      IDLE_COUNT=$((IDLE_COUNT + POLL_INTERVAL))
    fi

    if [ "$IDLE_COUNT" -ge "$IDLE_TIMEOUT" ]; then
      echo ">>> opencode idle for ${IDLE_COUNT}s — killing (attempt $ATTEMPT)" >&2
      kill $OC_PID 2>/dev/null
      wait $OC_PID 2>/dev/null
      break
    fi
  done

  # Check if process exited naturally
  wait $OC_PID 2>/dev/null
  EXIT_CODE=$?

  # Print captured output
  cat "$OUTFILE"
  rm -f "$OUTFILE"

  if [ $EXIT_CODE -eq 0 ]; then
    exit 0
  fi

  if [ $IDLE_COUNT -ge $IDLE_TIMEOUT ] && [ $ATTEMPT -lt $MAX_RETRIES ]; then
    echo ">>> Retrying..." >&2
    # Kill any child processes of OC_PID (safe — only targets our tree)
    pkill -P $OC_PID 2>/dev/null || true
    sleep 1
    continue
  fi

  # Non-timeout failure or last attempt
  exit $EXIT_CODE
done

echo ">>> All $MAX_RETRIES attempts failed" >&2
exit 1
