export const config = {
    api: {
        baseUrl: process.env.API_BASE_URL || "http://localhost:3200",
        timeout: parseInt(process.env.API_TIMEOUT || "5000"),
        retries: parseInt(process.env.API_RETRIES || "3"),
        authToken: process.env.API_AUTH_TOKEN,
    },
    server: {
        port: parseInt(process.env.SERVER_PORT || "3001"),
        name: process.env.SERVER_NAME || "terapotik-mcp-server",
        version: process.env.SERVER_VERSION || "1.0.0",
    }
};