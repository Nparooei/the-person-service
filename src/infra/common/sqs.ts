import { Construct } from "constructs";
import { RemovalPolicy } from "aws-cdk-lib";
import { Queue, QueueProps } from "aws-cdk-lib/aws-sqs";
import { createResourceId } from "../../microservices/shared/utils";

function createSqsQueue(
  scope: Construct,
  id: string,
  props: QueueProps = {},
): Queue {
  const queueName = createResourceId(id);
  return new Queue(scope, queueName, {
    queueName: id,
    removalPolicy: RemovalPolicy.DESTROY,
    ...props,
  });
}

export { createSqsQueue };
