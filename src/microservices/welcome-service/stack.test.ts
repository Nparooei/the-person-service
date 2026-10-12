import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { WelcomeServiceStack } from "./stack";

describe.each(["person-dev", "person-prod", "person-bdd-dev"])(
  "Welcome Service infrastructure (%s)",
  (stackStage) => {
    const template = Template.fromStack(
      new WelcomeServiceStack(new App(), "Welcome", { stackStage }),
    );

    it("subscribes to person-created events on its own environment's bus", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        EventPattern: {
          source: ["person-service"],
          "detail-type": ["person-created-event"],
        },
        Targets: [Match.objectLike({ Arn: Match.anyValue() })],
      });
      expect(JSON.stringify(template.toJSON())).toContain(
        `${stackStage}EventBusArnExport`,
      );
      template.hasResourceProperties("AWS::Lambda::Permission", {
        Action: "lambda:InvokeFunction",
        Principal: "events.amazonaws.com",
        SourceArn: Match.anyValue(),
      });
    });

    it("deploys one Lambda with no database or API", () => {
      template.resourceCountIs("AWS::Lambda::Function", 1);
      template.resourceCountIs("AWS::DynamoDB::Table", 0);
      template.resourceCountIs("AWS::ApiGateway::RestApi", 0);
      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: `${stackStage}_welcome_person_handler`,
        Runtime: "nodejs24.x",
        Handler: "index.handler",
      });
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        LogGroupName: `/aws/lambda/${stackStage}_welcome_person_handler`,
        RetentionInDays: 30,
      });
      template.hasOutput("WelcomeFunctionName", {
        Export: { Name: `${stackStage}WelcomeFunctionName` },
      });
    });
  },
);
