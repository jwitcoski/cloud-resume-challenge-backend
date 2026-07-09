#!/usr/bin/env bash
# Night 33 Teardown — removes local result file only (no AWS resources created)
# Run: bash HTML/study-lab/night-33-lab-architecture-teardown.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-33-architecture-result.json"

if [[ -f "${RESULT_FILE}" ]]; then
  rm -f "${RESULT_FILE}"
  echo "Removed ${RESULT_FILE}"
else
  echo "Nothing to remove — ${RESULT_FILE} not found"
fi
