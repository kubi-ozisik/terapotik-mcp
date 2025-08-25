import * as dotenv from "dotenv";
import { expressjwt } from "express-jwt";
import jwtAuthz from "express-jwt-authz";
import jwksRsa from "jwks-rsa";

dotenv.config();

export const checkJwt: any = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  }),

  // Validate the audience and the issuer.
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ["RS256"],
});

export const checkPermissions = (permissions: string[]) => {
  return jwtAuthz(permissions, {
    customScopeKey: "permissions",
    checkAllScopes: true,
    failWithError: true,
  });
};
