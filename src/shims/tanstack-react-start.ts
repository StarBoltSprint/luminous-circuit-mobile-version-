/** Local stand-in so Speak/Howl run in the land/Pages process. No TanStack Start host. */

export function createServerFn(_opts?: { method?: string }) {
  return {
    validator<I, O>(validate: (input: I) => O) {
      return {
        handler<R>(handle: (ctx: { data: O }) => Promise<R> | R) {
          return async (input: I | { data: I }): Promise<R> => {
            const raw = (
              input && typeof input === "object" && "data" in (input as object)
                ? (input as { data: I }).data
                : input
            ) as I;
            const data = validate(raw);
            return await handle({ data });
          };
        },
      };
    },
  };
}

export function createMiddleware() {
  return {
    middleware() {
      return this;
    },
    server() {
      return this;
    },
  };
}
