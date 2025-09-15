import {
    generateTitleFromUserMessage,
    saveChat,
    saveMessages,
  } from "@/features/chat/actions/chat-actions";
  import { ChatSDKError } from "@/features/chat/core/errors";
  import { auth } from "@/auth";
import { getCurrentUser } from "@/shared/helpers";
  
  export const maxDuration = 30;
  
  interface CreateChatRequest {
    message: {
      id: string;
      role: "user";
      content: string;
      parts: Array<{
        type: "text";
        text: string;
      }>;
      createdAt: string;
    };
    selectedVisibilityType?: "private" | "public";
  }
  
  export async function POST(request: Request) {
    try {
      const { message, selectedVisibilityType = "private" }: CreateChatRequest =
        await request.json();
  
      const user = await getCurrentUser();
      const session = await auth();
  
      if (!user || !session) {
        return new ChatSDKError("unauthorized:chat").toResponse();
      }
  
      // Generate title from user message
      const title = await generateTitleFromUserMessage({
        message: {
          ...message,
        },
      });
  
      // Create new chat
      const newChat = await saveChat({
        userId: user.id,
        title,
        visibility: selectedVisibilityType,
      });
  
      // Save the initial user message
      await saveMessages({
        messages: [
          {
            chatId: newChat.id,
            role: "user",
            parts: message.parts,
            attachments: [],
          },
        ],
      });
  
      // Return the chat ID for immediate navigation
      return new Response(
        JSON.stringify({
          chatId: newChat.id,
          title: newChat.title,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "x-chat-id": newChat.id,
          },
        }
      );
    } catch (error) {
      console.error("Failed to create chat:", error);
      return new ChatSDKError("bad_request:chat").toResponse();
    }
  }
  