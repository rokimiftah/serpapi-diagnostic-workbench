import type { Context } from "hono";

import { HTTPException } from "hono/http-exception";

import { config } from "../config/index.ts";
import { AppError } from "./errors.ts";
import { log } from "./logger.ts";

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    requestId?: string;
    stack?: string;
  };
}

export function handleError(err: Error, c: Context): Response {
  const requestId = c.get("requestId") as string | undefined;

  let statusCode = 500;
  let message = "Internal server error";
  let code: string | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  } else if (err instanceof HTTPException) {
    statusCode = err.status;
    message = err.message;
  }

  // Log error with details
  log.error(`${statusCode} ${message}`, {
    requestId,
    code,
    path: c.req.path,
    method: c.req.method,
    ...(config.isDev && { stack: err.stack }),
  });

  const response: ErrorResponse = {
    success: false,
    error: {
      message,
      code,
      requestId,
      ...(config.isDev && { stack: err.stack }),
    },
  };

  return c.json(response, statusCode as 400 | 401 | 403 | 404 | 409 | 500);
}
