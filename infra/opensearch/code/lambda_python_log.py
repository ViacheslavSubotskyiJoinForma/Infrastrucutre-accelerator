import base64
import json
import gzip
import os
import datetime
import urllib3

# Connection to OpenSearch
region = os.environ['AWS_REGION']
host = os.environ['HOST']
# Set up data format
time_format = "%Y-%m-%dT%H:%M:%S.%fZ"
# Generate index_name and url for send logs
index = 'logs-lambda'
index_name = f'{index}'
datatype = '_doc'
url = host + '/' + index_name + '/' + datatype
headers = {'Content-Type': 'application/json'}
http = urllib3.PoolManager()
def lambda_handler(event, context):
    cw_data = event['awslogs']['data']
    compressed_payload = base64.b64decode(cw_data)
    uncompressed_payload = gzip.decompress(compressed_payload)
    payload = json.loads(uncompressed_payload)
    log_group = payload['logGroup']
    lambda_name = ''.join(log_group.split("/aws/lambda/"))
    log_stream = payload['logStream']
    log_events = payload['logEvents']
    for log_event in log_events:
        message = log_event['message']
        timestamp = datetime.datetime.fromtimestamp(log_event['timestamp'] / 1000).strftime(time_format)
        document = { "logGroup": log_group, "lambda_name": lambda_name, "logStream": log_stream, "@timestamp": timestamp, "message": message }
        uncompressed_document = json.dumps(document)
        # Send to OpenSearch
        response = http.request('POST', url, headers=headers, body=uncompressed_document)