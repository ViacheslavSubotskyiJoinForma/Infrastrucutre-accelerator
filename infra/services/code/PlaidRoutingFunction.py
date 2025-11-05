import json
import urllib3

DEV_GATEWAY = "https://api.dev.ClientDomain.com/api/plaid/webhook"
UAT_GATEWAY = "https://api.uat.ClientDomain.com/api/plaid/webhook"
PROD_GATEWAY = "https://api.ClientDomain.com/api/plaid/webhook"


def lambda_handler(event, context):
    # Extract the 'pathParameters' field from event
    path_parameter = event["pathParameters"]["proxy"]
    #if path_parameter not in ["status:update", "step:update"]:
    #    return {
    #        'statusCode': 404,
    #        'body': json.dumps({'message': 'Request path parameter not supported.'})
    #    }
    
    request_body = json.loads(event['body'])
    request_body_orig = event['body']
    request_headers = event['headers']['plaid-verification']
    
    #DEBUG
    #print(request_body_orig)
    #print(request_body)
    #print(request_headers)
    
    environment = request_body["environment"]
    # Route the request to the appropriate API Gateway based on the 'environment' field
    #development, sandbox, production
    if environment == 'development':
        # Code to route to dev API Gateway
        return route_request(request_body_orig, DEV_GATEWAY + "/" + path_parameter, request_headers)
    elif environment == 'sandbox':
        # Code to route to test API Gateway
        return route_request(request_body_orig, UAT_GATEWAY + "/" + path_parameter, request_headers)
    elif environment == 'production':
        return route_request(request_body_orig, PROD_GATEWAY + "/" + path_parameter, request_headers)

    # Return a response indicating successful execution
    response = {
        'statusCode': 500,
        'body': json.dumps({'message': 'Request was not routed.'})
    }

    return response


def route_request(input_data, api_gateway_url, input_headers):
    http = urllib3.PoolManager()
    # Send a request to the API Gateway
    print(api_gateway_url)
    response = http.urlopen('POST',
                            api_gateway_url,
                            headers = {'Content-Type': 'application/json', 'Plaid-Verification': input_headers},
                            body = input_data)

    # Check if the request was successful
    if response.status == 200:
        # Return a success response
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Request successfully routed.'})
        }
    else:
        # Handle errors
        return {
            'statusCode': response.status,
            'body': json.dumps({'message': 'Error routing request to API Gateway.'})
        }