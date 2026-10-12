import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { createTable } from "./dynamodb";
import { createResourceId } from "../../microservices/shared/utils";

jest.mock("aws-cdk-lib/aws-dynamodb");
jest.mock("../../microservices/shared/utils", () => ({
  createResourceId: jest.fn().mockReturnValue("testTableName"),
}));

describe("createTable", () => {
  let stack: Stack;
  let mockScope: Construct;

  beforeEach(() => {
    stack = new Stack();
    mockScope = new Construct(stack, "MockScope");
    jest.clearAllMocks();
  });

  it("should create a DynamoDB table with the correct properties", () => {
    const mockProps: dynamodb.TableProps = {
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    };

    createTable(mockScope, "TestTable", mockProps);

    expect(dynamodb.Table).toHaveBeenCalledWith(mockScope, "testTableName", {
      contributorInsightsSpecification: { enabled: true },
      billingMode: "PAY_PER_REQUEST",
      encryption: "AWS_MANAGED",
      tableName: "TestTable",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: false },
      ...mockProps,
    });
  });

  it("should use createResourceId to generate the table name", () => {
    createTable(mockScope, "TestTable", {
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    });

    expect(createResourceId).toHaveBeenCalledWith("TestTable");
  });

  it("should merge additional properties passed via props", () => {
    const additionalProps: dynamodb.TableProps = {
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "timestamp",
        type: dynamodb.AttributeType.NUMBER,
      },
    };

    createTable(mockScope, "TestTableWithProps", additionalProps);

    expect(dynamodb.Table).toHaveBeenCalledWith(mockScope, "testTableName", {
      contributorInsightsSpecification: { enabled: true },
      billingMode: "PAY_PER_REQUEST",
      encryption: "AWS_MANAGED",
      tableName: "TestTableWithProps",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: false },
      ...additionalProps,
    });
  });
});
