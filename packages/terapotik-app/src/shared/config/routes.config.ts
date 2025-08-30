export const loginUrl = "/auth/login";
export const apiAuthPrefix = "/api";

/**
 * routes that are used for authentication
 * @type {string[]}
 */
export const authenticationRoutes = [
  "/auth/login",
  "/auth/register",
  "/auth/error",
  "/auth/recover-password",
  "/auth/forgot-password",
  "/auth/new-password",
  "/auth/activate",
];

/**
 * The path after logging in
 *
 * @type {string}
 */
export const redirectAfterLogin = "/chat";

/**
 * Routes do not require authentication
 */
export const publicRoutes = [
  "/landing-page",
  "/landing-beta",
  "/landing",
  "/site",
  "/auth/activate-account",
  "/domain",
  "/views",
  "/meet",
  "/meeting",
  "/call",
  "/test-audio",
  "/test-audio-direct",
  "/invitation",
];
