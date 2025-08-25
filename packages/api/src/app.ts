
import express from "express";

import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import { 
    APP_NAME, 
    API_VERSION, 
    API_BASE_URL, 
    MCP_VERSION, 
    connectDatabase,
    prisma,
    createSuccessResponse,
    createErrorResponse 
} from "@terapotik/shared";

// Load environment variables
dotenv.config();

// Connect to database
connectDatabase();

// Initialize express app
const app: express.Express = express();

// Middleware, temporary
app.use(
    cors({
        origin: process.env.NODE_ENV !== "production" ? "*" : process.env.ALLOWED_ORIGINS?.split(","), // Allow all origins
        credentials: true,
    })
);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const VERSION = "v1";

// Health check endpoint
app.get(`/api/${VERSION}/health`, (req, res) => {
    res.json({
        status: "success",
        data: {
            status: "ok",
            timestamp: new Date().toISOString(),
            app: APP_NAME,
            version: API_VERSION,
            mcp: MCP_VERSION,
        },
    });
});

// User profile endpoint
app.get(`/api/${VERSION}/me`, async (req, res) => {
    // const auth = (req as any).auth;
    // res.json({
    //   status: "success",
    //   data: {
    //     ...auth,
    //   },
    // });
    const userData = {
        name: "John Doe",
        email: "john.doe@example.com",
        role: "admin",
    };
    res.json(createSuccessResponse(userData));
});

// Global error handler
app.use(
    (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        console.error(err);
        res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? err.message : undefined,
        });
    }
);

export default app;