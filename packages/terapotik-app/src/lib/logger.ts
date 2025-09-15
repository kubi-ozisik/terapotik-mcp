import pino from "pino";

// Create custom destination to avoid worker threads
const customDestination = {
  write: (msg: string) => {
    console.log(JSON.parse(msg));
  },
};

// Create base logger
const baseLogger = pino(
  {
    level: process.env.NODE_ENV === "development" ? "debug" : "info",
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  },
  customDestination
);

// Create logger with default configuration
export const logger = baseLogger.child({
  name: "app",
});
