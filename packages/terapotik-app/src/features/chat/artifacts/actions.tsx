'use server';

import { getSuggestionsByDocumentId } from "../actions/chat-actions";


export async function getSuggestions({ documentId }: { documentId: string }) {
  const suggestions = await getSuggestionsByDocumentId({ documentId });
  return suggestions ?? [];
}
