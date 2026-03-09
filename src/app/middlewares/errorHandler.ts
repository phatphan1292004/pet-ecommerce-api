import { Response } from "express";
import { AppError } from "../exceptions";
import { logger } from "../logger";

export const errorHandler = (err: Error, res: Response) => {
  logger.error("Error:", err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(process.env.NODE_ENV === "development" && {
      error: err.message,
      stack: err.stack,
    }),
  });
};
