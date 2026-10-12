import {
  DynamoDBClient,
  AttributeValue,
  PutItemCommand,
  PutItemCommandOutput,
  ScanCommand,
  DeleteItemCommand,
  DeleteItemCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { UnMarshalledItem } from "./types";
import { MAX_PAGE_SIZE } from "../../config";

export interface ScanOptions {
  limit?: number;
  startKey?: Record<string, AttributeValue>;
}
export interface ScanPage {
  items: UnMarshalledItem[];
  lastEvaluatedKey?: Record<string, AttributeValue>;
}

export interface IDynamoClient {
  putItem(
    item: UnMarshalledItem,
    tableName: string,
  ): Promise<PutItemCommandOutput>;
  scanItems(tableName: string, options?: ScanOptions): Promise<ScanPage>;
  deleteItem(
    key: UnMarshalledItem,
    tableName: string,
  ): Promise<DeleteItemCommandOutput>;
}

export const createDynamoClient = (): IDynamoClient => {
  const client = new DynamoDBClient({});
  return {
    putItem: (item, tableName) =>
      client.send(
        new PutItemCommand({
          TableName: tableName,
          Item: marshall(item),
        }),
      ),
    scanItems: async (tableName, { limit = MAX_PAGE_SIZE, startKey } = {}) => {
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
        throw new RangeError(
          `Page size must be between 1 and ${MAX_PAGE_SIZE}`,
        );
      }
      const response = await client.send(
        new ScanCommand({
          TableName: tableName,
          ConsistentRead: true,
          Limit: limit,
          ExclusiveStartKey: startKey,
        }),
      );
      return {
        items: (response.Items ?? []).map((item) => unmarshall(item)),
        lastEvaluatedKey:
          response.LastEvaluatedKey &&
          Object.keys(response.LastEvaluatedKey).length
            ? response.LastEvaluatedKey
            : undefined,
      };
    },
    deleteItem: (key, tableName) =>
      client.send(
        new DeleteItemCommand({
          TableName: tableName,
          Key: marshall(key),
        }),
      ),
  };
};
