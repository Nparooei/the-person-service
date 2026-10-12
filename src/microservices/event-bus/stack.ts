import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { createEventBus } from "../../infra/common/event-bridge";
import { createExportStageName, createStageName } from "../shared/utils";

interface StackProps extends cdk.StackProps {
  stackStage: string;
}
class EventBusStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const { stackStage } = props;

    const eventBus = createEventBus(
      this,
      createStageName(stackStage, "event_bus"),
      {},
    );

    new cdk.CfnOutput(this, createStageName(stackStage, "event_bus_export"), {
      value: eventBus.eventBusArn,
      exportName: createExportStageName(stackStage, "EventBusArnExport"),
    });
  }
}

export { EventBusStack };
