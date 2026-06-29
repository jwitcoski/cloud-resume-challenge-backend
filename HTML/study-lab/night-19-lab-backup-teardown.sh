#!/usr/bin/env bash
# Night 19 Lab teardown — AWS Backup vault, plan, selection, recovery points
# Run: bash HTML/study-lab/night-19-lab-backup-teardown.sh

set -euo pipefail
REGION=us-east-1
PREFIX=saa-study-gsa
TABLE_NAME="${PREFIX}-wiki-views"
VAULT_NAME="${PREFIX}-backup-vault"
PLAN_NAME="${PREFIX}-night19-plan"
SELECTION_NAME="${PREFIX}-night19-selection"
ROLE_NAME="${PREFIX}-backup-role"
TAG_KEY=saa-study-backup

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULT_FILE="${SCRIPT_DIR}/night-19-backup-result.json"

echo "=== Night 19 teardown — AWS Backup ==="

PLAN_ID=""
SELECTION_ID=""
if [[ -f "$RESULT_FILE" ]]; then
  PLAN_ID=$(jq -r '.backupPlanId // empty' "$RESULT_FILE" 2>/dev/null || true)
  SELECTION_ID=$(jq -r '.backupSelectionId // empty' "$RESULT_FILE" 2>/dev/null || true)
fi

if [[ -z "$PLAN_ID" ]]; then
  PLAN_ID=$(aws backup list-backup-plans --region "$REGION" \
    --query "BackupPlansList[?BackupPlanName=='${PLAN_NAME}'].BackupPlanId" --output text 2>/dev/null || true)
fi
if [[ -z "$SELECTION_ID" && -n "$PLAN_ID" && "$PLAN_ID" != "None" ]]; then
  SELECTION_ID=$(aws backup list-backup-selections --backup-plan-id "$PLAN_ID" --region "$REGION" \
    --query "BackupSelectionsList[?SelectionName=='${SELECTION_NAME}'].SelectionId" --output text 2>/dev/null || true)
fi

if [[ -n "$PLAN_ID" && "$PLAN_ID" != "None" && -n "$SELECTION_ID" && "$SELECTION_ID" != "None" ]]; then
  echo "Deleting backup selection $SELECTION_ID ..."
  aws backup delete-backup-selection --backup-plan-id "$PLAN_ID" --selection-id "$SELECTION_ID" \
    --region "$REGION" 2>/dev/null || true
fi

if [[ -n "$PLAN_ID" && "$PLAN_ID" != "None" ]]; then
  echo "Deleting backup plan $PLAN_ID ..."
  aws backup delete-backup-plan --backup-plan-id "$PLAN_ID" --region "$REGION" 2>/dev/null || true
fi

VAULT_EXISTS=$(aws backup describe-backup-vault --backup-vault-name "$VAULT_NAME" --region "$REGION" \
  --query 'BackupVaultName' --output text 2>/dev/null || true)
if [[ -n "$VAULT_EXISTS" && "$VAULT_EXISTS" != "None" ]]; then
  echo "Deleting recovery points in vault $VAULT_NAME ..."
  while true; do
    RPS=$(aws backup list-recovery-points-by-backup-vault --backup-vault-name "$VAULT_NAME" \
      --region "$REGION" --query 'RecoveryPoints[].RecoveryPointArn' --output text 2>/dev/null || true)
    if [[ -z "$RPS" || "$RPS" == "None" ]]; then
      break
    fi
    for RP in $RPS; do
      echo "  Deleting recovery point $RP ..."
      aws backup delete-recovery-point --backup-vault-name "$VAULT_NAME" \
        --recovery-point-arn "$RP" --region "$REGION" 2>/dev/null || true
    done
    sleep 5
  done
  echo "Deleting backup vault $VAULT_NAME ..."
  aws backup delete-backup-vault --backup-vault-name "$VAULT_NAME" --region "$REGION" 2>/dev/null || true
fi

TABLE_ARN=$(aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" \
  --query 'Table.TableArn' --output text 2>/dev/null || true)
if [[ -n "$TABLE_ARN" && "$TABLE_ARN" != "None" ]]; then
  echo "Removing tag $TAG_KEY from $TABLE_NAME ..."
  aws dynamodb untag-resource --resource-arn "$TABLE_ARN" --tag-keys "$TAG_KEY" --region "$REGION" \
    2>/dev/null || true
fi

ROLE_EXISTS=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.RoleName' --output text 2>/dev/null || true)
if [[ -n "$ROLE_EXISTS" && "$ROLE_EXISTS" != "None" ]]; then
  echo "Deleting IAM role $ROLE_NAME ..."
  aws iam detach-role-policy --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup 2>/dev/null || true
  aws iam detach-role-policy --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores 2>/dev/null || true
  aws iam delete-role --role-name "$ROLE_NAME" 2>/dev/null || true
fi

rm -f "$RESULT_FILE"
echo "Night 19 teardown complete. Night 18 DynamoDB table unchanged."
