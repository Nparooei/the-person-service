import { APIGatewayProxyEvent } from "aws-lambda";
import { makeHandler } from "./handler";
import { PersonSchema } from "../../../shared/domain/entities";
import {
  personInput,
  mockDynamoClient,
  mockLogger,
} from "../../../shared/testing/person";

const event = (body: string | null, isBase64Encoded = false) =>
  ({ body, isBase64Encoded }) as APIGatewayProxyEvent;
describe("Create person", () => {
  const db = mockDynamoClient();
  const logger = mockLogger();
  const handler = makeHandler({
    personTableName: "persons",
    dynamoDbClient: db,
    logger,
  });
  beforeEach(() => {
    jest.clearAllMocks();
    db.putItem.mockResolvedValue({ $metadata: {} });
  });
  it("stores all fields before returning 201", async () => {
    const result = await handler(event(JSON.stringify(personInput)));
    expect(result.statusCode).toBe(201);
    const saved = PersonSchema.parse(JSON.parse(result.body).data);
    expect(saved).toMatchObject(personInput);
    expect(db.putItem).toHaveBeenCalledWith(saved, "persons");
    expect(logger.info).toHaveBeenCalledWith("Person created", {
      personId: saved.id,
      service: "person-service",
      operation: "createPerson",
    });
  });
  it("does not return success before the database acknowledges the write", async () => {
    let finish!: () => void;
    db.putItem.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ $metadata: {} });
        }),
    );
    let completed = false;
    const pending = handler(event(JSON.stringify(personInput))).then(
      (result) => {
        completed = true;
        return result;
      },
    );
    await Promise.resolve();
    expect(completed).toBe(false);
    finish();
    expect((await pending).statusCode).toBe(201);
  });
  it("decodes API Gateway base64 bodies", async () =>
    expect(
      (
        await handler(
          event(
            Buffer.from(JSON.stringify(personInput)).toString("base64"),
            true,
          ),
        )
      ).statusCode,
    ).toBe(201));
  it.each([
    null,
    "",
    "{invalid",
    "null",
    "[]",
    JSON.stringify({ ...personInput, address: {} }),
    JSON.stringify({ ...personInput, phoneNumber: "invalid" }),
  ])("rejects invalid input without storing a person: %p", async (body) => {
    expect((await handler(event(body))).statusCode).toBe(400);
    expect(db.putItem).not.toHaveBeenCalled();
  });
  it("returns a safe 500 when persistence fails", async () => {
    db.putItem.mockRejectedValueOnce(
      new Error("sensitive infrastructure details"),
    );
    const result = await handler(event(JSON.stringify(personInput)));
    expect(result.statusCode).toBe(500);
    expect(result.body).not.toContain("sensitive");
  });
  it("assigns different IDs to different persons", async () => {
    const first = await handler(event(JSON.stringify(personInput)));
    const second = await handler(
      event(
        JSON.stringify({
          firstName: "Grace",
          lastName: "Hopper",
          phoneNumber: "+31687654321",
          address: {
            street: "Sample Avenue",
            houseNumber: "24B",
            postalCode: "3011CD",
            city: "Rotterdam",
            country: "Netherlands",
          },
        }),
      ),
    );
    expect(JSON.parse(first.body).data.id).not.toBe(
      JSON.parse(second.body).data.id,
    );
  });

  it("returns 201 after a successful write even when all logging throws", async () => {
    const throwingLogger = mockLogger();
    throwingLogger.info.mockImplementation(() => {
      throw new Error("Log sink failed");
    });
    throwingLogger.error.mockImplementation(() => {
      throw new Error("Log sink failed");
    });
    const safeHandler = makeHandler({
      personTableName: "persons",
      dynamoDbClient: db,
      logger: throwingLogger,
    });
    const response = await safeHandler(event(JSON.stringify(personInput)));
    expect(response.statusCode).toBe(201);
    expect(db.putItem).toHaveBeenCalledTimes(1);
    db.putItem.mockRejectedValueOnce(new Error("Write failed"));
    expect(
      (await safeHandler(event(JSON.stringify(personInput)))).statusCode,
    ).toBe(500);
  });
});
