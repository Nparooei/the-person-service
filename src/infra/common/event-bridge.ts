import { Construct } from "constructs";
import * as events from "aws-cdk-lib/aws-events";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { createResourceId } from "../../microservices/shared/utils";

function createEventBus(
  scope: Construct,
  id: string,
  props: events.EventBusProps,
): events.EventBus {
  const eventBusName = createResourceId(id);
  const eventBus = new events.EventBus(scope, eventBusName, {
    eventBusName: id,
    ...props,
  });

  return eventBus;
}

function referenceEventBus(
  scope: Construct,
  id: string,
  arn: string,
): events.IEventBus {
  const eventBus = events.EventBus.fromEventBusArn(scope, id, arn);

  return eventBus;
}

interface createScheduleRuleProps {
  lambdaFunctionTarget: lambda.Function;
  durationInMinutes: number;
}
function createScheduleRule(
  scope: Construct,
  id: string,
  props: createScheduleRuleProps,
): events.Rule {
  const ruleName = createResourceId(id);
  const { lambdaFunctionTarget, durationInMinutes } = props;
  const rule = new events.Rule(scope, id, {
    ruleName,
    schedule: events.Schedule.rate(cdk.Duration.minutes(durationInMinutes)),
    targets: [new targets.LambdaFunction(lambdaFunctionTarget)],
  });

  return rule;
}

export { createEventBus, referenceEventBus, createScheduleRule };
