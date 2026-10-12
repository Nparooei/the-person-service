import { z } from "zod";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { IDynamoClient, ScanOptions } from "../../../../adapters/dynamodb";
import { MAX_PAGE_SIZE } from "../../../../config";
import { PersonSchema } from "../../../shared/domain/entities";
import { ApiError } from "../../../shared/error-handling/api-error";

const PaginationSchema = z.object({
  limit: z
    .string()
    .regex(/^[1-9]\d*$/)
    .refine(
      (value) => Number(value) <= MAX_PAGE_SIZE,
      `limit must be an integer between 1 and ${MAX_PAGE_SIZE}`,
    )
    .optional(),
  nextToken: z
    .string()
    .min(1)
    .max(256)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
});
const CursorSchema = z.strictObject({ id: z.ulid() });

export async function listPersons(
  client: IDynamoClient,
  tableName: string,
  query: Record<string, string | undefined> = {},
) {
  const { limit, nextToken } = PaginationSchema.parse(query);
  let startKey: ScanOptions["startKey"];
  if (nextToken !== undefined) {
    try {
      const decoded = Buffer.from(nextToken, "base64url");
      if (decoded.toString("base64url") !== nextToken)
        throw new Error("Invalid encoding");
      startKey = marshall(
        CursorSchema.parse(JSON.parse(decoded.toString("utf8"))),
      );
    } catch {
      throw new ApiError("Invalid pagination token", 400);
    }
  }
  const page = await client.scanItems(tableName, {
    limit: limit === undefined ? MAX_PAGE_SIZE : Number(limit),
    startKey,
  });
  // Invalid persisted data is a server error, not a bad client request.
  const persons = PersonSchema.array().safeParse(page.items);
  if (!persons.success) throw new Error("Invalid stored person data");
  const cursor = page.lastEvaluatedKey
    ? CursorSchema.safeParse(unmarshall(page.lastEvaluatedKey))
    : undefined;
  if (cursor && !cursor.success)
    throw new Error("Invalid stored pagination key");
  return {
    persons: persons.data,
    nextToken: cursor?.success
      ? Buffer.from(JSON.stringify(cursor.data)).toString("base64url")
      : null,
  };
}
