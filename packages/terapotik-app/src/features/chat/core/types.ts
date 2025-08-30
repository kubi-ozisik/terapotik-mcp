// src/modules/agent-smeet/core/types.ts

import { azure } from "@ai-sdk/azure";
import {
  customProvider,
  extractReasoningMiddleware,
  InferUITool,
  UIMessage,
  wrapLanguageModel,
} from "ai";
import { AIModel } from "./config";
import z from "zod";
export interface ChatConfig {
  model?: AIModel;
  plugin?: string;
  moduleContext?: Record<string, any>;
  initialMessages?: UIMessage[];
  maxMessages?: number;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
}
export interface Artifact {
  id: string;
  title: string;
  content: string;
  type: "document" | "code";
  createdAt: Date;
  updatedAt: Date;
}
export interface ChatContextValue {
  // Core chat state
  messages: UIMessage[];
  input: string;
  isLoading: boolean;
  error: Error | undefined;

  // Configuration
  currentModel: AIModel;
  config: ChatConfig;

  // Actions
  sendMessage: (content: string) => void;
  setInput: (value: string) => void;
  switchModel: (model: AIModel) => void;
  updateConfig: (updates: Partial<ChatConfig>) => void;

  // Form handlers
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;

  // Advanced actions
  append: (message: UIMessage) => void;
  reload: () => void;
  stop: () => void;

  artifacts: Artifact[];
  activeArtifact: string | null;
  setActiveArtifact: (id: string | null) => void;
}

export interface SuggestionCard {
  id: string;
  title: string;
  description: string;
  action: () => void;
  icon?: string;
  category: "explain" | "write" | "code" | "tools";
  model?: AIModel; // Which model to use for this suggestion
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
  reasoning?: string; // For reasoning models
  model: AIModel;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens?: number;
  };
}

export type ArtifactStatus = "streaming" | "idle";
export interface UIArtifact {
  chatId: string;
  toolResultId: string;
  documentId: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  isVisible: boolean;
  status: ArtifactStatus;
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}
export type DataStreamDelta = {
  type: "text-delta" | "title" | "id" | "kind" | "clear" | "finish";
  content: string;
};

export interface ArtifactDefinition {
  kind: ArtifactKind;
  description: string;
  content: React.ComponentType<{ content: string; status: ArtifactStatus }>;
  onStreamPart: (params: {
    streamPart: DataStreamDelta;
    setArtifact: (updater: (draft: UIArtifact) => UIArtifact) => void;
  }) => void;
}

export type VisibilityType = "private" | "public";

export interface DBMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  parts: any; // Message parts (text, tool calls, etc.)
  attachments: any; // File attachments, images, etc.
  createdAt: Date;
}
export type ArtifactKind = "text" | "code" | "sheet" | "image";
// export interface ArtifactKind {
//   kind: "text" | "code" | "image" | "sheet";
// }

export interface Suggestion {
  id: string;
  documentId: string;
  documentCreatedAt: Date;
  originalText: string;
  suggestedText: string;
  description?: string;
  isResolved: boolean;
  userId: string;
}






//////////////
export type ChatTools = {
  // getWeather: weatherTool;
  // createDocument: createDocumentTool;
  // updateDocument: updateDocumentTool;
  // requestSuggestions: requestSuggestionsTool;
};
export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
};

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});
export type MessageMetadata = z.infer<typeof messageMetadataSchema>;
export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}
