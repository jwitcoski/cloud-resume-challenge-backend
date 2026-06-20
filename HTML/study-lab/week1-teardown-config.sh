#!/usr/bin/env bash
# Week 1 teardown — run at end of Night 6 or 7 to stop AWS Config charges.
# Night 5 lab: saa-study-recorder, rules, delivery channel, role, S3 bucket.
# CloudTrail + Access Analyzer are optional below (lower/no ongoing cost).

set -euo pipefail
REGION=us-east-1

echo "=== AWS Config teardown ==="

aws configservice delete-config-rule --config-rule-name saa-study-s3-public-read-prohibited --region "$REGION"
aws configservice delete-config-rule --config-rule-name saa-study-iam-user-mfa-enabled --region "$REGION"

aws configservice stop-configuration-recorder --configuration-recorder-name saa-study-recorder --region "$REGION"
aws configservice delete-delivery-channel --delivery-channel-name saa-study-delivery --region "$REGION"
aws configservice delete-configuration-recorder --configuration-recorder-name saa-study-recorder --region "$REGION"

aws iam detach-role-policy --role-name saa-study-config-role --policy-arn arn:aws:iam::aws:policy/service-role/AWS_ConfigRole
aws iam delete-role --role-name saa-study-config-role

aws s3 rm "s3://saa-study-config-298043721974" --recursive
aws s3api delete-bucket --bucket saa-study-config-298043721974

echo "Config torn down."

# Optional — CloudTrail (first trail free; you pay S3 storage only)
# aws cloudtrail stop-logging --name saa-study-account-trail --region "$REGION"
# aws cloudtrail delete-trail --name saa-study-account-trail --region "$REGION"
# aws s3 rm "s3://saa-study-cloudtrail-298043721974" --recursive
# aws s3api delete-bucket --bucket saa-study-cloudtrail-298043721974

# Optional — Access Analyzer (free for account analyzer)
# aws accessanalyzer delete-analyzer --analyzer-name saa-study-account --region "$REGION"
