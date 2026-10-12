import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Construct } from "constructs";
import { createTable } from "../src/infra/common/dynamodb";
import { referenceEventBus } from "../src/infra/common/event-bridge";
import { createLambdaHandler } from "../src/infra/common/lambda";
import {
  createExportStageName,
  createStageName,
} from "../src/microservices/shared/utils";
import { PERSON_EVENT_SOURCE } from "../src/microservices/config";
import { eventType } from "../src/microservices/shared/domain/events";

interface StackProps extends cdk.StackProps {
  stackStage: string;
}
export class MockStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const { stackStage } = props;
    const table = createTable(
      this,
      createStageName(stackStage, "bdd_events_table"),
      {
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );
    const bus = referenceEventBus(
      this,
      "PersonEventBus",
      cdk.Fn.importValue(
        createExportStageName(stackStage, "EventBusArnExport"),
      ),
    );
    const forwarder = createLambdaHandler(
      this,
      createStageName(stackStage, "bdd_event_forwarder_handler"),
      {
        entry: "bdd/handlers/bddEventForwarderHandler/index.ts",
        environment: { BDD_EVENTS_TABLE: table.tableName },
      },
    );
    table.grant(forwarder, "dynamodb:PutItem");
    new events.Rule(this, "PersonCreatedRule", {
      eventBus: bus,
      eventPattern: {
        source: [PERSON_EVENT_SOURCE],
        detailType: [eventType.PersonCreated],
      },
      targets: [new targets.LambdaFunction(forwarder)],
    });
    new cdk.CfnOutput(this, "BddEventsTableName", {
      value: table.tableName,
      exportName: createExportStageName(stackStage, "BddEventsTableName"),
    });
  }
}
