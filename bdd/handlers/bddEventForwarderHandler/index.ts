import {
  IDynamoClient,
  createDynamoClient,
} from "../../../src/adapters/dynamodb";
import { makeLogger } from "../../../src/microservices/shared/logging/logger";
import { EnvVariableSchema } from "../../../src/microservices/shared/domain/domainTransferObjects";
import { makeHandler } from "./handler";

const bddEventsTable = EnvVariableSchema.parse(process.env.BDD_EVENTS_TABLE);
const dynamoDbClient: IDynamoClient = createDynamoClient();
const logger = makeLogger();

const handler = makeHandler({
  bddEventsTable,
  dynamoDbClient,
  logger,
});

export { handler };
