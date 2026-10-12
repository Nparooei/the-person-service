export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function eventually<T>(
  read: () => Promise<T | undefined>,
  timeoutMs = 30000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  do {
    const value = await read();
    if (value !== undefined) return value;
    await sleep(250);
  } while (Date.now() < deadline);
  throw new Error(
    `Expected asynchronous result did not arrive within ${timeoutMs}ms`,
  );
}
