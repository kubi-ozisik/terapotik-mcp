"use client";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Chat } from "@/features/chat/components/chat";
import { DataStreamHandler } from "@/features/chat/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/features/chat/core/models";
import { generateUUID } from "@/lib/utils";
import { motion } from "framer-motion";
import { Bot, Cloud, Code, FileText, Lightbulb } from "lucide-react";
import { useRouter } from "next/navigation";
import { redirect } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";


export default function AgentChatPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  //   // const [isInfrastructureHealthy, setIsInfrastructureHealthy] = useState(true);
  const handleSuggestionClick = async (action: string) => {
    await startNewChat(action);
  };
  const startNewChat = async (messageContent: string) => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      // Generate message ID
      const messageId = generateUUID();

      // Create the message object
      const message = {
        id: messageId,
        role: "user" as const,
        content: messageContent,
        parts: [
          {
            type: "text" as const,
            text: messageContent,
          },
        ],
        createdAt: new Date().toISOString(),
      };

      // Create chat session with only first message and title (no AI response)
      const response = await fetch("/api/chat/create-new-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          selectedVisibilityType: "private",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create chat");
      }

      const { chatId } = await response.json();

      // Navigate immediately to chat page with real database ID
      router.push(`/chat/${chatId}`);
    } catch (error) {
      console.error("Failed to start chat:", error);
      toast.error("Failed to start chat. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };


  const suggestionCards = [
    {
      id: "essay",
      title: "Write an essay",
      description: "Help me write an essay about artificial intelligence",
      icon: <FileText className="h-6 w-6" />,
      action:
        "Help me write an essay about artificial intelligence and its impact on society",
      category: "write",
    },
    {
      id: "code",
      title: "Write code",
      description: "Create a React component with TypeScript",
      icon: <Code className="h-6 w-6" />,
      action: "Write code to demonstrate a React component with TypeScript",
      category: "code",
    },
    {
      id: "explain",
      title: "Explain concept",
      description: "What are the advantages of using Next.js?",
      icon: <Lightbulb className="h-6 w-6" />,
      action: "What are the advantages of using Next.js for web development?",
      category: "explain",
    },
    {
      id: "weather",
      title: "Get weather",
      description: "What is the weather like today?",
      icon: <Cloud className="h-6 w-6" />,
      action: "What is the weather like in San Francisco today?",
      category: "tools",
    },
  ];
  return (
    <div className="flex h-full bg-background">
      <div className="flex-1 flex flex-col">
        {/* Welcome Page with Suggestions */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full">
            <div className="mx-auto max-w-3xl px-4 py-6">
              <motion.div
                className="flex flex-col items-center justify-center min-h-[60vh] space-y-8"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight">
                    How can I help you today?
                  </h2>
                </div>

                {/* Suggestion Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {suggestionCards.map((card, index) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.1 + index * 0.05,
                        duration: 0.3,
                      }}
                    >
                      <Card
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleSuggestionClick(card.action)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
                            {card.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-sm mb-1">
                              {card.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {card.description}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Message Input - Main page */}
                <div className="w-full max-w-2xl mt-8">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const message = formData.get("message") as string;
                      if (message.trim()) {
                        startNewChat(message.trim());
                      }
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      name="message"
                      placeholder="Message Agent Smeet..."
                      className="flex-1"
                      autoFocus
                      disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Starting..." : "Send"}
                    </Button>
                  </form>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}
