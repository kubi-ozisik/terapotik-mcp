// src/shared/server/mail/mailService.tsx

"use server";

import { generateVerificationToken } from "@/features/auth/actions/auth-actions";
import { env } from "@/shared/env.mjs";
import { logger } from "@/shared/lib/logger";
import { db } from "@/shared/server/data/db";

const log = logger.child({
  module: "mail-service",
});

export async function sendVerificationEmail(name: string, email: string) {
  const verificationToken = (await generateVerificationToken(email)) ?? "Token";
  const response = await fetch(`${env.AI_API_URL}/api/email/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: email,
      subject: "Activate Your Account",
      template_id: "welcome-email",
      template_data: {
        name: name,
        activationUrl: `${process.env.NEXTAUTH_URL}/auth/activate?code=${verificationToken.token}`,
      },
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to send verification email");
  }
  return await response.json();
}

export const sendTwoFactorTokenEmail = async (email: string, token: string) => {
  const response = await fetch(`${env.AI_API_URL}/api/email/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: email,
      subject: "Your Two-Factor Authentication Code",
      template_id: "two-factor-auth",
      template_data: {
        token: token,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to send 2FA email");
  }

  return await response.json();
};

/**
 *
 * @param email email to send the email to
 * @param senderName name of the sender
 * @param ownerName name of the owner
 * @param requesterName name of the requester
 * @param eventType title of the event
 * @param dateAsString date of the event
 * @param timeAsString time of the event
 * @param durationInString
 * @param meetingLink
 * @param notes
 * @param approvalLink
 * @param addToCalendarLink
 * @param rescheduleLink
 * @param cancelLink
 * Test Data
 * "senderName": "John Doe",
 * "ownerName": "John Doe",
 * "requesterName": "Jane Smith",
 * "eventTypeName": "Meeting",
 * "date": "2024-01-01",
 * "time": "10:00 AM",
 * "duration": "1 hour",
 * "notes": "This is a test note",
 * "meetingLink": "https://smeet.app/meeting/abc123",
 * "addToCalendarLink": "https://smeet.app/calendar/add/abc123",
 * "approvalLink": "https://smeet.app/approve/abc123",
 * "currentYear": "2025",
 * @returns
 */
export const sendMeetingRequestEmail = async ({
  email,
  ownerName,
  requesterName,
  eventType,
  dateAsString,
  timeAsString,
  durationInString,
  meetingLink,
  notes,
  approvalLink,
}: {
  email: string;
  ownerName: string;
  requesterName: string;
  eventType: string;
  dateAsString: string;
  timeAsString: string;
  durationInString: string;
  meetingLink: string;
  notes: string;
  approvalLink: string;
}) => {
  const response = await fetch(`${env.AI_API_URL}/api/email/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: email,
      subject: "Meeting Request",
      template_id: "meeting-request",
      template_data: {
        ownerName: ownerName,
        requesterName: requesterName,
        eventTypeName: eventType,
        date: dateAsString,
        time: timeAsString,
        duration: durationInString,
        notes: notes,
        meetingLink: meetingLink,
        approvalLink: approvalLink,
        currentYear: new Date().getFullYear(),
      },
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to send meeting request email");
  }

  return await response.json();
};

/**
 *
 * @param param0
 *
 * SAMPLE DATA
 * "ownerName": "John Doe",
 * "requesterName": "Jane Smith",
 * "eventTypeName": "Meeting",
 * "date": "2024-01-01",
 * "time": "10:00 AM",
 * "duration": "1 hour",
 * "notes": "This is a test note",
 * "meetingLink": "https://smeet.app/meeting/abc123",
 * "approvalLink": "https://smeet.app/approve/abc123",
 * "currentYear": "2025",
 * @returns
 */
export const sendBookingConfirmationEmail = async ({
  email,
  ownerName,
  requesterName,
  eventType,
  dateAsString,
  timeAsString,
  durationInString,
  meetingLink,
  notes,
  approvalLink,
}: {
  email: string;
  ownerName: string;
  requesterName: string;
  eventType: string;
  dateAsString: string;
  timeAsString: string;
  durationInString: string;
  meetingLink: string;
  notes: string;
  approvalLink: string;
}) => {
  log.info("Sending booking confirmation email", env.AI_API_URL);
  const response = await fetch(`${env.AI_API_URL}/api/email/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: email,
      subject: "Meeting Request",
      template_id: "meeting-request",
      template_data: {
        ownerName: ownerName,
        requesterName: requesterName,
        eventTypeName: eventType,
        date: dateAsString,
        time: timeAsString,
        duration: durationInString,
        notes: notes,
        meetingLink: meetingLink,
        approvalLink: approvalLink,
        currentYear: new Date().getFullYear(),
      },
    }),
  });
  if (!response.ok) {
    log.error("Failed to send meeting request email", {
      response,
    });
    throw new Error(
      `Failed to send meeting request email  ${response.statusText}`
    );
  }
  log.info("Meeting request email sent", {
    response,
    aiApiUrl: env.AI_API_URL,
  });
  return await response.json();
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${env.NEXT_PUBLIC_APP_URL}/auth/new-password?token=${token}`;

  const response = await fetch(`${env.AI_API_URL}/api/email/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: email,
      subject: "Reset Your Password",
      template_id: "password-reset",
      template_data: {
        resetLink: resetLink,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to send password reset email");
  }

  return await response.json();
};

