import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Stack } from "aws-cdk-lib";
import { createApiGateway, createLambdaIntegration } from "./api-gateway";
import { Construct } from "constructs";
import { Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import { createResourceId } from "../../microservices/shared/utils";

jest.mock("aws-cdk-lib/aws-apigateway");
jest.mock("aws-cdk-lib/aws-lambda");
jest.mock("../../microservices/shared/utils", () => ({
  createResourceId: jest.fn().mockReturnValue("testApiGatewayName"),
}));

describe("createApiGateway", () => {
  let stack: Stack;

  let mockScope: Construct;

  beforeEach(() => {
    stack = new Stack();
    mockScope = new Construct(stack, "MockScope");
    jest.clearAllMocks();
  });

  it("should create a RestApi with the correct properties", () => {
    const mockProps: apigateway.RestApiProps = {
      description: "Test API Gateway",
    };

    createApiGateway(mockScope, "TestApi", mockProps);

    expect(apigateway.RestApi).toHaveBeenCalledWith(
      mockScope,
      "testApiGatewayName",
      {
        deployOptions: {
          stageName: "prod",
        },
        restApiName: "TestApi",
        cloudWatchRole: false,
        ...mockProps,
      },
    );
  });

  it("should use createResourceId to generate the API Gateway name", () => {
    createApiGateway(mockScope, "TestApi", {
      description: "Test API Gateway",
    });

    expect(createResourceId).toHaveBeenCalledWith("TestApi");
  });
});

describe("createLambdaIntegration", () => {
  let stack: Stack;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockScope: Construct;

  beforeEach(() => {
    stack = new Stack();
    mockScope = new Construct(stack, "MockScope");
    jest.clearAllMocks();
  });

  it("should create a LambdaIntegration with the correct method and resource", () => {
    const mockApiGateway = {
      root: {
        addResource: jest.fn().mockReturnValue({
          addMethod: jest.fn(),
        }),
        getResource: jest.fn().mockReturnValue({
          addMethod: jest.fn(),
        }),
      },
    } as unknown as apigateway.RestApi;
    const mockMethod = {} as LambdaFunction;

    const props = {
      apiGateway: mockApiGateway,
      method: mockMethod,
      methodName: "person",
      methodType: "POST" as const,
    };

    createLambdaIntegration(props);

    expect(apigateway.LambdaIntegration).toHaveBeenCalledWith(mockMethod);
    expect(mockApiGateway.root.getResource).toHaveBeenCalledWith("person");
  });
});
