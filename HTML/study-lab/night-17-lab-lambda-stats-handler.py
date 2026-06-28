"""Night 17 stats uploader — Lambda in VPC upserts resort_stats from SQS."""
import json
import os
import ssl

import boto3
import pg8000.native

DEFAULT_RESORT = {
    "resort_id": "IS-001",
    "resort_name": "Bláfjöll",
    "country_code": "IS",
}


def handler(event, context):
    if "Records" not in event:
        body = event if isinstance(event, dict) else {"raw": event}
        event = {"Records": [{"body": json.dumps(body)}]}

    results = []
    for record in event.get("Records", []):
        results.append(process_record(record))
    return {"processed": len(results), "results": results}


def process_record(record):
    payload = parse_payload(record.get("body", "{}"))
    resort = resolve_resort(payload)
    return upsert_resort_stats(resort)


def parse_payload(body):
    if isinstance(body, str):
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return {"raw": body}
    return body or {}


def resolve_resort(payload):
    if isinstance(payload, dict) and payload.get("resort_id"):
        return {
            "resort_id": payload["resort_id"],
            "resort_name": payload.get("resort_name", payload["resort_id"]),
            "country_code": payload.get("country_code", "IS"),
        }
    if isinstance(payload, dict) and payload.get("detail"):
        return dict(DEFAULT_RESORT)
    return dict(DEFAULT_RESORT)


def get_db_credentials():
    secret_arn = os.environ["DB_SECRET_ARN"]
    sm = boto3.client("secretsmanager")
    raw = sm.get_secret_value(SecretId=secret_arn)["SecretString"]
    data = json.loads(raw)
    username = data.get("username") or data.get("user")
    password = data.get("password")
    if not username or not password:
        raise ValueError("Secret missing username/password")
    return username, password


def upsert_resort_stats(resort):
    host = os.environ["DB_HOST"]
    database = os.environ.get("DB_NAME", "gsa_stats")
    user, password = get_db_credentials()

    conn = pg8000.native.Connection(
        user=user,
        password=password,
        host=host,
        database=database,
        port=5432,
        ssl_context=ssl.create_default_context(),
    )
    try:
        sql = """
            INSERT INTO resort_stats (
                resort_id, resort_name, country_code, monthly_runs, last_run_at, updated_at
            )
            VALUES (:resort_id, :resort_name, :country_code, 1, NOW(), NOW())
            ON CONFLICT (resort_id) DO UPDATE SET
              monthly_runs = resort_stats.monthly_runs + 1,
              last_run_at = EXCLUDED.last_run_at,
              updated_at = NOW()
            RETURNING resort_id, resort_name, country_code, monthly_runs, last_run_at
        """
        rows = conn.run(
            sql,
            resort_id=resort["resort_id"],
            resort_name=resort["resort_name"],
            country_code=resort["country_code"],
        )
        row = rows[0]
        return {
            "resort_id": row[0],
            "resort_name": row[1],
            "country_code": row[2],
            "monthly_runs": row[3],
            "last_run_at": str(row[4]),
        }
    finally:
        conn.close()
