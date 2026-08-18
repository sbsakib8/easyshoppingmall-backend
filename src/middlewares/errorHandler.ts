import { NextFunction, Request, Response } from "express";

// Centralized error handling middleware
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log the error for debugging purposes (you might use a more sophisticated logger here)
  console.error("--- Error Details ---");
  console.error(`Path: ${req.path}`);
  console.error(`Method: ${req.method}`);
  console.error(`Error Message: ${err.message}`);
  console.error(`Error Stack: ${err.stack}`);
  console.error("---------------------");

  // Determine status code and message
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Send error response
  res.status(statusCode).json({
    success: false,
    message: message,
    // In production, you might not want to send the stack trace
    // stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

export default errorHandler;
