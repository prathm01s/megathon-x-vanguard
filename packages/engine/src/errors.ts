/** Thrown for invalid actions or states. `code` is stable and safe to show via `messages/`. */
export class EngineError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "EngineError";
  }
}

export class NotImplementedError extends EngineError {
  constructor(what: string) {
    super("not_implemented", `${what} is not implemented yet`);
  }
}
