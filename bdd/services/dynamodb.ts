import {
  DynamoDBClient,
  AttributeValue,
  GetItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

import { BDD_RUN_LOCK_ID } from "../support/run-lock";
import { createDynamoClient } from "../../src/adapters/dynamodb";

const client = new DynamoDBClient({});
const dynamoDbClient = createDynamoClient();
export async function readRecordFromDynamoDB(
  tableName: string,
  key: Record<string, unknown>,
) {
  const result = await client.send(
    new GetItemCommand({
      TableName: tableName,
      Key: marshall(key),
      ConsistentRead: true,
    }),
  );
  return result.Item ? unmarshall(result.Item) : undefined;
}
export async function readDataFromDynamoDB(tableName: string) {
  const items: Record<string, unknown>[] = [];
  let startKey: Record<string, AttributeValue> | undefined;
  do {
    const page = await dynamoDbClient.scanItems(tableName, { startKey });
    items.push(...page.items);
    startKey = page.lastEvaluatedKey;
  } while (startKey);
  return items;
}

export async function clearTable(tableName: string) {
  if (!tableName.startsWith("person-bdd-"))
    throw new Error("Refusing to clear a non-BDD table");
  const items = await readDataFromDynamoDB(tableName);
  for (const item of items) {
    if (item.id === BDD_RUN_LOCK_ID) continue;
    await client.send(
      new DeleteItemCommand({
        TableName: tableName,
        Key: marshall({ id: item.id }),
      }),
    );
  }
}
