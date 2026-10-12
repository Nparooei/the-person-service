import type { APIGatewayProxyResult } from "aws-lambda";

const makeApiGatewayResult = (
  response: string,
  statusCode: number,
  responseObject: Record<string, unknown>,
  headersContent: {
    [header: string]: boolean | number | string;
  } = {},
): APIGatewayProxyResult => {
  const body = JSON.stringify({
    message: response,
    data: { ...responseObject },
  });
  return {
    statusCode,
    body,
    headers: {
      "Content-Type": "application/json",
      "Strict-Transport-Security": "max-age=31536000; includeSubdomains;",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'; upgrade-insecure-requests;",
      "X-Content-Type-Options": "nosniff",
      ...headersContent,
    },
  };
};

export { makeApiGatewayResult };
