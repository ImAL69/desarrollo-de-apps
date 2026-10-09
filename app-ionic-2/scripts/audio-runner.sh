#!/bin/bash
# Robust audio generation wrapper: runs the generator in chunks with pauses.
# Restarts the generator if it dies, waits for rate limit to reset on 429s.
set -u
SCRIPT="/home/z/pokedex-ionic-dev/app-ionic-2/scripts/generate-audio.mjs"
LOG="/home/z/pokedex-ionic-dev/app-ionic-2/scripts/audio-bg.log"
cd /home/z/my-project

# Loop: keep calling the generator in "resume" mode until 0 missing files
while true; do
  COUNT=$(ls /home/z/pokedex-ionic-dev/app-ionic-2/src/assets/audio/pokemon/*.mp3 2>/dev/null | wc -l)
  echo "[$(date '+%H:%M:%S')] Current count: $COUNT/151" >> "$LOG"
  if [ "$COUNT" -ge 151 ]; then
    echo "[$(date '+%H:%M:%S')] All 151 generated!" >> "$LOG"
    break
  fi
  echo "[$(date '+%H:%M:%S')] Running generator (resume mode)..." >> "$LOG"
  timeout 600 node "$SCRIPT" resume >> "$LOG" 2>&1
  EXIT=$?
  echo "[$(date '+%H:%M:%S')] Generator exited with $EXIT, sleeping 30s before retry" >> "$LOG"
  sleep 30
done
echo "[$(date '+%H:%M:%S')] Wrapper complete" >> "$LOG"
