import { Construct } from "constructs";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays, LogGroup } from "aws-cdk-lib/aws-logs";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { createResourceId } from "../../microservices/shared/utils";

export function createLambdaHandler(
  scope: Construct,
  id: string,
  props: NodejsFunctionProps,
) {
  return new NodejsFunction(scope, createResourceId(id), {
    functionName: id,
    runtime: Runtime.NODEJS_24_X,
    handler: "handler",
    timeout: Duration.seconds(10),
    logGroup: new LogGroup(scope, createResourceId(`${id}_logs`), {
      logGroupName: `/aws/lambda/${id}`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    }),
    ...props,
    bundling: {
      externalModules: [],
      minify: true,
      sourceMap: true,
      ...props.bundling,
    },
  });
}
