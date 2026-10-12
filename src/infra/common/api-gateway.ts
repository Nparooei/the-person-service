import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import { createResourceId } from "../../microservices/shared/utils";

function createApiGateway(
  scope: Construct,
  id: string,
  props: apigateway.RestApiProps,
): apigateway.RestApi {
  const apiName = createResourceId(id);
  return new apigateway.RestApi(scope, apiName, {
    deployOptions: {
      stageName: "prod",
    },
    restApiName: id,
    cloudWatchRole: false,
    ...props,
  });
}

export { createApiGateway };

interface createLambdaIntegrationProps {
  apiGateway: apigateway.RestApi;
  method: cdk.aws_lambda.Function;
  methodName: string;
  methodType: "GET" | "POST" | "PUT" | "DELETE";
}

function createLambdaIntegration(
  props: createLambdaIntegrationProps,
): apigateway.LambdaIntegration {
  const { apiGateway, method, methodName, methodType } = props;
  const integration = new apigateway.LambdaIntegration(method);
  let resource = apiGateway.root.getResource(methodName);
  if (resource === undefined) {
    resource = apiGateway.root.addResource(methodName);
  }
  resource.addMethod(methodType, integration, {
    authorizationType: apigateway.AuthorizationType.NONE,
  });
  return integration;
}

export { createLambdaIntegration };
