import { prisma } from "@terapotik/shared";
import express, { Request, Response, Router } from "express";
import { GoogleCalendarService } from "../services/google-calendar-service";
import { CalendarEvent, CalendarEventsRequest, GoogleAuthToken } from "@terapotik/shared/types";
import { createAuthenticatedClient } from "../utils/google-auth";
// import { createAuthenticatedClient } from "@terapotik/shared/utils";

const router = express.Router() as Router;

// Apply JWT authentication middleware to all routes
// Note: JWT check is already applied in app.ts, so this is redundant
// router.use(checkJwt);

/**
 * Helper function to get Google tokens for a user from the ServiceToken collection
 */
async function getGoogleTokenForUser(req: Request): Promise<GoogleAuthToken> {
  // Get the Auth0 user ID from the JWT token
  const auth = (req as any).auth;

  if (!auth || !auth.sub) {
    throw new Error("No authenticated user found in request");
  }

  console.log("Looking for user with Auth0 ID:", auth.sub);

  // Try to find the user by Auth0 ID
  let user = await prisma.user.findFirst({
    where: { authId: auth.sub },
  });

  // If not found, try to find via Account.providerAccountId
  if (!user) {
    console.log("User not found by authId, trying to find via Account...");

    const account = await prisma.account.findFirst({
      where: {
        providerAccountId: auth.sub,
      },
      include: {
        user: true,
      },
    });

    if (account?.user) {
      user = account.user;
      console.log("Found user via Account:", user.id);

      // Update the user's authId for future lookups
      await prisma.user.update({
        where: { id: user.id },
        data: { authId: auth.sub },
      });
      console.log("Updated user authId to:", auth.sub);
    }
  }

  if (!user) {
    throw new Error(`User not found with Auth0 ID: ${auth.sub}`);
  }

  console.log("Found user:", user.id);

  // Find the user's Google service token
  const serviceToken = await prisma.serviceToken.findFirst({
    where: {
      userId: user.id,
      service: "google",
    },
  });

  if (!serviceToken || !serviceToken.accessToken) {
    throw new Error("No Google service token found for this user");
  }

  return {
    access_token: serviceToken.accessToken,
    refresh_token: serviceToken.refreshToken || undefined,
    scope: serviceToken.scope || "",
    token_type: "Bearer",
    expiry_date: serviceToken.expiresAt ? serviceToken.expiresAt.getTime() : 0,
  };
}

/**
 * GET /api/calendar/events
 * Fetch calendar events for a date range
 */
