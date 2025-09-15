

# Authorization Flow of Web App and MCP

## Option 1 - Direct OAuth Flow

1. User visits the web app
2. Web app redirects user to the MCP server's /authorize endpoint
3. User consents and gets redirected back with auth code
4. Web app exchanges code for access token
5. Web app uses token to call MCP tools via HTTP

## Option 2 - Token Delegation Pattern

Validating the Auth0 token which will be passed from the web app (next-auth) server-side and issue our own MCP-specific tokens. These tokens will be used for MCP tool access.

