
import dotenv from "dotenv";
import { validateConfigOrExit } from "./utils/config-validation";

// Load environment variables
dotenv.config();

// Validate configuration before starting the server
validateConfigOrExit();

import app from "./app";

// Set port
const PORT = process.env.PORT || 3200;
const VERSION = "v1";

// Print env variables for debugging (without sensitive data)
console.log("Environment variables:");
console.log(" - NODE_ENV:", process.env.NODE_ENV);
console.log(" - PORT:", PORT);
console.log(" - AUTH0_DOMAIN:", process.env.AUTH0_DOMAIN ? "set" : "not set");
console.log(
    " - AUTH0_AUDIENCE:",
    process.env.AUTH0_AUDIENCE ? "set" : "not set"
);
console.log(
    " - GOOGLE_CLIENT_ID:",
    process.env.GOOGLE_CLIENT_ID ? "set" : "not set"
);
console.log(
    " - GOOGLE_CLIENT_SECRET:",
    process.env.GOOGLE_CLIENT_SECRET ? "set" : "not set"
);

// Start server
const server = app.listen(PORT, () => {
    console.log(`\x1b[32m%s\x1b[0m`, `Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/${VERSION}/health`);
    console.log(`API available at: http://localhost:${PORT}/api`);
});

// Handle server errors
server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
        console.error(`\x1b[31m%s\x1b[0m`, `Error: Port ${PORT} is already in use`);
        console.log("Try running on a different port: PORT=3201 npm run dev");
    } else {
        console.error(`\x1b[31m%s\x1b[0m`, "Server error:", error);
    }
    process.exit(1);
});

// Handle shutdown gracefully
process.on("SIGINT", () => {
    console.log("\nGracefully shutting down...");
    server.close(() => {
        console.log("Server closed");
        process.exit(0);
    });
});

export default server;