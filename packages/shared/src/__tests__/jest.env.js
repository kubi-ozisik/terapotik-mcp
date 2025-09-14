// Load environment variables from .env file
const path = require('path');
const dotenv = require('dotenv');

// Try to load .env file from project root
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AZURE_STORAGE_CONTAINER_NAME = 'artifacts-test';

// Validate required environment variables
if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
  console.warn('⚠️  AZURE_STORAGE_CONNECTION_STRING not found in environment variables.');
  console.warn('   Please set it in your .env file or as an environment variable.');
  console.warn('   Example: AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=...');
}