#!/usr/bin/env bash
# Week 1 full study-lab teardown (Night 6/7).
# Run from repo: bash HTML/study-lab/week1-teardown-full.sh
#
# KEPT (production): saa-study/gsa-wiki-cognito secret + alias/saa-study-witcoskitech CMK
#   — sam-app-WikiApiFunction still has COGNITO_SECRET_ARN. Remove secret only after
#   wiki code uses plain COGNITO_* env vars or a non-study secret name.

set -euo pipefail
REGION=us-east-1

echo "=== AWS Config teardown ==="
aws configservice delete-config-rule --config-rule-name saa-study-s3-public-read-prohibited --region "$REGION" 2>/dev/null || true
aws configservice delete-config-rule --config-rule-name saa-study-iam-user-mfa-enabled --region "$REGION" 2>/dev/null || true
aws configservice stop-configuration-recorder --configuration-recorder-name saa-study-recorder --region "$REGION" 2>/dev/null || true
aws configservice delete-delivery-channel --delivery-channel-name saa-study-delivery --region "$REGION" 2>/dev/null || true
aws configservice delete-configuration-recorder --configuration-recorder-name saa-study-recorder --region "$REGION" 2>/dev/null || true
aws iam detach-role-policy --role-name saa-study-config-role --policy-arn arn:aws:iam::aws:policy/service-role/AWS_ConfigRole 2>/dev/null || true
aws iam delete-role --role-name saa-study-config-role 2>/dev/null || true
aws s3 rm "s3://saa-study-config-298043721974" --recursive 2>/dev/null || true
aws s3api delete-bucket --bucket saa-study-config-298043721974 2>/dev/null || true
echo "Config done."

echo "=== CloudTrail teardown ==="
aws cloudtrail stop-logging --name saa-study-account-trail --region "$REGION" 2>/dev/null || true
aws cloudtrail delete-trail --name saa-study-account-trail --region "$REGION" 2>/dev/null || true
aws s3 rm "s3://saa-study-cloudtrail-298043721974" --recursive 2>/dev/null || true
aws s3api delete-bucket --bucket saa-study-cloudtrail-298043721974 2>/dev/null || true
echo "CloudTrail done."

echo "=== Access Analyzer teardown ==="
aws accessanalyzer delete-analyzer --analyzer-name saa-study-account --region "$REGION" 2>/dev/null || true
echo "Access Analyzer done."

echo "=== Lab artifacts (non-production) ==="
aws ssm delete-parameter --name /saa-study/gsa-wiki-cognito --region "$REGION" 2>/dev/null || true
aws s3 rm "s3://witcoskitech.com/study-lab/kms-test/night2-test.txt" 2>/dev/null || true
echo "SSM contrast param + kms-test object done."

echo ""
echo "Week 1 observability labs torn down."
echo "Still running: saa-study/gsa-wiki-cognito (Secrets Manager) + alias/saa-study-witcoskitech (KMS)"
echo "Night 4 WAF was already deleted after lab."

# Optional — only after wiki Lambda no longer references the study secret:
# aws secretsmanager delete-secret --secret-id saa-study/gsa-wiki-cognito --force-delete-without-recovery --region "$REGION"
# aws kms schedule-key-deletion --key-id alias/saa-study-witcoskitech --pending-window-in-days 7 --region "$REGION"
