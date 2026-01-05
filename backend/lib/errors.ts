export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message: string, code?: string) {
    return new AppError(message, 400, code);
  }

  static unauthorized(message = "Unauthorized", code?: string) {
    return new AppError(message, 401, code);
  }

  static forbidden(message = "Forbidden", code?: string) {
    return new AppError(message, 403, code);
  }

  static notFound(message = "Not found", code?: string) {
    return new AppError(message, 404, code);
  }

  static conflict(message: string, code?: string) {
    return new AppError(message, 409, code);
  }

  static internal(message = "Internal server error", code?: string) {
    return new AppError(message, 500, code);
  }
}
