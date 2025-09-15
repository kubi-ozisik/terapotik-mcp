import { z } from 'zod';
import type { Session } from 'next-auth';
import { streamObject, tool, type UIMessageStreamWriter } from 'ai';
import { getDocumentById, getDocumentByToolIdOrDocumentId, saveSuggestions } from '../actions/chat-actions';
import type { ChatSuggestion } from '@prisma/client';
import { generateUUID } from '@/lib/utils';
import { myProvider } from '../lib/ai/providers';
import type { ChatMessage } from '../core/types';

interface RequestSuggestionsProps {
  session: Session;
  dataStream: UIMessageStreamWriter;
}

export const requestSuggestions = ({
  session,
  dataStream,
}: RequestSuggestionsProps) =>
  tool({
    description: 'Request suggestions for a document',
    inputSchema: z.object({
      documentId: z
        .string()
        .describe('The ID of the document to request edits'),
    }),
    execute: async ({ documentId }) => {
      const document = await getDocumentByToolIdOrDocumentId({ id: documentId });

      if (!document || !document.content) {
        return {
          error: 'Document not found',
        };
      }

      const suggestions: Array<
        Omit<ChatSuggestion, 'userId' | 'createdAt' | 'documentCreatedAt' | 'id'>
      > = [];

      const { elementStream } = streamObject({
        model: myProvider.languageModel('artifact-model'),
        system:
          'You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.',
        prompt: document.content,
        output: 'array',
        schema: z.object({
          originalSentence: z.string().describe('The original sentence'),
          suggestedSentence: z.string().describe('The suggested sentence'),
          description: z.string().describe('The description of the suggestion'),
        }),
      });

 

      for await (const element of elementStream) {
        const suggestion = {
          originalText: element.originalSentence,
          suggestedText: element.suggestedSentence,
          description: element.description ?? '',
          documentId: document.id,
          isResolved: false,
          userId: session.user.id,
          createdAt: new Date(),
          documentCreatedAt: document.createdAt,
        };

        dataStream.write({
          type: 'data-suggestion',
          data: suggestion,
          transient: true,
        });

        suggestions.push(suggestion);
      }

      if (session.user?.id) {
        const userId = session.user.id;

        await saveSuggestions({
          suggestions: suggestions.map((suggestion) => ({
            ...suggestion,
            userId,
            createdAt: new Date(),
            documentCreatedAt: document.createdAt,
          })),
        });
      }

      return {
        id: documentId,
        title: document.title,
        kind: document.kind,
        message: 'Suggestions have been added to the document',
      };
    },
  });
