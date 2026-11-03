/**
 * Logs only non-sensitive error metadata. Never emit raw messages, stack traces,
 * request bodies, tokens, headers, or provider response bodies from API handlers.
 */
export function logSafeError(event: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "UnknownError";
  const code = error && typeof error === "object" && "code" in error &&
    typeof error.code === "string" ? error.code : undefined;
  console.error(event, { name, ...(code ? { code } : {}) });
}
