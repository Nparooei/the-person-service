import { ApiError, ApiErrorResponse } from "./api-error";
import { z } from "zod";

describe("ApiErrorResponse", () => {
  it("should validate a correct ApiErrorResponse object", () => {
    const validResponse = {
      status: 404,
      message: "Not Found",
    };

    expect(() => ApiErrorResponse.parse(validResponse)).not.toThrow();
  });

  it("should throw an error for an invalid ApiErrorResponse object", () => {
    const invalidResponse = {
      status: "404",
      message: "Not Found",
    };

    expect(() => ApiErrorResponse.parse(invalidResponse)).toThrow(z.ZodError);
  });

  it("should throw an error if required fields are missing", () => {
    const missingFieldsResponse = {
      message: "Not Found",
    };

    expect(() => ApiErrorResponse.parse(missingFieldsResponse)).toThrow(
      z.ZodError,
    );
  });
});

describe("ApiError", () => {
  it("should create an instance of ApiError with the correct properties", () => {
    const message = "Test Error";
    const status = 500;
    const details = { info: "Additional error details" };

    const error = new ApiError(message, status, details);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(message);
    expect(error.status).toBe(status);
    expect(error.details).toBe(details);
  });

  it("should default details to undefined if not provided", () => {
    const message = "Test Error";
    const status = 500;

    const error = new ApiError(message, status);

    expect(error.details).toBeUndefined();
  });
});
