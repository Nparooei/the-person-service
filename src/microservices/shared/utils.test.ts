import { applicationConfig } from "../../infra/config";
import { createResourceId, currentTimestamp } from "./utils";

jest.mock("../../infra/config");

describe("createResourceId", () => {
  const mockConfig = {
    suffix: "testSuffix",
    region: "us-east-1",
  };

  beforeEach(() => {
    (applicationConfig as jest.Mock).mockReturnValue(mockConfig);
    jest.clearAllMocks();
  });

  it("should create a resource ID using the suffix and region from applicationConfig", () => {
    const id = "myResource";
    const expectedResourceId = "testSuffix-us-east-1-myResource";

    const result = createResourceId(id);

    expect(applicationConfig).toHaveBeenCalled();
    expect(result).toBe(expectedResourceId);
  });

  it("should create a different resource ID if the config changes", () => {
    (applicationConfig as jest.Mock).mockReturnValue({
      suffix: "differentSuffix",
      region: "eu-west-1",
    });

    const id = "anotherResource";
    const expectedResourceId = "differentSuffix-eu-west-1-anotherResource";

    const result = createResourceId(id);

    expect(applicationConfig).toHaveBeenCalled();
    expect(result).toBe(expectedResourceId);
  });
});

describe("currentTimestamp", () => {
  it("should return the current timestamp in ISO format", () => {
    const mockDate = new Date("2023-01-01T00:00:00.000Z");
    jest.spyOn(global, "Date").mockImplementation(() => mockDate);

    const result = currentTimestamp();

    expect(result).toBe("2023-01-01T00:00:00.000Z");

    jest.restoreAllMocks();
  });

  it("should return a valid ISO 8601 timestamp", () => {
    const result = currentTimestamp();

    expect(new Date(result).toISOString()).toBe(result);
  });
});
