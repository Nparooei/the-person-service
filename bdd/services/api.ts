export async function requestPersonApi(
  apiUrl: string,
  method: "POST" | "GET",
  body?: string,
  query: Record<string, string> = {},
) {
  const url = new URL(`${apiUrl}person`);
  url.search = new URLSearchParams(query).toString();
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(30000),
  });
  return { status: response.status, body: (await response.json()) as unknown };
}
