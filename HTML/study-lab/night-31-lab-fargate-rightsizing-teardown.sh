#!/usr/bin/env bash
# Night 31 teardown — remove result file only
# Run: bash HTML/study-lab/night-31-lab-fargate-rightsizing-teardown.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-31-fargate-rightsizing-result.json"

echo "=== Night 31 Fargate right-sizing lab teardown ==="
if [[ -f "$RESULT_FILE" ]]; then
  rm -f "$RESULT_FILE"
  echo "Removed $RESULT_FILE"
else
  echo "No result file to remove."
fi
echo "Teardown complete. Iceland ECS task definition was not modified."
