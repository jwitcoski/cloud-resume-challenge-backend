#!/usr/bin/env bash
# Night 19 Lab — AWS Backup vault + plan + tag selection on Night 18 DynamoDB table
# Run from repo: bash HTML/study-lab/night-19-lab-backup-setup.sh
#
# Options:
#   --on-demand-backup   start immediate backup job for study table
#   --verify-job         poll job until COMPLETED (requires --on-demand-backup)
#   --skip-tag           skip tagging table (assume tag already present)

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=298043721974
PREFIX=saa-study-gsa
TABLE_NAME="${PREFIX}-wiki-views"
VAULT_NAME="${PREFIX}-backup-vault"
PLAN_NAME="${PREFIX}-night19-plan"
SELECTION_NAME="${PREFIX}-night19-selection"
ROLE_NAME="${PREFIX}-backup-role"
TAG_KEY=saa-study-backup
TAG_VALUE=night-19

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRUST_POLICY_FILE="${SCRIPT_DIR}/night-19-backup-trust-policy.json"
RESULT_FILE="${SCRIPT_DIR}/night-19-backup-result.json"

ON_DEMAND=false
VERIFY_JOB=false
SKIP_TAG=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --on-demand-backup) ON_DEMAND=true; shift ;;
    --verify-job) VERIFY_JOB=true; shift ;;
    --skip-tag) SKIP_TAG=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ "$VERIFY_JOB" == true && "$ON_DEMAND" == false ]]; then
  echo "--verify-job requires --on-demand-backup"
  exit 1
fi

echo "=== Night 19 Lab — AWS Backup ==="
echo "Table:     $TABLE_NAME"
echo "Vault:     $VAULT_NAME"
echo "Plan:      $PLAN_NAME"
echo ""

TABLE_ARN=$(aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" \
  --query 'Table.TableArn' --output text 2>/dev/null || true)
if [[ -z "$TABLE_ARN" || "$TABLE_ARN" == "None" ]]; then
  echo "ERROR: Table $TABLE_NAME not found. Run Night 18 setup first:"
  echo "  bash HTML/study-lab/night-18-lab-dynamodb-setup.sh"
  exit 1
fi
echo "Study table ARN: $TABLE_ARN"

if [[ "$SKIP_TAG" == false ]]; then
  echo "Tagging table $TAG_KEY=$TAG_VALUE ..."
  aws dynamodb tag-resource --resource-arn "$TABLE_ARN" --region "$REGION" \
    --tags "Key=${TAG_KEY},Value=${TAG_VALUE}"
fi

VAULT_ARN=$(aws backup describe-backup-vault --backup-vault-name "$VAULT_NAME" --region "$REGION" \
  --query 'BackupVaultArn' --output text 2>/dev/null || true)
if [[ -z "$VAULT_ARN" || "$VAULT_ARN" == "None" ]]; then
  echo "Creating backup vault $VAULT_NAME ..."
  VAULT_ARN=$(aws backup create-backup-vault --backup-vault-name "$VAULT_NAME" --region "$REGION" \
    --query 'BackupVaultArn' --output text)
else
  echo "Backup vault $VAULT_NAME already exists."
fi

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null || true)
if [[ -z "$ROLE_ARN" || "$ROLE_ARN" == "None" ]]; then
  DEFAULT_ROLE=$(aws iam get-role --role-name AWSBackupDefaultServiceRole \
    --query 'Role.Arn' --output text 2>/dev/null || true)
  if [[ -n "$DEFAULT_ROLE" && "$DEFAULT_ROLE" != "None" ]]; then
    ROLE_ARN="$DEFAULT_ROLE"
    echo "Using existing AWSBackupDefaultServiceRole."
  else
    echo "Creating backup IAM role $ROLE_NAME ..."
    ROLE_ARN=$(aws iam create-role --role-name "$ROLE_NAME" \
      --assume-role-policy-document "file://${TRUST_POLICY_FILE}" \
      --query 'Role.Arn' --output text)
    aws iam attach-role-policy --role-name "$ROLE_NAME" \
      --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup
    aws iam attach-role-policy --role-name "$ROLE_NAME" \
      --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores
    echo "Waiting 10s for IAM role propagation ..."
    sleep 10
  fi
else
  echo "Backup role $ROLE_NAME already exists."
fi

PLAN_ID=$(aws backup list-backup-plans --region "$REGION" \
  --query "BackupPlansList[?BackupPlanName=='${PLAN_NAME}'].BackupPlanId" --output text 2>/dev/null || true)
