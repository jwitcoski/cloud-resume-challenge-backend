import json
import boto3
import os
from decimal import Decimal

def get_dynamodb_resource():
    if 'AWS_SAM_LOCAL' in os.environ:
        return boto3.resource('dynamodb', endpoint_url="http://dynamodb-local:8000")
    return boto3.resource('dynamodb')

def decimal_to_int(obj):
    if isinstance(obj, Decimal):
        return int(obj)
    raise TypeError

def lambda_handler(event, context):
    try:
        dynamodb = get_dynamodb_resource()
        ddbTableName = os.environ['TABLE_NAME']
        table = dynamodb.Table(ddbTableName)

        response = table.get_item(Key={'id': 'count'})
        
        if 'Item' in response:
            count = response['Item'].get('visitCount', 0)
        else:
            count = 0
            table.put_item(Item={'id': 'count', 'visitCount': count})
        
        new_count = count + 1

        table.update_item(
            Key={'id': 'count'},
            UpdateExpression='SET visitCount = :c',
            ExpressionAttributeValues={':c': Decimal(new_count)},
            ReturnValues='UPDATED_NEW'
        )

        return {
            'statusCode': 200,
            'body': json.dumps({'Count': new_count}, default=decimal_to_int),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }

    except Exception as e:
        print(f"Error updating visit count: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Could not update visit count'}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }