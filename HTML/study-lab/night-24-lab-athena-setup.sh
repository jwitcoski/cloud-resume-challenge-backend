#!/usr/bin/env bash
# Night 24 Lab 3B — Athena + Glue catalog + Iceberg resort snapshot
# Run: bash HTML/study-lab/night-24-lab-athena-setup.sh [--run-query] [--skip-seed]

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=298043721974
PREFIX=saa-study-gsa
DATABASE_NAME=saa_study_gsa_analytics
WORK_GROUP="${PREFIX}-athena"
STAGING_TABLE=resort_snapshot_staging
ICEBERG_TABLE=resort_snapshot
TAG_KEY=saa-study-analytics
TAG_VALUE=night-24

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_RESULT="${SCRIPT_DIR}/night-20-migration-result.json"
SEED_SCRIPT="${SCRIPT_DIR}/night-24-lab-seed-parquet.py"
RESULT_FILE="${SCRIPT_DIR}/night-24-athena-result.json"
PARQUET_FILE="${TMPDIR:-/tmp}/night24-resort-snapshot.parquet"

RUN_QUERY=false
SKIP_SEED=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-query) RUN_QUERY=true; shift ;;
    --skip-seed) SKIP_SEED=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

aws_text() {
  local out
  out=$(aws "$@" --output text 2>/dev/null) || return 1
  [[ -z "$out" || "$out" == "None" ]] && return 1
  echo "$out"
}

wait_athena() {
  local qid="$1" deadline=$((SECONDS + 600)) state
  while (( SECONDS < deadline )); do
    state=$(aws_text athena get-query-execution --query-execution-id "$qid" --region "$REGION" --query 'QueryExecution.Status.State') || state=UNKNOWN
    echo "  Athena query $qid : $state"
    [[ "$state" == "SUCCEEDED" ]] && return 0
    [[ "$state" == "FAILED" || "$state" == "CANCELLED" ]] && {
      aws athena get-query-execution --query-execution-id "$qid" --region "$REGION" --query 'QueryExecution.Status.StateChangeReason' --output text
      return 1
    }
    sleep 3
  done
  echo "Timed out waiting for Athena query $qid" >&2
  return 1
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
    --query QueryExecutionId)
  rm -f "$sql_file"
  [[ -n "$qid" ]] || { echo "start-query-execution failed" >&2; return 1; }
  wait_athena "$qid"
  echo "$qid"
}

echo '=== Night 24 Lab 3B — Athena on Iceberg ==='

BUCKET="${PREFIX}-migration-${ACCOUNT_ID}"
if [[ -f "$MIGRATION_RESULT" ]]; then
  BUCKET=$(python -c "import json; print(json.load(open('$MIGRATION_RESULT')).get('migrationBucket', '$BUCKET'))")
else
  echo "WARN: $MIGRATION_RESULT missing — using default bucket $BUCKET"
fi

aws s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1 || {
  echo "ERROR: S3 bucket $BUCKET not found. Run night-20-lab-migration-setup first." >&2
  exit 1
}
echo "Migration bucket: $BUCKET"

STAGING_PREFIX=night-24/staging/resort_snapshot
ICEBERG_PREFIX=night-24/iceberg/resort_snapshot
RESULTS_PREFIX=night-24/athena-results
STAGING_S3="s3://${BUCKET}/${STAGING_PREFIX}/"
ICEBERG_S3="s3://${BUCKET}/${ICEBERG_PREFIX}/"
RESULTS_S3="s3://${BUCKET}/${RESULTS_PREFIX}/"

SEED_META='null'
if [[ "$SKIP_SEED" == false ]]; then
  echo 'Generating sample resort Parquet (Aurora snapshot stand-in) ...'
  SEED_META=$(python "$SEED_SCRIPT" "$PARQUET_FILE")
  echo "  Rows: $(echo "$SEED_META" | python -c "import json,sys; print(json.load(sys.stdin)['rowCount'])")"
  echo "Uploading to $STAGING_S3 ..."
  aws s3 cp "$PARQUET_FILE" "$STAGING_S3" --region "$REGION"
else
  echo 'Skipping Parquet seed (--skip-seed).'
fi

if ! aws_text glue get-database --name "$DATABASE_NAME" --region "$REGION" --query 'Database.Name' >/dev/null; then
  echo "Creating Glue database $DATABASE_NAME ..."
  aws glue create-database --database-input "Name=${DATABASE_NAME},Description=Night 24 GSA analytics catalog" --region "$REGION"
else
  echo "Glue database $DATABASE_NAME already exists."
fi

