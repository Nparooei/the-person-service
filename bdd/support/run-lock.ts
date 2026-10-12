import { randomUUID } from "node:crypto";
import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

export const BDD_RUN_LOCK_ID = "bdd-test-run-lock";

// No expiry: an active run must never lose exclusivity during a long pause.
export function createRunLock(tableName: string) {
  if (!tableName.startsWith("person-bdd-"))
    throw new Error("Refusing to lock a non-BDD table");
  const client = new DynamoDBClient({});
  const owner = randomUUID();
  let acquired = false;
  return {
    async acquire() {
      try {
        await client.send(
          new PutItemCommand({
            TableName: tableName,
            Item: marshall({
              id: BDD_RUN_LOCK_ID,
              owner,
              startedAt: new Date().toISOString(),
            }),
            ConditionExpression: "attribute_not_exists(id)",
          }),
        );
        acquired = true;
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "ConditionalCheckFailedException"
        ) {
          throw new Error(
            "Another BDD run owns this stage, or an interrupted run left its lock. Use a different stage or remove the stale lock after confirming no run is active.",
            { cause: error },
          );
        }
        throw error;
      }
    },
    async release() {
      if (!acquired) return;
      await client.send(
        new DeleteItemCommand({
          TableName: tableName,
          Key: marshall({ id: BDD_RUN_LOCK_ID }),
          ConditionExpression: "#owner = :owner",
          ExpressionAttributeNames: { "#owner": "owner" },
          ExpressionAttributeValues: marshall({ ":owner": owner }),
        }),
      );
      acquired = false;
    },
  };
}