export const sendWelcomeEmail = async (
  userId: string,
  invitationType: "WORKSPACE" | "PLATFORM" = "PLATFORM",
  workspaceName?: string
) => {
  try {
    // Get user details
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        // membership: {
        //   include: {
        //     membershipType: true,
        //   },
        // },
      },
    });

    if (!user || !user.email) {
      throw new Error("User not found or email missing");
    }

    // // Determine membership type
    // const membershipType =
    //   user.membership?.membershipType?.displayName || "Trial";

    // Send the welcome email
    const response = await fetch(`${env.AI_API_URL}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: user.email,
        subject: "Welcome to Smeet! Your Account is Ready",
        template_id: "welcome-email-2",
        template_data: {
          name: user.name || user.email.split("@")[0],
        //   membershipType: membershipType,
          invitationType: invitationType,
          workspaceName: workspaceName,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send welcome email: ${await response.text()}`);
    }

    console.log(`Welcome email sent to ${user.email}`);
    return {
      success: true,
      message: `Welcome email sent to ${user.email}`,
    };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return {
      success: false,
      error: `Failed to send welcome email: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

// /**
//  * MEETING RELATED
//  */

// todo: seninlen gorusme isteyen biri var
// export const sendMeetingRequestedEmail = async (
//   to: string,
//   participantEmail: string,
//   start: Date,
//   end: Date,
//   info: string
// ) => {
//   const subject = `[smeet] ${participantEmail} wants to meet`;
//   const link = `${env.NEXT_PUBLIC_APP_URL}/meetings`;
//   const htmlEmail = `
//   You got a meeting request from your page for the following timeslot: <br/>
//   ${moment(start).format("MMMM DD dddd HH:MM")} to ${moment(end).format(
//     "HH:MM"
//   )} <br/>
//   message: '${info}' <br/>
//   <a href='${link}' target='_blank>Click here</a> to manage your smeet calendar <br/>
//   `;
//   await sendEmail(to, "info@smeet.app", subject, htmlEmail);
// };

// export type CalendarInvitationContentType = {
//   subject: string;
//   to: string;
//   link: string;
//   start: Date;
//   end: Date;
//   summary: string;
//   description: string;
//   title: string;
//   hostPersonName: string;
//   hostEmail: string;
// };
// todo: RSVP emaili
// export const sendCalendarInvitation = async ({
//   subject,
//   to,
//   link,
//   start,
//   end,
//   summary,
//   description,
//   // title,
//   hostPersonName,
// }: // hostEmail,
// CalendarInvitationContentType) => {
//   try {
//     // const smtpTransport = await createGMAILTransport();
//     const mailOptions: any = {
//       from: "info@smeet.app",
//       to,
//       subject,
//       html: `Your meeting details are attached. Please click on the link to join the call!<br/><a href='${link}'>Join</a>`,
//     };

//     const ical = getIcalObjectInstance(
//       moment(start),
//       moment(end),
//       summary,
//       description,
//       "smeet.app",
//       link,
//       hostPersonName,
//       "organizer@smeet.app"
//     );
//     const alternative = {
//       "Content-Type": "text/calendar",
//       method: "REQUEST",
//       content: new Buffer(ical.toString()),
//       component: "VEVENT",
//       "Content-Class": "urn:content-classes:calendarmessage",
//     };
//     mailOptions["alternatives"] = alternative;
//     mailOptions["alternatives"]["contentType"] = "text/calendar";
//     mailOptions["alternatives"]["content"] = new Buffer(ical.toString());

//     // // to the participant
//     // smtpTransport.sendMail(mailOptions, function (error, response) {
//     //   if (error) {
//     //     console.log(error);
//     //   } else {
//     //     console.log("message sent", response);
//     //   }
//     // });

//     // // to the host
//     // smtpTransport.sendMail(
//     //   {
//     //     ...mailOptions,
//     //     to: hostEmail,
//     //     subject: "Meeting Sent: " + subject,
//     //   },
//     //   function (error, response) {
//     //     if (error) {
//     //       console.log(error);
//     //     } else {
//     //       console.log("message sent", response);
//     //     }
//     //   }
//     // );
//   } catch (e) {
//     console.error(e);
//   }
// };

// todo: bu email gittiginde ek olarak business card vCARD gidecek
// export const sendBusinessCardWithNotes = async ({
//   name,
//   subject,
//   to,
//   link,
//   summary,
//   notes,
//   title,
//   vCard,
// }: any) => {
//   try {
//     console.log(name, subject, to, link, summary, notes, title, vCard);
//     // const smtpTransport = await createGMAILTransport();

//     // const encoder = new TextEncoder();
//     // const encodedVCard = encoder.encode(vCard);

//     // const vCardBlob = new Blob([encodedVCard], {
//     //   type: "text/vcard;charset=utf-8",
//     // });
//     const stream = new Buffer(vCard, "utf-8");
//     const attachments = [
//       {
//         filename: `${escape(name)}.vcf`,
//         content: stream,
//         contentType: "text/vcardd",
//       },
//     ];
//     const mailOptions = {
//       from: "info@smeet.app",
//       to,
//       subject,
//       html: `${notes}<a href='${link}'>Join</a>`,
//       attachments,
//     };
//     console.log(mailOptions);
//     // smtpTransport.sendMail(mailOptions, function (error, response) {
//     //   if (error) {
//     //     console.log(error);
//     //   } else {
//     //     console.log("message sent", response);
//     //   }
//     // });

//     console.info("invitation sent");
//   } catch (e) {
//     console.error(e);
//   }
// };

// function getIcalObjectInstance(
//   starttime: any,
//   endtime: any,
//   summary: string,
//   description: string,
//   location: string,
//   url: string,
//   name: string,
//   email: string
// ) {
//   const cal = ical({ name: "My test calendar event" });
//   // cal..domain("mytestwebsite.com");
//   cal.createEvent({
//     start: starttime, // eg : moment()
//     end: endtime, // eg : moment(1,'days')
//     summary: summary, // 'Summary of your event'
//     description: description, // 'More description'
//     location: location, // 'Delhi'
//     url: url, // 'event url'
//     organizer: {
//       // 'organizer details'
//       name: name,
//       email: email,
//     },
//   });
//   return cal;
// }

// /* eslint-disable @typescript-eslint/no-explicit-any */
// // import nodemailer from "nodemailer";
// import * as handlebars from "handlebars";
// import ical from "ical-generator";
// import moment from "moment";

// import { env } from "@/env.mjs";

// import {
//   generatePasswordResetToken,
//   generateVerificationToken,
//   getUserByEmail,
// } from "@/server/actions/auth";
// import { activateAccountEmailTemplate } from "@/server/templates/email/activate-account.template";
// import { resetPasswordEmailTemplate } from "../templates/email/reset-password.template";

// todo: WELCOME EMAIL

// todo: PAYMENT FLOW EMAILS, invoice generated, invoice in processs etc.
