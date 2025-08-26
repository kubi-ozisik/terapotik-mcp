
// Type definition for MCP tool handler
export type McpToolHandler = (params: any, context: any) => Promise<any>;

// Type definition for session auth getter
export type SessionAuthGetter = (sessionId: string) => any | undefined;

// Type definition for client getter
export type ClientGetter = (clientId: string) => any | undefined;