import { makeLogger } from "../../../shared/logging/logger";
import { makeHandler } from "./handler";

export const handler = makeHandler({ logger: makeLogger() });
