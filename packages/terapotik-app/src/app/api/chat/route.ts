// src/app/api/chat/route.ts
import { streamText, convertToModelMessages, type UIMessage, createUIMessageStream, stepCountIs, smoothStream, JsonToSseTransformStream } from 'ai';
import { openai } from '@ai-sdk/openai';
import { azure, config } from '@/lib/azure-openai';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { PostRequestBody, postRequestBodySchema } from './schema';
import { ChatSDKError } from '@/features/chat/core/errors';
import { auth } from '@/auth';
import { entitlementsByUserType, UserType } from '@/features/chat/core/entitlements';
import { createStreamId, deleteChatById, generateTitleFromUserMessage, getChatById, getMessageCountByUserId, getMessagesByChatId, saveChat, saveMessages } from '@/features/chat/actions/chat-actions';
import { ChatMessage, VisibilityType } from '@/features/chat/core/types';
import { ChatModel } from '@/features/chat/core/models';
import { convertToUIMessages } from '@/features/chat/lib/chat-utils';
import { generateUUID } from '@/lib/utils';
import { myProvider } from '@/features/chat/lib/ai/providers';
import { getWeather } from '@/features/chat/tools/get-weather';
import { createDocument } from '@/features/chat/tools/create-document';
import { updateDocument } from '@/features/chat/tools/update-document';
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { requestSuggestions } from '@/features/chat/tools/request-suggestions';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const {
    id,
    message,
    selectedChatModel,
    selectedVisibilityType,
  }: {
    id: string;
    message: ChatMessage;
    selectedChatModel: ChatModel['id'];
    selectedVisibilityType: VisibilityType;
  } = requestBody;

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const userType: UserType = "regular";
  const messageCount = await getMessageCountByUserId({
    id: session.user.id,
    differenceInHours: 24,
  });

  if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
    return new ChatSDKError('rate_limit:chat').toResponse();
  }

  try {
    const chat = await getChatById({
      id,
    });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      const createdChat = await saveChat({
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
        module: "chat",
      })
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    // const { longitude, latitude, city, country } = geolocation(request);

    // const requestHints: RequestHints = {
    //   longitude,
    //   latitude,
    //   city,
    //   country,
    // };

    await saveMessages({
      messages: [
        {
          chatId: id,
          role: "user",
          attachments: [],
          parts: message.parts,
        }
      ]
    });
    const accessToken = (session as any).accessToken;
    const mcpClient = await createMCPClient({
      transport: {
        type: 'sse',
        url: 'http://localhost:3001/sse',
    
        // optional: configure HTTP headers, e.g. for authentication
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
    const tools = mcpClient.tools;

    const streamId = await createStreamId({ chatId: id });

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream}) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: "",
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          // experimental_activeTools: selectedChatModel === "chat-model-reasoning" 
          // ? []
          // : [
          //   'getWeather',
          //   'createDocument',
          //   'updateDocument',
          //   'requestSuggestions',
          // ],
          experimental_transform: smoothStream({chunking: "word"}),
          tools: {
            getWeather,
            createDocument: createDocument({session, dataStream, chatId: id}),
            updateDocument: updateDocument({session, dataStream, chatId: id}),
            requestSuggestions: requestSuggestions({
              session,
              dataStream
            }),
            ...tools
          },
          experimental_telemetry: {
            isEnabled: true,
            functionId: 'stream-text',
          }
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true
          })
        );
      },
      generateId: generateUUID,
      onFinish: async ({messages}) => {
        await saveMessages({
          messages: messages.map((message) => ({
            chatId: id,
            role: message.role,
            parts: message.parts,
            attachments: [],
          })),
        });
      },
      onError: () => {
        return 'an error occured during chat stream'
      }
    });

    const streamContext= getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
      );
    } else {
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (!chat || chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
