resource "aws_api_gateway_method" "root_mock" {
  rest_api_id   = aws_api_gateway_rest_api.rest_api.id
  resource_id   = aws_api_gateway_rest_api.rest_api.root_resource_id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "root_mock" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  resource_id = aws_api_gateway_rest_api.rest_api.root_resource_id
  http_method = aws_api_gateway_method.root_mock.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "root_mock_200" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  resource_id = aws_api_gateway_rest_api.rest_api.root_resource_id
  http_method = aws_api_gateway_method.root_mock.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "root_mock_template" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  resource_id = aws_api_gateway_rest_api.rest_api.root_resource_id
  http_method = aws_api_gateway_method.root_mock.http_method
  status_code = aws_api_gateway_method_response.root_mock_200.status_code
}

resource "aws_api_gateway_resource" "robot_txt" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  parent_id   = aws_api_gateway_rest_api.rest_api.root_resource_id
  path_part   = "robots.txt"
}

resource "aws_api_gateway_method" "robot_method" {
  rest_api_id   = aws_api_gateway_rest_api.rest_api.id
  resource_id   = aws_api_gateway_resource.robot_txt.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "robot_integration" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  resource_id = aws_api_gateway_resource.robot_txt.id
  http_method = aws_api_gateway_method.robot_method.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "robot_response_200" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  resource_id = aws_api_gateway_resource.robot_txt.id
  http_method = aws_api_gateway_method.robot_method.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "robot_response_template" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  resource_id = aws_api_gateway_resource.robot_txt.id
  http_method = aws_api_gateway_method.robot_method.http_method
  status_code = aws_api_gateway_method_response.robot_response_200.status_code
}

resource "aws_api_gateway_resource" "well-known" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  parent_id   = aws_api_gateway_rest_api.rest_api.root_resource_id
  path_part   = ".well-known"
}

resource "aws_api_gateway_resource" "assetlinks_json" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  parent_id   = aws_api_gateway_resource.well-known.id
  path_part   = "assetlinks.json"
}

resource "aws_api_gateway_method" "assetlinks_json_method" {
  rest_api_id   = aws_api_gateway_rest_api.rest_api.id
  resource_id   = aws_api_gateway_resource.assetlinks_json.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "assetlinks_json_integration" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  resource_id = aws_api_gateway_resource.assetlinks_json.id
  http_method = aws_api_gateway_method.assetlinks_json_method.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "assetlinks_json_response_200" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  resource_id = aws_api_gateway_resource.assetlinks_json.id
  http_method = aws_api_gateway_method.assetlinks_json_method.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "assetlinks_json_response_template" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  resource_id = aws_api_gateway_resource.assetlinks_json.id
  http_method = aws_api_gateway_method.assetlinks_json_method.http_method
  status_code = aws_api_gateway_method_response.assetlinks_json_response_200.status_code
  response_templates = {
    "application/json" = jsonencode([
      {
        relation = ["delegate_permission/common.handle_all_urls"]
        target = {
          namespace                = "android_app"
          package_name             = "com.ClientDomain.app"
          sha256_cert_fingerprints = ["C9:DF:41:96:D4:CC:9F:7A:44:A6:2D:65:39:EB:C4:D8:2B:03:6D:1E:01:BC:98:C0:10:A7:F9:1B:57:5E:74:3C"]
        }
      }
    ])
  }
}
