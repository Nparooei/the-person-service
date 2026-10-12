import { LambdaLog } from "lambda-log";
import { applicationConfig } from "../../../infra/config";

type LogLevel = "info" | "error" | "warn" | "debug";

interface Logger {
  info(msg: string, context?: object): void;
  debug(msg: string, context?: object): void;
  warn(msg: string, context?: object): void;
  error(msg: string | Error, context?: object): void;
}

function makeLogger(): Logger {
  const logger = new LambdaLog();
  logger.options.debug = applicationConfig().logLevel === "debug";

  return bestEffortLogger({
    info: logger.info.bind(logger),
    debug: logger.debug.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
  });
}

// Logging must never turn a completed business operation into a failure.
export function bestEffortLogger(logger: Logger): Logger {
  const invoke = (write: () => void) => {
    try {
      write();
    } catch {
      /* A broken log sink cannot safely report its own failure. */
    }
  };
  return {
    info: (msg, context) => invoke(() => logger.info(msg, context)),
    debug: (msg, context) => invoke(() => logger.debug(msg, context)),
    warn: (msg, context) => invoke(() => logger.warn(msg, context)),
    error: (msg, context) => invoke(() => logger.error(msg, context)),
  };
}
export { makeLogger, Logger, LogLevel };

// Keep logging context local to each request or record.
export function withLogContext(
  logger: Logger,
  context: Record<string, unknown>,
): Logger {
  const safe = bestEffortLogger(logger);
  return {
    info: (msg, extra) => safe.info(msg, { ...extra, ...context }),
    warn: (msg, extra) => safe.warn(msg, { ...extra, ...context }),
    debug: (msg, extra) => safe.debug(msg, { ...extra, ...context }),
    error: (msg, extra) => safe.error(msg, { ...extra, ...context }),
  };
}
