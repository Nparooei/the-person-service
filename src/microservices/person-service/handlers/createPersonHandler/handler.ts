import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { IDynamoClient } from "../../../../adapters/dynamodb";
import { makeApiGatewayResult } from "../../../../adapters/api-gatway";
import { Logger, withLogContext } from "../../../shared/logging/logger";
import { handleError } from "../../../shared/error-handling/map-error";
import { addRecordToDatabase } from "./support";

interface MakeHandlerProps {
  personTableName: string;
  dynamoDbClient: IDynamoClient;
  logger: Logger;
}
export function makeHandler({
  personTableName,
  dynamoDbClient,
  logger,
}: MakeHandlerProps) {
  return async (
    event: APIGatewayProxyEvent,
  ): Promise<APIGatewayProxyResult> => {
    const requestLogger = withLogContext(logger, {
      service: "person-service",
      operation: "createPerson",
    });
    requestLogger.info("Person request received");
    let response: APIGatewayProxyResult;
    try {
      const body =
        event.isBase64Encoded && event.body
          ? Buffer.from(event.body, "base64").toString("utf8")
          : event.body;
      const person = await addRecordToDatabase(
        body,
        dynamoDbClient,
        personTableName,
      );
      requestLogger.info("Person created", { personId: person.id });
      response = makeApiGatewayResult("Person created", 201, person);
    } catch (error: unknown) {
      response = handleError(error, requestLogger);
    }
    requestLogger.info("Person request completed", {
      statusCode: response.statusCode,
    });
    return response;
  };
}
