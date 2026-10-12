import { LambdaLog } from "lambda-log";
import { makeLogger } from "./logger";
import { applicationConfig } from "../../../infra/config";

jest.mock("lambda-log");
jest.mock("../../../infra/config");

describe("makeLogger", () => {
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    options: {
      debug: false,
    },
  };

  beforeEach(() => {
    (LambdaLog as unknown as jest.Mock).mockImplementation(() => mockLogger);

    (applicationConfig as jest.Mock).mockReturnValue({
      logLevel: "debug",
    });

    jest.clearAllMocks();
  });

  it("should create a logger with the correct log level", () => {
    makeLogger();

    expect(applicationConfig).toHaveBeenCalled();

    expect(LambdaLog).toHaveBeenCalled();

    expect(mockLogger.options.debug).toBe(true);
  });

  it("should return a logger with correctly bound methods", () => {
    const logger = makeLogger();

    const msg = "test message";
    const context = { key: "value" };

    logger.info(msg, context);
    logger.debug(msg, context);
    logger.warn(msg, context);
    logger.error(msg, context);

    expect(mockLogger.info).toHaveBeenCalledWith(msg, context);
    expect(mockLogger.debug).toHaveBeenCalledWith(msg, context);
    expect(mockLogger.warn).toHaveBeenCalledWith(msg, context);
    expect(mockLogger.error).toHaveBeenCalledWith(msg, context);
  });
  it("contains log sink exceptions at every level", () => {
    const logger = makeLogger();
    for (const level of ["info", "debug", "warn", "error"] as const) {
      mockLogger[level].mockImplementationOnce(() => {
        throw new Error("Sink failed");
      });
      expect(() => logger[level]("message")).not.toThrow();
    }
  });
});
