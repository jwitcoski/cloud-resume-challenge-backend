import os
import sys
import json
import boto3
from moto import mock_dynamodb2
from decimal import Decimal

# Add lambda directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lambda_function import lambda_handler, get_dynamodb_resource

@mock_dynamodb2
def test_lambda_handler():
    # Set up mock AWS credentials
    os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
    os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
    os.environ['AWS_SECURITY_TOKEN'] = 'testing'
    os.environ['AWS_SESSION_TOKEN'] = 'testing'
    os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

    # Set environment variable for lambda function
    os.environ['TABLE_NAME'] = 'cloud-resume-challenge'

    # Set up mock DynamoDB
    dynamodb = get_dynamodb_resource()
    table = dynamodb.create_table(
        TableName='cloud-resume-challenge',
        KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
        AttributeDefinitions=[{'AttributeName': 'id', 'AttributeType': 'S'}],
        BillingMode='PAY_PER_REQUEST'
    )

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

@mock_dynamodb2
def test_lambda_handler_error():
    # Don't set up DynamoDB table to simulate an error
    os.environ['TABLE_NAME'] = 'non-existent-table'
    event = {}
    context = {}
    response = lambda_handler(event, context)

    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert 'error' in body