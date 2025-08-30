import { ChatDocument, ChatMessage as ChatMessageDB } from "@prisma/client";
import { ChatMessage, ChatTools, CustomUIDataTypes } from "../core/types";
import { ChatSDKError, ErrorCode } from "../core/errors";
import { UIMessagePart } from "ai";
import { formatISO } from "date-fns";


export function convertToUIMessages(messages: ChatMessageDB[]): ChatMessage[] {
    return messages.map((message) => ({
      id: message.id,
      role: message.role as 'user' | 'assistant' | 'system',
      parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
      metadata: {
        createdAt: formatISO(message.createdAt),
      },
    }));
  }

  export const fetcher = async (url: string) => {
    const response = await fetch(url);
  
    if (!response.ok) {
      const { code, cause } = await response.json();
      throw new ChatSDKError(code as ErrorCode, cause);
    }
  
    return response.json();
  };

  export function getDocumentTimestampByIndex(
    documents: Array<ChatDocument>,
    index: number,
  ) {
    if (!documents) return new Date();
    if (index > documents.length) return new Date();
  
    return documents[index].createdAt;
  }

  export function sanitizeText(text: string) {
    return text.replace('<has_function_call>', '');
  }

  export function getTextFromMessage(message: ChatMessage): string {
    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('');
  }
  
  export async function fetchWithErrorHandlers(
    input: RequestInfo | URL,
    init?: RequestInit,
  ) {
    try {
      const response = await fetch(input, init);
  
      if (!response.ok) {
        const { code, cause } = await response.json();
        throw new ChatSDKError(code as ErrorCode, cause);
      }
  
      return response;
    } catch (error: unknown) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new ChatSDKError('offline:chat');
      }
  
      throw error;
    }
  }