if [[ -z "$PLAN_ID" || "$PLAN_ID" == "None" ]]; then
  echo "Creating backup plan $PLAN_NAME ..."
  PLAN_DOC=$(mktemp)
  cat > "$PLAN_DOC" <<EOF
{
  "BackupPlanName": "${PLAN_NAME}",
  "Rules": [
    {
      "RuleName": "DailyStudyDynamoDb",
      "TargetBackupVaultName": "${VAULT_NAME}",
      "ScheduleExpression": "cron(0 5 ? * * *)",
      "StartWindowMinutes": 60,
      "CompletionWindowMinutes": 120,
      "Lifecycle": {
        "DeleteAfterDays": 7
      }
    }
  ]
}
EOF
  PLAN_ID=$(aws backup create-backup-plan --region "$REGION" \
    --backup-plan "file://${PLAN_DOC}" --query 'BackupPlanId' --output text)
  rm -f "$PLAN_DOC"
else
  echo "Backup plan $PLAN_NAME already exists (id $PLAN_ID)."
fi

SELECTION_ID=$(aws backup list-backup-selections --backup-plan-id "$PLAN_ID" --region "$REGION" \
  --query "BackupSelectionsList[?SelectionName=='${SELECTION_NAME}'].SelectionId" --output text 2>/dev/null || true)
if [[ -z "$SELECTION_ID" || "$SELECTION_ID" == "None" ]]; then
  echo "Creating backup selection $SELECTION_NAME ..."
  SEL_DOC=$(mktemp)
  cat > "$SEL_DOC" <<EOF
{
  "SelectionName": "${SELECTION_NAME}",
  "IamRoleArn": "${ROLE_ARN}",
  "Resources": [],
  "ListOfTags": [
    {
      "ConditionType": "STRINGEQUALS",
      "ConditionKey": "${TAG_KEY}",
      "ConditionValue": "${TAG_VALUE}"
    }
  ]
}
EOF
  SELECTION_ID=$(aws backup create-backup-selection --region "$REGION" \
    --backup-plan-id "$PLAN_ID" \
    --backup-selection "file://${SEL_DOC}" \
    --query 'SelectionId' --output text)
  rm -f "$SEL_DOC"
else
  echo "Backup selection $SELECTION_NAME already exists (id $SELECTION_ID)."
fi

JOB_ID=""
if [[ "$ON_DEMAND" == true ]]; then
  echo "Starting on-demand backup job ..."
  JOB_ID=$(aws backup start-backup-job --region "$REGION" \
    --backup-vault-name "$VAULT_NAME" \
    --resource-arn "$TABLE_ARN" \
    --iam-role-arn "$ROLE_ARN" \
    --query 'BackupJobId' --output text)
  echo "Backup job id: $JOB_ID"

  if [[ "$VERIFY_JOB" == true ]]; then
    echo "Polling backup job until COMPLETED ..."
    DEADLINE=$((SECONDS + 600))
    while [[ $SECONDS -lt $DEADLINE ]]; do
      STATUS=$(aws backup describe-backup-job --backup-job-id "$JOB_ID" --region "$REGION" \
        --query 'State' --output text)
      echo "  Job state: $STATUS"
      if [[ "$STATUS" == "COMPLETED" ]]; then
        break
      fi
      if [[ "$STATUS" == "FAILED" || "$STATUS" == "ABORTED" ]]; then
        MSG=$(aws backup describe-backup-job --backup-job-id "$JOB_ID" --region "$REGION" \
          --query 'StatusMessage' --output text)
        echo "Backup job failed: $MSG"
        exit 1
      fi
      sleep 15
    done
    if [[ "$STATUS" != "COMPLETED" ]]; then
      echo "Timed out waiting for backup job."
      exit 1
    fi
    RP_COUNT=$(aws backup list-recovery-points-by-backup-vault --backup-vault-name "$VAULT_NAME" \
      --region "$REGION" --query 'length(RecoveryPoints)' --output text)
    echo "Recovery points in vault: $RP_COUNT"
  fi
fi

cat > "$RESULT_FILE" <<EOF
{
  "lab": "night-19-dr-aws-backup",
  "region": "${REGION}",
  "tableName": "${TABLE_NAME}",
  "tableArn": "${TABLE_ARN}",
  "tag": "${TAG_KEY}=${TAG_VALUE}",
  "backupVaultName": "${VAULT_NAME}",
  "backupVaultArn": "${VAULT_ARN}",
  "backupPlanName": "${PLAN_NAME}",
  "backupPlanId": "${PLAN_ID}",
  "backupSelectionName": "${SELECTION_NAME}",
  "backupSelectionId": "${SELECTION_ID}",
  "backupRoleArn": "${ROLE_ARN}",
  "onDemandBackupJobId": "${JOB_ID}",
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo ""
echo "=== Night 19 setup complete ==="
echo "Result: $RESULT_FILE"
echo "Next: bash HTML/study-lab/night-19-lab-backup-setup.sh --on-demand-backup --verify-job"
echo "Teardown: bash HTML/study-lab/night-19-lab-backup-teardown.sh"
