#!/usr/bin/env bash
# Night 24 teardown — Athena workgroup, Glue tables/database, night-24 S3 prefix
# Run: bash HTML/study-lab/night-24-lab-athena-teardown.sh

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=298043721974
PREFIX=saa-study-gsa
DATABASE_NAME=saa_study_gsa_analytics
WORK_GROUP="${PREFIX}-athena"
STAGING_TABLE=resort_snapshot_staging
ICEBERG_TABLE=resort_snapshot

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_RESULT="${SCRIPT_DIR}/night-20-migration-result.json"
RESULT_FILE="${SCRIPT_DIR}/night-24-athena-result.json"

aws_text() {
  local out
  out=$(aws "$@" --output text 2>/dev/null) || return 1
  [[ -z "$out" || "$out" == "None" ]] && return 1
  echo "$out"
}

wait_athena() {
  local qid="$1" deadline=$((SECONDS + 600)) state
  while (( SECONDS < deadline )); do
    state=$(aws_text athena get-query-execution --query-execution-id "$qid" --region "$REGION" --query 'QueryExecution.Status.State') || return 0
    [[ "$state" == "SUCCEEDED" || "$state" == "FAILED" || "$state" == "CANCELLED" ]] && return 0
    sleep 3
  done
}

run_athena_sql() {
  local sql="$1" db="$2" out_loc="$3" sql_file qid
  sql_file="$(mktemp)"
  printf '%s' "$sql" > "$sql_file"
  qid=$(aws_text athena start-query-execution \
    --query-string "file://${sql_file//\\/\/}" \
    --query-execution-context "Database=${db}" \
    --work-group "$WORK_GROUP" \
    --result-configuration "OutputLocation=${out_loc}" \
    --region "$REGION" \
    --query QueryExecutionId) || true
  rm -f "$sql_file"
  [[ -n "${qid:-}" ]] && wait_athena "$qid"
}

echo '=== Night 24 Athena lab teardown ==='

BUCKET="${PREFIX}-migration-${ACCOUNT_ID}"
if [[ -f "$RESULT_FILE" ]]; then
  BUCKET=$(python -c "import json; print(json.load(open('$RESULT_FILE')).get('migrationBucket', '$BUCKET'))")
elif [[ -f "$MIGRATION_RESULT" ]]; then
  BUCKET=$(python -c "import json; print(json.load(open('$MIGRATION_RESULT')).get('migrationBucket', '$BUCKET'))")
fi

RESULTS_S3="s3://${BUCKET}/night-24/athena-results/"

if aws_text athena get-work-group --work-group "$WORK_GROUP" --region "$REGION" --query 'WorkGroup.Name' >/dev/null; then
  echo 'Dropping Glue / Iceberg tables via Athena ...'
    run_athena_sql "DROP TABLE IF EXISTS \`${DATABASE_NAME}\`.\`${ICEBERG_TABLE}\`" "$DATABASE_NAME" "$RESULTS_S3"
    run_athena_sql "DROP TABLE IF EXISTS \`${DATABASE_NAME}\`.\`${STAGING_TABLE}\`" "$DATABASE_NAME" "$RESULTS_S3"
fi

aws glue delete-table --database-name "$DATABASE_NAME" --name "$ICEBERG_TABLE" --region "$REGION" 2>/dev/null || true
aws glue delete-table --database-name "$DATABASE_NAME" --name "$STAGING_TABLE" --region "$REGION" 2>/dev/null || true
aws glue delete-database --name "$DATABASE_NAME" --region "$REGION" 2>/dev/null || true
echo "Removed Glue database $DATABASE_NAME (if it existed)."

aws s3 rm "s3://${BUCKET}/night-24/" --recursive 2>/dev/null || true
echo "Removed S3 prefix s3://${BUCKET}/night-24/ (if present)."

aws athena delete-work-group --work-group "$WORK_GROUP" --region "$REGION" --recursive-delete-option 2>/dev/null || true
echo "Deleted Athena workgroup $WORK_GROUP (if it existed)."

rm -f "$RESULT_FILE"
echo 'Night 24 study resources removed. Night 20 migration bucket (night-20/ prefix), Night 16 Aurora, Night 18 DynamoDB unchanged.'
