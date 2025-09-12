/**
 * Environment variable validation utility
 * Validates required environment variables before the application starts
 */

export function validateEnvironmentVariables(): void {
  const requiredEnvVars = [
    'AUTH0_DOMAIN',
    'AUTH0_CLIENT_ID', 
    'AUTH0_CLIENT_SECRET',
    'AUTH0_AUDIENCE',
    'DATABASE_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    console.error('\nPlease set these environment variables before starting the API.');
    process.exit(1);
  }

  // Validate AUTH0_DOMAIN format
  if (process.env.AUTH0_DOMAIN && !process.env.AUTH0_DOMAIN.startsWith('https://')) {
    console.error('❌ AUTH0_DOMAIN must start with https://');
    console.error(`Current value: ${process.env.AUTH0_DOMAIN}`);
    console.error('Expected format: https://your-domain.auth0.com');
    process.exit(1);
  }

  console.log('✅ All required environment variables are set');
  console.log(`🔐 Auth0 Domain: ${process.env.AUTH0_DOMAIN}`);
  console.log(`🎯 Auth0 Audience: ${process.env.AUTH0_AUDIENCE}`);
}
