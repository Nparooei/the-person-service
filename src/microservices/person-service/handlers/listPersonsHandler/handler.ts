import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { IDynamoClient } from "../../../../adapters/dynamodb";
import { makeApiGatewayResult } from "../../../../adapters/api-gatway";
import { Logger, withLogContext } from "../../../shared/logging/logger";
import { handleError } from "../../../shared/error-handling/map-error";
import { listPersons } from "./support";
import { ApiError } from "../../../shared/error-handling/api-error";

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
      operation: "listPersons",
    });
    requestLogger.info("Person request received");
    let response: APIGatewayProxyResult;
    try {
      for (const key of ["limit", "nextToken"]) {
        if ((event.multiValueQueryStringParameters?.[key]?.length ?? 0) > 1) {
          throw new ApiError(`Repeated ${key} parameter`, 400);
        }
      }
      const result = await listPersons(
        dynamoDbClient,
        personTableName,
        event.queryStringParameters ?? {},
      );
      requestLogger.info("Persons listed", { count: result.persons.length });
      response = makeApiGatewayResult("Persons listed", 200, result);
    } catch (error: unknown) {
      response = handleError(error, requestLogger);
    }
    requestLogger.info("Person request completed", {
      statusCode: response.statusCode,
    });
    return response;
  };
}
