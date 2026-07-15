import type { ApiErrorResponse } from "./types";

/** Small fetch helper shared by the client. Throws a plain Error with a
 *  user-facing message pulled from the API's JSON error body, never
 *  exposing raw response bodies, status text, or stack traces to the UI. */
export async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("We couldn't reach the server. Please check your connection and try again.");
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Something went wrong. Please try again.");
  }

  if (!res.ok) {
    const message = (data as ApiErrorResponse | undefined)?.error;
    throw new Error(message || "Something went wrong. Please try again.");
  }

  return data as TResponse;
}
