import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";

const client = new CloudFormationClient();

async function getStackOutputs(stackName: string, key: string) {
  const command = new DescribeStacksCommand({ StackName: stackName });
  const response = await client.send(command);
  const outputs = response.Stacks?.[0]?.Outputs;
  return outputs?.find((output) => output.ExportName === key)?.OutputValue;
}

export { getStackOutputs };
