import {
    customProvider,
    extractReasoningMiddleware,
    wrapLanguageModel,
} from 'ai';
import { azure } from '@ai-sdk/azure';

export const myProvider = customProvider({
    languageModels: {
        'chat-model': azure('gpt-5'),
        'chat-model-reasoning': wrapLanguageModel({
            model: azure('gpt-5'),
            middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': azure('gpt-5'),
        'artifact-model': azure('gpt-5'),
    },
    imageModels: {
        'small-model': azure.imageModel('gpt-5'),
    },
});

// export const myProvider = customProvider({
//     languageModels: {
//       "chat-model": azure("gpt-4.1-mini"),
//       "chat-model-reasoning": wrapLanguageModel({
//         model: azure("gpt-4.1-mini"),
//         middleware: extractReasoningMiddleware({ tagName: "think" }),
//       }),
//       "title-model": azure("gpt-4.1-mini"),
//       "artifact-model": azure("gpt-4.1-mini"),
//     },
//     imageModels: {
//       "small-model": azure.image("grok-2-image"),
//     },
//   });