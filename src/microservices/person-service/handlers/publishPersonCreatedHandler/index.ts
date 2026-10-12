import { createEventBridgeClient } from "../../../../adapters/event-bridge";
import { EnvVariableSchema } from "../../../shared/domain/domainTransferObjects";
import { makeLogger } from "../../../shared/logging/logger";
import { makeHandler } from "./handler";

export const handler = makeHandler({
  eventBridgeClient: createEventBridgeClient(
    EnvVariableSchema.parse(process.env.EVENT_BUS),
  ),
  logger: makeLogger(),
});