router.get("/events", async (req: Request, res: Response) => {
  try {
    // Get the user's Google tokens from ServiceToken collection
    const tokens = await getGoogleTokenForUser(req);

    // Create authenticated client
    const authClient = createAuthenticatedClient(tokens);
    const calendarService = new GoogleCalendarService(authClient);

    // Parse query parameters
    const calendarEventsRequest: CalendarEventsRequest = {
      calendarId: (req.query.calendarId as string) || "primary",
      timeMin: (req.query.timeMin as string) || new Date().toISOString(),
      timeMax: req.query.timeMax as string,
      maxResults: req.query.maxResults
        ? parseInt(req.query.maxResults as string)
        : 10,
      singleEvents: req.query.singleEvents === "true",
      orderBy: (req.query.orderBy as string) || "startTime",
    };

    // Get calendar events
    const events = await calendarService.getEvents(calendarEventsRequest);
    res.json({
      status: "success",
      data: events,
    });
  } catch (error) {
    console.error("Error in calendar events route:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch calendar events",
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/calendar/events
 * Create a new calendar event
 */
router.post("/events", async (req: Request, res: Response) => {
  try {
    // Get the user's Google tokens from ServiceToken collection
    const tokens = await getGoogleTokenForUser(req);

    // Create authenticated client
    const authClient = createAuthenticatedClient(tokens);
    const calendarService = new GoogleCalendarService(authClient);

    // Get calendarId and event from request body
    const { calendarId = "primary", event } = req.body;

    // Create event
    const createdEvent = await calendarService.createEvent(calendarId, event);
    res.status(201).json({
      status: "success",
      data: createdEvent,
    });
  } catch (error) {
    console.error("Error creating calendar event:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create calendar event",
      error: (error as Error).message,
    });
  }
});

/**
 * PUT /api/calendar/events/:eventId
 * Update an existing calendar event
 */
router.put("/events/:eventId", async (req: Request, res: Response) => {
  try {
    // Get the user's Google tokens from ServiceToken collection
    const tokens = await getGoogleTokenForUser(req);

    // Create authenticated client
    const authClient = createAuthenticatedClient(tokens);
    const calendarService = new GoogleCalendarService(authClient);

    // Get calendarId, eventId and event data from request
    const { calendarId = "primary" } = req.body;
    const eventId = req.params.eventId;
    const event: CalendarEvent = req.body.event;

    // Ensure event ID is included in the update request
    if (event && !event.id) {
      event.id = eventId;
    }

    // Update event
    const updatedEvent = await calendarService.updateEvent(
      calendarId,
      eventId,
      event
    );
    res.json({
      status: "success",
      data: updatedEvent,
    });
  } catch (error) {
    console.error("Error updating calendar event:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update calendar event",
      error: (error as Error).message,
    });
  }
});

/**
 * DELETE /api/calendar/events/:eventId
 * Delete a calendar event
 */
router.delete("/events/:eventId", async (req: Request, res: Response) => {
  try {
    // Get the user's Google tokens from ServiceToken collection
    const tokens = await getGoogleTokenForUser(req);

    // Create authenticated client
    const authClient = createAuthenticatedClient(tokens);
    const calendarService = new GoogleCalendarService(authClient);

    // Get calendarId and eventId from request
    const calendarId = (req.query.calendarId as string) || "primary";
    const eventId = req.params.eventId;

    // Delete event - URL encoding is handled in the service
    await calendarService.deleteEvent(calendarId, eventId);
    res.status(200).json({
      status: "success",
      message: "Calendar event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete calendar event",
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/calendar/list
 * Fetch user's calendar list
 */
router.get("/list", async (req: Request, res: Response) => {
  try {
    // Get the user's Google tokens from ServiceToken collection
    const tokens = await getGoogleTokenForUser(req);

    // Create authenticated client
    const authClient = createAuthenticatedClient(tokens);
    const calendarService = new GoogleCalendarService(authClient);

    // Get calendar list
    const calendarList = await calendarService.getCalendarList();
    res.json({
      status: "success",
      data: calendarList,
    });
  } catch (error) {
    console.error("Error fetching calendar list:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch calendar list",
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/calendar/events/date/:date
 * Fetch calendar events for a specific date (YYYY-MM-DD)
 */
router.get("/events/date/:date", async (req: Request, res: Response) => {
  try {
    // Get the user's Google tokens from ServiceToken collection
    const tokens = await getGoogleTokenForUser(req);

    // Create authenticated client
    const authClient = createAuthenticatedClient(tokens);
    const calendarService = new GoogleCalendarService(authClient);

    // Parse date parameter (expected format: YYYY-MM-DD)
    const dateStr = req.params.date;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid date format. Please use YYYY-MM-DD format.",
      });
    }

    // Create start and end of the day in ISO format
    const startDate = new Date(`${dateStr}T00:00:00`);
    const endDate = new Date(`${dateStr}T23:59:59`);

    // Parse query parameters
    const calendarEventsRequest: CalendarEventsRequest = {
      calendarId: (req.query.calendarId as string) || "primary",
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      maxResults: req.query.maxResults
        ? parseInt(req.query.maxResults as string)
        : 100,
      singleEvents: true, // Always expand recurring events
      orderBy: "startTime",
    };

    // Get calendar events
    const events = await calendarService.getEvents(calendarEventsRequest);
    return res.json({
      status: "success",
      data: events,
      date: dateStr,
    });
  } catch (error) {
    console.error("Error fetching calendar events for date:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch calendar events for date",
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/calendar/events/range
 * Fetch calendar events for a date range (start and end dates)
 */
router.get("/events/range", async (req: Request, res: Response) => {
  try {
    // Get the user's Google tokens from ServiceToken collection
    const tokens = await getGoogleTokenForUser(req);

    // Create authenticated client
    const authClient = createAuthenticatedClient(tokens);
    const calendarService = new GoogleCalendarService(authClient);

    // Parse date range parameters (expected format: YYYY-MM-DD)
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;

    // Validate date parameters
    if (!startDateStr || !endDateStr) {
      return res.status(400).json({
        status: "error",
        message: "Both startDate and endDate parameters are required.",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDateStr) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Invalid date format. Please use YYYY-MM-DD format for both dates.",
      });
    }

    // Create start of first day and end of last day in ISO format
    const startDate = new Date(`${startDateStr}T00:00:00`);
    const endDate = new Date(`${endDateStr}T23:59:59`);

    // Parse query parameters
    const calendarEventsRequest: CalendarEventsRequest = {
      calendarId: (req.query.calendarId as string) || "primary",
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      maxResults: req.query.maxResults
        ? parseInt(req.query.maxResults as string)
        : 500,
      singleEvents: true, // Always expand recurring events
      orderBy: "startTime",
    };

    // Get calendar events
    const events = await calendarService.getEvents(calendarEventsRequest);
    return res.json({
      status: "success",
      data: events,
      dateRange: {
        startDate: startDateStr,
        endDate: endDateStr,
      },
    });
  } catch (error) {
    console.error("Error fetching calendar events for date range:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch calendar events for date range",
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/calendar/events/recurring
 * Create a recurring calendar event
 */
router.post("/events/recurring", async (req: Request, res: Response) => {
  try {
    // Get the user's Google tokens from ServiceToken collection
    const tokens = await getGoogleTokenForUser(req);

    // Create authenticated client
    const authClient = createAuthenticatedClient(tokens);
    const calendarService = new GoogleCalendarService(authClient);

    // Get calendarId, event, and recurrence data from request body
    const { calendarId = "primary", event, recurrence } = req.body;

    if (!event || !recurrence) {
      return res.status(400).json({
        status: "error",
        message: "Event and recurrence details are required",
      });
    }

    // Create recurring event
    const createdEvent = await calendarService.createRecurringEvent(
      calendarId,
      event,
      recurrence
    );

    return res.status(201).json({
      status: "success",
      data: createdEvent,
    });
  } catch (error) {
    console.error("Error creating recurring calendar event:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to create recurring calendar event",
      error: (error as Error).message,
    });
  }
});

export default router;
