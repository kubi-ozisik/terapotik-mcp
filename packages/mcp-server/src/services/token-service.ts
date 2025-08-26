/**
 * Service for token validation and management
 */
export class TokenService {
  /**
   * Validates if a token is properly formatted
   * @param accessToken The access token to validate
   * @returns True if the token appears valid, false otherwise
   */
  static validateTokenFormat(accessToken?: string): boolean {
    // Check if token is empty or undefined
    if (!accessToken) {
      console.log("No token found");
      return false;
    }

    let isInvalidFormat = false;

    // Detailed logging for debugging
    console.log(
      "Before token analysis, invalid format flag is:",
      isInvalidFormat
    );

    try {
      const tokenParts = accessToken.split(".");
      if (tokenParts.length === 3) {
        // Standard JWT format (header.payload.signature)
        console.log("Found standard JWT token format (RS256)");
        const headerBase64 = tokenParts[0];
        if (headerBase64) {
          const headerJson = Buffer.from(headerBase64, "base64").toString(
            "utf8"
          );
          console.log(`Token header: ${headerJson}`);

          // Check if it's a JWT with RS256 algorithm
          try {
            const header = JSON.parse(headerJson);
            if (header.alg !== "RS256") {
              console.log(`Token uses ${header.alg} algorithm, not RS256`);
              isInvalidFormat = true;
            }
          } catch (e) {
            console.log(`Error parsing header JSON: ${e}`);
            isInvalidFormat = true;
          }
        }
      } else {
        console.log(
          `Token does not appear to be in standard JWT format, has ${tokenParts.length} parts`
        );
        isInvalidFormat = true;
      }
    } catch (error: any) {
      console.log(`Error analyzing token format: ${error.message}`);
      isInvalidFormat = true;
    }

    // After token analysis, log the result
    console.log(
      "After token analysis, invalid format flag is:",
      isInvalidFormat
    );
    return !isInvalidFormat;
  }
}
