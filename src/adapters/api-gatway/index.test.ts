import { makeApiGatewayResult } from ".";

describe("makeApiGatewayResult", () => {
  test("returns a valid APIGatewayProxyResult", () => {
    const response = { message: "Hello, world!" };
    const statusCode = 200;
    const headersContent = { "x-custom-header": "custom value" };

    const result = makeApiGatewayResult(
      JSON.stringify(response),
      statusCode,
      {},
      headersContent,
    );

    expect(result.statusCode).toEqual(statusCode);
    expect(result.headers).toEqual({
      "Content-Type": "application/json",
      "Strict-Transport-Security": "max-age=31536000; includeSubdomains;",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'; upgrade-insecure-requests;",
      "X-Content-Type-Options": "nosniff",
      ...headersContent,
    });
  });
});
