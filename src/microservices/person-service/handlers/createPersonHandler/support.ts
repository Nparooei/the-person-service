import { ulid } from "ulid";
import { IDynamoClient } from "../../../../adapters/dynamodb";
import { PersonCreateInputSchema } from "../../../shared/domain/domainTransferObjects";
import { Person } from "../../../shared/domain/entities";
import { ApiError } from "../../../shared/error-handling/api-error";
import { currentTimestamp } from "../../../shared/utils";

export function parseCreatePersonInput(body: string | null) {
  let input: unknown;
  try {
    input = JSON.parse(body ?? "");
  } catch {
    throw new ApiError("Request body must be valid JSON", 400);
  }
  return PersonCreateInputSchema.parse(input);
}

export async function addRecordToDatabase(
  body: string | null,
  client: IDynamoClient,
  tableName: string,
): Promise<Person> {
  const input = parseCreatePersonInput(body);
  const person: Person = {
    ...input,
    id: ulid(),
    dateCreated: currentTimestamp(),
  };
  await client.putItem(person, tableName);
  return person;
}
