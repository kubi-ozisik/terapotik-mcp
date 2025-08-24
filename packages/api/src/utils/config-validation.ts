/**
 * Validates required environment variables
 * @returns Object with validation result and missing variables
 */
export function validateRequiredConfig(): {
  isValid: boolean;
  missingVars: string[];
  warnings: string[];
} {
  const requiredVars = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "AUTH0_DOMAIN",
    "AUTH0_AUDIENCE",
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);
  const warnings: string[] = [];

  if (missingVars.length > 0) {
    warnings.push(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
    warnings,
  };
}

/**
 * Validates the configuration and exits the process if critical variables are missing
 */
export function validateConfigOrExit(): void {
  const { isValid, missingVars, warnings } = validateRequiredConfig();

  if (warnings.length > 0) {
    console.warn("\x1b[33m%s\x1b[0m", "⚠️ Configuration Warning:");
    warnings.forEach((warning) => {
      console.warn("\x1b[33m%s\x1b[0m", warning);
    });
  }

  if (!isValid) {
    console.error("\x1b[31m%s\x1b[0m", "❌ Fatal Configuration Error:");
    console.error(
      "\x1b[31m%s\x1b[0m",
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
    console.error(
      "\x1b[31m%s\x1b[0m",
      "Server cannot start with incomplete configuration"
    );
    console.error(
      "\x1b[31m%s\x1b[0m",
      "Please set these variables in your .env file or environment"
    );
    process.exit(1);
  }
}
