import { App } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { MockStack } from "./stack";

describe("BDD event subscription", () => {
  const template = Template.fromStack(
    new MockStack(new App(), "BddCollector", { stackStage: "person-bdd-dev" }),
  );
  it("receives person-created-event from the isolated EventBridge bus", () => {
    template.hasResourceProperties("AWS::Events::Rule", {
      EventPattern: {
        source: ["person-service"],
        "detail-type": ["person-created-event"],
      },
      Targets: Match.arrayWith([Match.objectLike({ Arn: Match.anyValue() })]),
    });
  });
  it("keeps test event records isolated and disposable", () => {
    template.hasResource("AWS::DynamoDB::Table", {
      DeletionPolicy: "Delete",
      UpdateReplacePolicy: "Delete",
      Properties: Match.objectLike({
        TableName: "person-bdd-dev_bdd_events_table",
        DeletionProtectionEnabled: false,
        PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: false },
      }),
    });
  });
});
