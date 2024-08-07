import json
import boto3
import os
from decimal import Decimal

# Initialize DynamoDB resource outside of the handler for better performance
dynamodb = boto3.resource('dynamodb')

def decimal_to_int(obj):
    if isinstance(obj, Decimal):
        return int(obj)
    raise TypeError

def lambda_handler(event, context):
    try:
        # Get the table name from environment variable
        ddbTableName = os.environ.get('TABLE_NAME', 'cloud-resume-challenge')
        table = dynamodb.Table(ddbTableName)

        # Attempt to get the current visit count
        response = table.get_item(Key={'id': 'count'})
        
        if 'Item' in response:
            count = response['Item'].get('visitCount', 0)
        else:
            # Initialize the count if the item doesn't exist
            count = 0
            table.put_item(Item={'id': 'count', 'visitCount': count})
        
        # Increment the visit count
        new_count = count + 1

        # Update the visit count in DynamoDB
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