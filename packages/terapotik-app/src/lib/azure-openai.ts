// src/lib/azure-openai.ts

import { createAzure } from '@ai-sdk/azure';
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai';

if (!process.env.AZURE_OPENAI_API_KEY) {
  throw new Error('AZURE_OPENAI_API_KEY environment variable is required');
}

// Values from your working Python example
const DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-5-chat";
const API_VERSION = "2024-04-01-preview";

export const azure = createAzure({
  resourceName: 'kubi-m7tqigi6-eastus2', 
  apiKey: process.env.AZURE_OPENAI_API_KEY,
});

export const config = {
  // Use the deployment name as the model identifier for Azure OpenAI
  model: DEPLOYMENT_NAME,
  temperature: 1.0,
  maxTokens: 800,
  reasoningModel: 'NOT/SET',
};

// reasoning model
export const enhancedModel = wrapLanguageModel({
  model: azure(config.reasoningModel),
  middleware: extractReasoningMiddleware({ tagName: 'think' }),
});