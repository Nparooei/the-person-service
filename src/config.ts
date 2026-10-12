import { z } from "zod";

export const MAX_PAGE_SIZE = z.coerce
  .number()
  .int()
  .positive()
  .parse(process.env.MAX_PAGE_SIZE ?? "5");
