import os
import sys
import json
import boto3
from moto import mock_dynamodb2  # Change this line
from decimal import Decimal

# Set AWS region for tests
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

# Add lambda directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lambda_function import lambda_handler

@mock_dynamodb2  # Change this line
def test_lambda_handler():
    # Set up mock DynamoDB
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.create_table(
        TableName='cloud-resume-challenge',
        KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
        AttributeDefinitions=[{'AttributeName': 'id', 'AttributeType': 'S'}],
        BillingMode='PAY_PER_REQUEST'
    )

    # Set environment variable for lambda function
    os.environ['TABLE_NAME'] = 'cloud-resume-challenge'

    # Test first invocation (should initialize count)
    event = {}
    context = {}
    response = lambda_handler(event, context)
    
    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert 'Count' in body
    assert body['Count'] == 1

    # Test second invocation (should increment count)
    response = lambda_handler(event, context)
    
    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert 'Count' in body
    assert body['Count'] == 2

    # Verify DynamoDB table content
    item = table.get_item(Key={'id': 'count'})['Item']
    assert item['visitCount'] == Decimal('2')

@mock_dynamodb2  # Add this decorator to the error test as well
def test_lambda_handler_error():
    # Test error handling (no DynamoDB table)
    event = {}
    context = {}
    response = lambda_handler(event, context)
    
    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert 'error' in body