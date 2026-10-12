import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { PersonServiceStack } from "./stack";

describe("Person Service infrastructure", () => {
  const dev = Template.fromStack(
    new PersonServiceStack(new App(), "Dev", {
      stackStage: "person-dev",
      environmentName: "dev",
    }),
  );
  const prod = Template.fromStack(
    new PersonServiceStack(new App(), "Prod", {
      stackStage: "person-prod",
      environmentName: "prod",
    }),
  );
  it("exposes POST and GET on /person", () => {
    dev.hasResourceProperties("AWS::ApiGateway::Resource", {
      PathPart: "person",
    });
    dev.hasResourceProperties("AWS::ApiGateway::Method", {
      HttpMethod: "POST",
    });
    dev.hasResourceProperties("AWS::ApiGateway::Method", { HttpMethod: "GET" });
    dev.resourceCountIs("AWS::ApiGateway::Method", 2);
  });
  it("stores persons by ID with a stream", () => {
    dev.hasResource("AWS::DynamoDB::Table", {
      DeletionPolicy: "Delete",
      Properties: Match.objectLike({
        TableName: "person-dev_person_table",
        KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
        StreamSpecification: { StreamViewType: "NEW_IMAGE" },
      }),
    });
  });
  it.each([dev, prod])(
    "deletes tables, logs and queues on destroy",
    (template) => {
      template.hasResource("AWS::DynamoDB::Table", {
        DeletionPolicy: "Delete",
        UpdateReplacePolicy: "Delete",
        Properties: Match.objectLike({
          DeletionProtectionEnabled: false,
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: false,
          },
        }),
      });
      for (const type of ["AWS::Logs::LogGroup", "AWS::SQS::Queue"]) {
        template.allResources(type, {
          DeletionPolicy: "Delete",
          UpdateReplacePolicy: "Delete",
        });
      }
      for (const resource of Object.values(template.toJSON().Resources)) {
        expect(resource).not.toHaveProperty("DeletionPolicy", "Retain");
        expect(resource).not.toHaveProperty("DeletionPolicy", "Snapshot");
        expect(resource).not.toHaveProperty("UpdateReplacePolicy", "Retain");
      }
    },
  );
  it("uses Node 24 for the application handlers", () => {
    for (const name of [
      "create_person_handler",
      "list_persons_handler",
      "publish_person_created_handler",
    ]) {
      dev.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: `person-dev_${name}`,
        Runtime: "nodejs24.x",
        Handler: "index.handler",
      });
    }
  });
  it("configures insert-only stream publication, retries and failure capture", () => {
    dev.hasResourceProperties("AWS::Lambda::EventSourceMapping", {
      StartingPosition: "TRIM_HORIZON",
      MaximumRetryAttempts: 10,
      BisectBatchOnFunctionError: true,
      FunctionResponseTypes: ["ReportBatchItemFailures"],
      FilterCriteria: {
        Filters: [{ Pattern: JSON.stringify({ eventName: ["INSERT"] }) }],
      },
      DestinationConfig: { OnFailure: { Destination: Match.anyValue() } },
    });
    dev.hasResourceProperties("AWS::SQS::Queue", {
      QueueName: "person-dev_person_events_dlq",
      MessageRetentionPeriod: 1209600,
    });
  });
  it("grants the publisher permission to send to EventBridge", () => {
    dev.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "events:PutEvents",
            Effect: "Allow",
            Resource: { "Fn::ImportValue": "person-devEventBusArnExport" },
          }),
        ]),
      },
    });
  });
  it("separates environment names, API stages and exports", () => {
    dev.hasResourceProperties("AWS::ApiGateway::Stage", { StageName: "dev" });
    prod.hasResourceProperties("AWS::ApiGateway::Stage", { StageName: "prod" });
    prod.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "person-prod_person_table",
    });
    dev.hasOutput("PersonTableName", {
      Export: { Name: "person-devPersonTableName" },
    });
    prod.hasOutput("PersonTableName", {
      Export: { Name: "person-prodPersonTableName" },
    });
  });
});
