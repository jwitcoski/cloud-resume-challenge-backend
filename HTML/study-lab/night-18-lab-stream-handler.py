"""Night 18 stub stream processor — logs wiki view counter changes from DynamoDB Streams."""
import json


def handler(event, context):
    summaries = []
    for record in event.get("Records", []):
        event_name = record.get("eventName")
        if event_name not in ("INSERT", "MODIFY", "REMOVE"):
            continue

        keys = record.get("dynamodb", {}).get("Keys", {})
        new_image = record.get("dynamodb", {}).get("NewImage", {})
        old_image = record.get("dynamodb", {}).get("OldImage", {})

        page_id = keys.get("pageId", {}).get("S", "?")
        old_count = old_image.get("viewCount", {}).get("N") if old_image else None
        new_count = new_image.get("viewCount", {}).get("N") if new_image else None

        summary = {
            "eventName": event_name,
            "pageId": page_id,
            "oldViewCount": old_count,
            "newViewCount": new_count,
            "eventSource": record.get("eventSource"),
        }
        print(json.dumps(summary))
        summaries.append(summary)

    return {"processed": len(summaries), "records": summaries}
