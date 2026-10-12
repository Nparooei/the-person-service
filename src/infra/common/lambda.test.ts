import { Stack, Duration } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { createLambdaHandler } from "./lambda";

jest.mock("aws-cdk-lib/aws-lambda-nodejs");
describe("Lambda defaults", () => {
  beforeEach(() => jest.clearAllMocks());
  it("uses Node 24 and bundles its own dependencies", () => {
    createLambdaHandler(new Stack(), "person-handler", { entry: "handler.ts" });
    expect(NodejsFunction).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({
        runtime: Runtime.NODEJS_24_X,
        handler: "handler",
        bundling: { externalModules: [], minify: true, sourceMap: true },
      }),
    );
  });
  it("retains per-handler overrides without dropping bundling defaults", () => {
    createLambdaHandler(new Stack(), "publisher", {
      entry: "handler.ts",
      timeout: Duration.seconds(30),
      bundling: { minify: false },
    });
    expect(NodejsFunction).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({
        timeout: Duration.seconds(30),
        bundling: { externalModules: [], minify: false, sourceMap: true },
      }),
    );
  });
});
