import dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";
import { auth, UnauthorizedError } from "express-oauth2-jwt-bearer";

// Initialize dotenv to load environment variables
dotenv.config();

// Auth0 configuration
const domain = process.env.AUTH0_DOMAIN || "";
const audience = process.env.AUTH0_AUDIENCE || "";

console.log("[DEBUG] JWT middleware configuration:");
console.log(`  Domain: ${domain}`);
console.log(`  Audience: ${audience}`);

// Middleware for validating JWT tokens
export const checkJwt = auth({
  audience: audience,
  issuerBaseURL: domain,
  tokenSigningAlg: "RS256",
});

// Optional debugging middleware
export const debugJwt = (req: Request, res: Response, next: NextFunction) => {
  console.log("[DEBUG] Request headers:", req.headers);
  console.log("[DEBUG] Auth header:", req.headers.authorization);
  next();
};

// Error handler middleware for authentication errors
export const handleAuthErrors = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("[DEBUG] Auth error occurred:", err.name, err.message);

  if (err instanceof UnauthorizedError) {
    // Authentication error - return 401 Unauthorized with a clean message
    return res.status(401).json({
      status: "unauthorized",
      message: "Invalid or missing access token",
      error: err.message,
    });
  }

  // For other errors, pass them to the next error handler
  return next(err);
};

// Middleware to check for specific scopes
export const requireScope = (requiredScope: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { auth } = req as any;

    if (!auth || !auth.payload) {
      // No auth information - return 401 Unauthorized
      return res.status(401).json({
        status: "unauthorized",
        message: "Authentication required",
      });
    }

    console.log("[DEBUG] Auth payload:", auth.payload);
    console.log("[DEBUG] Scopes:", auth.payload.scope);

    const scopes = auth.payload.scope?.split(" ") || [];

    if (scopes.includes(requiredScope)) {
      return next();
    }

    // Has auth but lacks permission - return 403 Forbidden
    return res.status(403).json({
      status: "forbidden",
      message: `Required scope '${requiredScope}' is missing`,
    });
  };
};
