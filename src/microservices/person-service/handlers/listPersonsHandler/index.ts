import { createDynamoClient } from "../../../../adapters/dynamodb";
import { EnvVariableSchema } from "../../../shared/domain/domainTransferObjects";
import { makeLogger } from "../../../shared/logging/logger";
import { makeHandler } from "./handler";

export const handler = makeHandler({
  personTableName: EnvVariableSchema.parse(process.env.PERSON_TABLE),
  dynamoDbClient: createDynamoClient(),
  logger: makeLogger(),
});
