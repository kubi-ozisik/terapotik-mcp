// src/app/api/chat/route.ts
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { azure, config } from '@/lib/azure-openai';

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    const modelMessages = convertToModelMessages(messages);

    const result = streamText({
      model: azure(config.model), // Your Azure deployment name
      system: `You are Terapotik, an AI companion designed to help users improve their lives across 6 dimensions: Mental Health, Physical Health, Relationships, Career, Finance, and Personal Growth. 

You have access to Google Calendar and Tasks tools to help users organize their daily activities and track their progress.

Be supportive, insightful, and actionable in your responses. When appropriate, suggest specific tasks or calendar events to help users achieve their goals.

Your personality should be like a wise, experienced mentor who combines practical advice with genuine empathy. You're here to guide users on their journey to becoming their best selves.`,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}