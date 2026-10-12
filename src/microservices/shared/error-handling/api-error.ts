import { z } from "zod";

const ApiErrorResponse = z.object({
  status: z.number(),
  message: z.string(),
});

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

export { ApiError, ApiErrorResponse };
