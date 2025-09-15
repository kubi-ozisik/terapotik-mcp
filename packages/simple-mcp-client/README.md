1. Client: EventSource connection to /sse with Bearer token
2. Server: Authenticates token, creates session ID (68144293-5b5d...)  
3. Server: Stores session auth info in memory
4. Client: Sends JSON-RPC message to /messages endpoint
5. Server: Uses stored session to handle the message
6. Server: Sends response back via the SSE stream