"use server";
import { db as prisma } from "@/shared/data/db";

import { generateText, UIMessage } from "ai";
import { ChatSDKError } from "@/features/chat/core/errors";
import {
  DBMessage,
  Suggestion,
  VisibilityType,
} from "@/features/chat/core/types";
import { ChatSuggestion } from "@prisma/client";
import { cookies } from "next/headers";
import { myProvider } from "../lib/ai/providers";

// Chat Operations
export async function saveChat({
  userId,
  title,
  visibility,
  module = "test-chat",
}: {
  userId: string;
  title: string;
  visibility: VisibilityType;
  module?: string;
}) {
  try {
    return await prisma.chat.create({
      data: {
        userId,
        title,
        visibility,
        module,
      },
    });
  } catch (error) {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    // Delete related records first due to MongoDB constraints
    await prisma.chatVote.deleteMany({
      where: { chatId: id },
    });

    await prisma.chatMessage.deleteMany({
      where: { chatId: id },
    });

    await prisma.chatStream.deleteMany({
      where: { chatId: id },
    });

    const deletedChat = await prisma.chat.delete({
      where: { id },
    });

    return deletedChat;
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;
    const whereCondition: any = { userId: id };

    if (startingAfter) {
      const selectedChat = await prisma.chat.findUnique({
        where: { id: startingAfter },
      });

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      whereCondition.createdAt = { gt: selectedChat.createdAt };
    } else if (endingBefore) {
      const selectedChat = await prisma.chat.findUnique({
        where: { id: endingBefore },
      });

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      whereCondition.createdAt = { lt: selectedChat.createdAt };
    }

    const filteredChats = await prisma.chat.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      take: extendedLimit,
    });

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const selectedChat = await prisma.chat.findUnique({
      where: { id },
    });
    return selectedChat;
  } catch (error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

// Message Operations
export async function saveMessages({
  messages,
}: {
  messages: Array<Omit<DBMessage, "createdAt" | "id">>;
}) {
  try {
    return await prisma.chatMessage.createMany({
      data: messages.map((msg) => ({
        chatId: msg.chatId,
        role: msg.role,
        parts: msg.parts,
        attachments: msg.attachments,
      })),
    });
  } catch (error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await prisma.chatMessage.findMany({
      where: { chatId: id },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await prisma.chatMessage.findMany({
      where: { id },
    });
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await prisma.chatMessage.findMany({
      where: {
        chatId,
        createdAt: { gte: timestamp },
      },
      select: { id: true },
    });

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await prisma.chatVote.deleteMany({
        where: {
          chatId,
          messageId: { in: messageIds },
        },
      });

      return await prisma.chatMessage.deleteMany({
        where: {
          chatId,
          id: { in: messageIds },
        },
      });
    }
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

// Vote Operations
export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const existingVote = await prisma.chatVote.findUnique({
      where: { messageId },
    });

    if (existingVote) {
      return await prisma.chatVote.update({
        where: { messageId },
        data: { isUpvoted: type === "up" },
      });
    }

    return await prisma.chatVote.create({
      data: {
        chatId,
        messageId,
        isUpvoted: type === "up",
      },
    });
  } catch (error) {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await prisma.chatVote.findMany({
      where: { chatId: id },
    });
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

// Document Operations
export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
  chatId,
}: {
  id: string;
  title: string;
  kind: string;
  content?: string;
  userId: string;
  chatId: string;
}) {
  try {
    return await prisma.chatDocument.create({
      data: {
        toolResultId: id,
        title,
        kind,
        content,
        userId,
        chatId,
      },
    });
  } catch (error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    console.log("🔥 GET DOCUMENTS BY ID CALLED:", id);

    const documents = await prisma.chatDocument.findMany({
      where: { toolResultId: id }, // Query by tool result ID for all versions
      orderBy: { createdAt: "desc" }, // Latest versions first
    });

    console.log("🔥 GET DOCUMENTS BY ID RESULT:", {
      count: documents.length,
      versions: documents.map((d) => ({
        id: d.id,
        createdAt: d.createdAt,
        contentLength: d.content?.length || 0,
      })),
    });

    return documents;
  } catch (error) {
    console.error("🔥 GET DOCUMENTS BY ID ERROR:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentByToolIdOrDocumentId({ id }: { id: string }) {
  try {
    console.log("🔥 GET DOCUMENT BY TOOL ID OR DOCUMENT ID CALLED:", id);

    // First try by toolResultId (most common case)
    let document = await prisma.chatDocument.findFirst({
      where: { toolResultId: id },
      orderBy: { createdAt: "desc" },
    });

    // If not found, try by MongoDB _id
    if (!document) {
      document = await prisma.chatDocument.findUnique({
        where: { id: id },
      });
    }

    console.log("🔥 DOCUMENT FOUND:", document ? "YES" : "NO");
    return document;
  } catch (error) {
    console.error("🔥 GET DOCUMENT ERROR:", error);
    throw error;
  }
}

export async function getDocumentByToolResultId({ id }: { id: string }) {
  try {
    const selectedDocument = await prisma.chatDocument.findFirst({
      where: { toolResultId: id },
      orderBy: { createdAt: "desc" },
    });

    return selectedDocument;
  } catch (error) {
    console.error("🔥 GET DOCUMENT BY ID ERROR:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const selectedDocument = await prisma.chatDocument.findFirst({
      where: { id },
      orderBy: { createdAt: "desc" },
    });

    console.log(
      "🔥 GET DOCUMENT BY ID RESULT:",
      selectedDocument
        ? {
            id: selectedDocument.id,
            toolResultId: selectedDocument.toolResultId,
            title: selectedDocument.title,
            createdAt: selectedDocument.createdAt,
            contentLength: selectedDocument.content?.length || 0,
          }
        : "NULL"
    );

    return selectedDocument;
  } catch (error) {
    console.error("🔥 GET DOCUMENT BY ID ERROR:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await prisma.chatSuggestion.deleteMany({
      where: {
        documentId: id,
        documentCreatedAt: { gt: timestamp },
      },
    });

    return await prisma.chatDocument.deleteMany({
      where: {
        id,
        createdAt: { gt: timestamp },
      },
    });
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function updateDocument({
  id,
  content,
}: {
  id: string;
  content: string;
}) {
  try {
    console.log("🔥 UPDATE DOCUMENT CALLED:", id);

    // First try to find by toolResultId
    let document = await prisma.chatDocument.findFirst({
      where: { toolResultId: id },
      orderBy: { createdAt: "desc" },
    });

    // If not found, try by MongoDB _id
    if (!document) {
      document = await prisma.chatDocument.findUnique({
        where: { id: id },
      });
    }

    if (!document) {
      console.log("🔥 DOCUMENT NOT FOUND FOR UPDATE:", id);
      return null;
    }

    const updatedDocument = await prisma.chatDocument.update({
      where: { id: document.id },
      data: { content },
    });

    console.log("🔥 DOCUMENT UPDATED:", updatedDocument.id);
    return updatedDocument;
  } catch (error) {
    console.error("🔥 UPDATE DOCUMENT ERROR:", error);
    throw new ChatSDKError("bad_request:database", "Failed to update document");
  }
}

// Suggestion Operations
export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Omit<ChatSuggestion, "createdAt" | "id">>;
}) {
  try {
    return await prisma.chatSuggestion.createMany({
      data: suggestions,
    });
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  return await getSuggestionsByDocumentIdOrToolCallId({ documentId });
}

export async function getSuggestionsByDocumentIdOrToolCallId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    console.log("🔥 GET SUGGESTIONS CALLED WITH:", documentId);

    // Find ALL documents with this toolResultId (there might be multiple versions)
    const documents = await prisma.chatDocument.findMany({
      where: {
        toolResultId: documentId,
      },
      orderBy: { createdAt: "desc" },
    });

    console.log("🔥 DOCUMENTS FOUND:", documents.length);

    if (documents.length === 0) {
      console.log("🔥 NO DOCUMENTS FOUND, TRYING DIRECT SEARCH");
      const suggestions = await prisma.chatSuggestion.findMany({
        where: {
          documentId: documentId,
        },
      });
      console.log("🔥 SUGGESTIONS FOUND (direct search):", suggestions.length);
      return suggestions;
    }

    // Search for suggestions across ALL document versions
    const allSuggestions = [];
    for (const document of documents) {
      console.log("🔥 SEARCHING SUGGESTIONS FOR DOCUMENT ID:", document.id);
      const suggestions = await prisma.chatSuggestion.findMany({
        where: {
          documentId: document.id,
        },
      });
      console.log(
        "🔥 SUGGESTIONS FOUND FOR",
        document.id,
        ":",
        suggestions.length
      );
      allSuggestions.push(...suggestions);
    }

    console.log("🔥 TOTAL SUGGESTIONS FOUND:", allSuggestions.length);
    return allSuggestions;
  } catch (error) {
    console.error("🔥 GET SUGGESTIONS ERROR:", error);
    // throw new ChatSDKError(
    //   "bad_request:database",
    //   "Failed to get suggestions by document id"
    // );
    return [];
  }
}

// Chat Visibility
export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await prisma.chat.update({
      where: { id: chatId },
      data: { visibility },
    });
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

// User Message Count
export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const messageCount = await prisma.chatMessage.count({
      where: {
        chat: { userId: id },
        createdAt: { gte: twentyFourHoursAgo },
        role: "user",
      },
    });

    return messageCount;
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

// Stream Operations
export async function createStreamId({ chatId }: { chatId: string }) {
  try {
    const stream = await prisma.chatStream.create({
      data: {
        chatId,
      },
    });

    return stream.id;
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await prisma.chatStream.findMany({
      where: { chatId },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    return streamIds.map(({ id }) => id);
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const { text: title } = await generateText({
    model: myProvider.languageModel("title-model"),
    system: `\n
          - you will generate a short title based on the first message a user begins a conversation with
          - ensure it is not more than 80 characters long
          - the title should be a summary of the user's message
          - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}