if ! aws_text athena get-work-group --work-group "$WORK_GROUP" --region "$REGION" --query 'WorkGroup.Name' >/dev/null; then
  echo "Creating Athena workgroup $WORK_GROUP ..."
  wg_file="$(mktemp)"
  cat > "$wg_file" <<EOF
{
  "Name": "$WORK_GROUP",
  "Configuration": {
    "ResultConfiguration": { "OutputLocation": "$RESULTS_S3" },
    "EnforceWorkGroupConfiguration": true,
    "PublishCloudWatchMetricsEnabled": true,
    "EngineVersion": { "SelectedEngineVersion": "Athena engine version 3" }
  },
  "Description": "Night 24 study lab — resort analytics SQL",
  "Tags": [
    { "Key": "$TAG_KEY", "Value": "$TAG_VALUE" },
    { "Key": "Project", "Value": "$PREFIX" }
  ]
}
EOF
  aws athena create-work-group --cli-input-json "file://${wg_file//\\/\/}" --region "$REGION"
  rm -f "$wg_file"
else
  echo "Athena workgroup $WORK_GROUP already exists."
fi

echo 'Resetting study tables (idempotent) ...'
drop_iceberg="DROP TABLE IF EXISTS \`${DATABASE_NAME}\`.\`${ICEBERG_TABLE}\`"
drop_staging="DROP TABLE IF EXISTS \`${DATABASE_NAME}\`.\`${STAGING_TABLE}\`"
run_athena_sql "$drop_iceberg" "$DATABASE_NAME" "$RESULTS_S3" >/dev/null
run_athena_sql "$drop_staging" "$DATABASE_NAME" "$RESULTS_S3" >/dev/null

CREATE_STAGING="CREATE EXTERNAL TABLE \`${DATABASE_NAME}\`.\`${STAGING_TABLE}\` (
  resort_id string,
  resort_name string,
  country_code string,
  monthly_runs int
)
STORED AS PARQUET
LOCATION '${STAGING_S3}'"

echo 'Registering staging Parquet table in Glue catalog ...'
run_athena_sql "$CREATE_STAGING" "$DATABASE_NAME" "$RESULTS_S3" >/dev/null

CREATE_ICEBERG="CREATE TABLE \"${DATABASE_NAME}\".\"${ICEBERG_TABLE}\"
WITH (
  table_type = 'ICEBERG',
  format = 'PARQUET',
  location = '${ICEBERG_S3}',
  is_external = false
)
AS
SELECT resort_id, resort_name, country_code, monthly_runs
FROM \"${DATABASE_NAME}\".\"${STAGING_TABLE}\""

echo 'Creating Iceberg table via CTAS (Athena engine v3) ...'
run_athena_sql "$CREATE_ICEBERG" "$DATABASE_NAME" "$RESULTS_S3" >/dev/null

AGG_SQL="SELECT country_code, COUNT(*) AS resort_count
FROM \"${DATABASE_NAME}\".\"${ICEBERG_TABLE}\"
GROUP BY country_code
ORDER BY resort_count DESC, country_code"

QUERY_ID='null'
QUERY_ROWS='[]'
if [[ "$RUN_QUERY" == true || "$SKIP_SEED" == false ]]; then
  echo 'Running resort counts by country ...'
  QUERY_ID=$(run_athena_sql "$AGG_SQL" "$DATABASE_NAME" "$RESULTS_S3")
  QUERY_ROWS=$(aws athena get-query-results --query-execution-id "$QUERY_ID" --region "$REGION" --output json | python - <<'PY'
import json, sys
rows = json.load(sys.stdin)["ResultSet"]["Rows"]
out = []
for row in rows[1:]:
    d = row["Data"]
    out.append({"country_code": d[0].get("VarCharValue"), "resort_count": int(d[1]["VarCharValue"])})
print(json.dumps(out))
PY
)
  echo 'Query results:'
  echo "$QUERY_ROWS" | python -m json.tool
fi

python - <<PY
import json
from datetime import datetime, timezone
result = {
    "lab": "night-24-lab3b-athena-iceberg",
    "region": "$REGION",
    "completedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "migrationBucket": "$BUCKET",
    "glue": {
        "databaseName": "$DATABASE_NAME",
        "stagingTable": "$STAGING_TABLE",
        "icebergTable": "$ICEBERG_TABLE",
        "stagingLocation": "$STAGING_S3",
        "icebergLocation": "$ICEBERG_S3",
    },
    "athena": {
        "workGroupName": "$WORK_GROUP",
        "resultsLocation": "$RESULTS_S3",
        "aggregateQueryId": None if "$QUERY_ID" == "null" else "$QUERY_ID",
        "aggregateSql": """$AGG_SQL""".replace("\n", " ").strip(),
    },
    "seed": json.loads('''$SEED_META''') if '''$SEED_META''' != 'null' else None,
    "queryResults": json.loads('''$QUERY_ROWS'''),
    "tag": "${TAG_KEY}=${TAG_VALUE}",
}
with open(r"$RESULT_FILE", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)
PY

echo ''
echo "Result saved: $RESULT_FILE"
echo 'Teardown: bash HTML/study-lab/night-24-lab-athena-teardown.sh'
