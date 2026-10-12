import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { EventBusStack } from "./stack";
import { createStageName } from "../shared/utils";

describe("EventBusStack", () => {
  const stackStage = "test";

  const app = new cdk.App();

  const stack = new EventBusStack(app, "TestEventBusStack", { stackStage });

  const template = Template.fromStack(stack);

  it("should create an EventBridge event bus", () => {
    template.resourceCountIs("AWS::Events::EventBus", 1);

    template.hasResourceProperties("AWS::Events::EventBus", {
      Name: createStageName(stackStage, "event_bus"),
    });
  });
});
