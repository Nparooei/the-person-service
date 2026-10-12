import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sources from "aws-cdk-lib/aws-lambda-event-sources";
import { Construct } from "constructs";
import {
  createApiGateway,
  createLambdaIntegration,
} from "../../infra/common/api-gateway";
import { createTable } from "../../infra/common/dynamodb";
import { createLambdaHandler } from "../../infra/common/lambda";
import { referenceEventBus } from "../../infra/common/event-bridge";
import { createSqsQueue } from "../../infra/common/sqs";
import { createExportStageName, createStageName } from "../shared/utils";

import { MAX_PAGE_SIZE } from "../../config";

interface StackProps extends cdk.StackProps {
  stackStage: string;
  environmentName: string;
}
export class PersonServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const { stackStage, environmentName } = props;
    const name = (resource: string) => createStageName(stackStage, resource);
    const personTable = createTable(this, name("person_table"), {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });
    const bus = referenceEventBus(
      this,
      name("event_bus"),
      cdk.Fn.importValue(
        createExportStageName(stackStage, "EventBusArnExport"),
      ),
    );
    const createPersonHandler = createLambdaHandler(
      this,
      name("create_person_handler"),
      {
        entry:
          "src/microservices/person-service/handlers/createPersonHandler/index.ts",
        environment: { PERSON_TABLE: personTable.tableName },
      },
    );
    const listPersonsHandler = createLambdaHandler(
      this,
      name("list_persons_handler"),
      {
        entry:
          "src/microservices/person-service/handlers/listPersonsHandler/index.ts",
        environment: {
          PERSON_TABLE: personTable.tableName,
          MAX_PAGE_SIZE: String(MAX_PAGE_SIZE),
        },
      },
    );
    personTable.grant(createPersonHandler, "dynamodb:PutItem");
    personTable.grant(listPersonsHandler, "dynamodb:Scan");
    const publisher = createLambdaHandler(
      this,
      name("publish_person_created_handler"),
      {
        entry:
          "src/microservices/person-service/handlers/publishPersonCreatedHandler/index.ts",
        environment: { EVENT_BUS: bus.eventBusName },
        timeout: cdk.Duration.seconds(30),
      },
    );
    bus.grantPutEventsTo(publisher);
    const failureQueue = createSqsQueue(this, name("person_events_dlq"), {
      retentionPeriod: cdk.Duration.days(14),
      enforceSSL: true,
    });
    publisher.addEventSource(
      new sources.DynamoEventSource(personTable, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        batchSize: 10,
        retryAttempts: 10,
        bisectBatchOnError: true,
        reportBatchItemFailures: true,
        onFailure: new sources.SqsDlq(failureQueue),
        filters: [lambda.FilterCriteria.filter({ eventName: ["INSERT"] })],
      }),
    );
    failureQueue
      .metricApproximateNumberOfMessagesVisible()
      .createAlarm(this, name("person_events_dlq_alarm"), {
        threshold: 1,
        evaluationPeriods: 1,
        alarmDescription:
          "Person event publication exhausted retries; inspect the DLQ and replay from the person table before destroying the stack.",
      });
    const api = createApiGateway(this, name("person_api"), {
      description: "Create and list persons",
      deployOptions: { stageName: environmentName },
    });
    createLambdaIntegration({
      apiGateway: api,
      method: createPersonHandler,
      methodName: "person",
      methodType: "POST",
    });
    createLambdaIntegration({
      apiGateway: api,
      method: listPersonsHandler,
      methodName: "person",
      methodType: "GET",
    });
    for (const [key, value] of Object.entries({
      PersonApiEndpoint: api.url,
      PersonApiUrl: api.urlForPath("/person"),
      PersonTableName: personTable.tableName,
      PersonEventsDlqUrl: failureQueue.queueUrl,
    })) {
      new cdk.CfnOutput(this, key, {
        value,
        exportName: createExportStageName(stackStage, key),
      });
    }
  }
}
