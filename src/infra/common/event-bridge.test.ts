import { Stack } from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import { createEventBus } from "./event-bridge";
import { Construct } from "constructs";
import { createResourceId } from "../../microservices/shared/utils";

jest.mock("aws-cdk-lib/aws-events");
jest.mock("../../microservices/shared/utils", () => ({
  createResourceId: jest.fn().mockReturnValue("testEventBusName"),
}));

describe("createEventBus", () => {
  let stack: Stack;
  let mockScope: Construct;

  beforeEach(() => {
    stack = new Stack();
    mockScope = new Construct(stack, "MockScope");
    jest.clearAllMocks();
  });

  it("should create an EventBus with the correct properties", () => {
    const mockProps: events.EventBusProps = {
      eventBusName: "TestEventBus",
    };

    const eventBus = createEventBus(mockScope, "TestEventBus", mockProps);

    expect(events.EventBus).toHaveBeenCalledWith(
      mockScope,
      "testEventBusName",
      {
        eventBusName: "TestEventBus",
        ...mockProps,
      },
    );

    expect(eventBus).toBeInstanceOf(events.EventBus);
  });

  it("should use createResourceId to generate the EventBus name", () => {
    createEventBus(mockScope, "TestEventBus", {
      eventBusName: "TestEventBus",
    });

    expect(createResourceId).toHaveBeenCalledWith("TestEventBus");
  });
});
