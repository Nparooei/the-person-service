import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Construct } from "constructs";
import { createLambdaHandler } from "../../infra/common/lambda";
import { referenceEventBus } from "../../infra/common/event-bridge";
import { PERSON_EVENT_SOURCE } from "../config";
import { eventType } from "../shared/domain/events";
import { createExportStageName, createStageName } from "../shared/utils";

interface StackProps extends cdk.StackProps {
  stackStage: string;
}

export class WelcomeServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const { stackStage } = props;
    const bus = referenceEventBus(
      this,
      "PersonEventBus",
      cdk.Fn.importValue(
        createExportStageName(stackStage, "EventBusArnExport"),
      ),
    );
    const handler = createLambdaHandler(
      this,
      createStageName(stackStage, "welcome_person_handler"),
      {
        entry:
          "src/microservices/welcome-service/handlers/welcomePersonHandler/index.ts",
      },
    );

    new events.Rule(this, "WelcomePersonCreatedRule", {
      eventBus: bus,
      eventPattern: {
        source: [PERSON_EVENT_SOURCE],
        detailType: [eventType.PersonCreated],
      },
      targets: [new targets.LambdaFunction(handler)],
    });

    new cdk.CfnOutput(this, "WelcomeFunctionName", {
      value: handler.functionName,
      exportName: createExportStageName(stackStage, "WelcomeFunctionName"),
    });
  }
}
