// src/modules/agent-smeet/core/config.ts

export const AI_MODELS = {
    GPT_4_1_MINI: "gpt-4.1-mini",
    O3_MINI: "o3-mini",
    O4_MINI: "o4-mini",
  } as const;
  
  export type AIModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];
  
  export interface ModelConfig {
    maxTokens: number;
    contextWindow: number;
    pricing: {
      input: number; // per 1M tokens
      output: number; // per 1M tokens
    };
    features: string[];
    reasoningEffort?: ("low" | "medium" | "high")[];
    temperature: number;
  }
  
  export const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
    [AI_MODELS.GPT_4_1_MINI]: {
      maxTokens: 32768,
      contextWindow: 1000000,
      pricing: { input: 3, output: 12 },
      features: ["chat", "coding", "instruction-following", "general-purpose"],
      temperature: 0.7,
    },
    [AI_MODELS.O3_MINI]: {
      maxTokens: 100000,
      contextWindow: 200000,
      pricing: { input: 1100, output: 4400 },
      features: ["reasoning", "math", "science", "complex-problems"],
      reasoningEffort: ["low", "medium", "high"],
      temperature: 0.7,
    },
    [AI_MODELS.O4_MINI]: {
      maxTokens: 100000,
      contextWindow: 200000,
      pricing: { input: 800, output: 3200 }, // Estimated - more cost effective than o3-mini
      features: ["reasoning", "math", "coding", "visual-tasks"],
      reasoningEffort: ["low", "medium", "high"],
      temperature: 0.7,
    },
  } as const;
  
  export const AI_CONFIG = {
    // Default models
    defaultModel: AI_MODELS.GPT_4_1_MINI,
    reasoningModel: AI_MODELS.O3_MINI,
  
    // Get model config
    getModelConfig: (model: AIModel): ModelConfig => {
      return MODEL_CONFIGS[model];
    },
  
    // Get best model for task type
    getModelForTask: (
      taskType: "chat" | "reasoning" | "coding" | "complex"
    ): AIModel => {
      switch (taskType) {
        case "reasoning":
        case "complex":
          return AI_MODELS.O3_MINI;
        case "chat":
        case "coding":
        default:
          return AI_MODELS.GPT_4_1_MINI;
      }
    },
  
    // System prompts
    systemPrompts: {
      default: `You are AGENT SMEET, an AI assistant for the Smeet platform. 
  Smeet is an AI-powered collaborative workspace that revolutionizes how remote teams work together.
  
  Be professional, concise, and helpful in your responses. When appropriate, use the available tools 
  to help users accomplish their tasks.`,
  
      kanban: `You are AGENT SMEET specialized in Kanban project management. 
  You can help users create, manage, and organize Kanban boards, lists, and cards.
  
  When a user asks to create a card, always gather essential information first: title, description, and which list to add it to.
  Be precise, professional, and focus on helping users manage their Kanban boards efficiently.`,
  
      reasoning: `You are AGENT SMEET with enhanced reasoning capabilities.
  Take your time to think through complex problems step by step.
  Show your reasoning process when solving difficult questions.
  Be thorough and precise in your analysis.`,
    } as Record<string, string>,
  } as const;
  
  export type AIConfig = typeof AI_CONFIG;
  