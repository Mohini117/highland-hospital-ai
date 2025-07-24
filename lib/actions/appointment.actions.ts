"use server";
import {
  ServerActionResponse,
  GuestAppointmentParams,
  GuestAppointmentSuccessData,
  ReservationSuccessData,
  AppointmentReservationParams,
} from "@/types";
import { prisma } from "@/db/prisma";
import { AppointmentStatus, Prisma } from "@/lib/generated/prisma";
import { getAppTimeZone } from "@/lib/config";
import { toZonedTime, format, fromZonedTime } from "date-fns-tz";
import { v4 as uuidv4 } from "uuid";
import { addMinutes } from "date-fns";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

interface PendingAppointmentParams {
  userId: string;
  doctorId: string;
}

interface PendingAppointmentData {
  appointment: {
    appointmentId: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
  } | null;
}

export async function getPendingAppointmentForDoctor({
  userId,
  doctorId,
}: PendingAppointmentParams): Promise<
  ServerActionResponse<PendingAppointmentData>
> {
  try {
    // 1. Find the most recent appointment with 'PAYMENT_PENDING' status
    //    where the reservation time has not expired.
    const pendingAppointment = await prisma.appointment.findFirst({
      where: {
        userId: userId,
        doctorId: doctorId,
        status: AppointmentStatus.PAYMENT_PENDING,
        reservationExpiresAt: {
          // Check that the reservation expiry time is in the future
          gt: new Date(),
        },
      },
      // Get the most recently created one if there are multiple
      orderBy: {
        createdAt: "desc",
      },
      select: {
        appointmentId: true,
        appointmentStartUTC: true,
        appointmentEndUTC: true,
        status: true,
      },
    });

    // 2. If no such appointment is found, return null.
    if (!pendingAppointment) {
      return {
        success: true,
        data: { appointment: null },
        message: "No pending appointment found.",
      };
    }

    // 3. If an appointment is found, convert its times to the app's timezone.
    const appTimeZone = getAppTimeZone();

    // Convert UTC dates from the database to zoned time objects
    const zonedStartTime = toZonedTime(
      pendingAppointment.appointmentStartUTC,
      appTimeZone
    );
    const zonedEndTime = toZonedTime(
      pendingAppointment.appointmentEndUTC,
      appTimeZone
    );

    // Format the zoned times into the required string formats
    const formattedDate = format(zonedStartTime, "yyyy-MM-dd", {
      timeZone: appTimeZone,
    });
    const formattedStartTime = format(zonedStartTime, "HH:mm", {
      timeZone: appTimeZone,
    });
    const formattedEndTime = format(zonedEndTime, "HH:mm", {
      timeZone: appTimeZone,
    });

    // 4. Return the successfully retrieved and formatted appointment data.
    return {
      success: true,
      data: {
        appointment: {
          appointmentId: pendingAppointment.appointmentId,
          date: formattedDate,
          startTime: formattedStartTime,
          endTime: formattedEndTime,
          status: pendingAppointment.status,
        },
      },
      message: "Successfully retrieved pending appointment.",
    };
  } catch (error) {
    console.error("Error fetching pending appointment:", error);
    // 5. Handle any potential errors during the database query.
    return {
      success: false,
      message:
        "Could not retrieve the pending appointment details at this time",
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch pending appointments",
      errorType: "SERVER_ERROR",
    };
  }
}

//helper function to check if a slot if available

async function checkSlotAvailability(
  doctorId: string,
  startTime: Date,
  endTime: Date,
  currentAppointmentId?: string
): Promise<boolean> {
  try {
    // Build the base query to find a conflicting appointment
    const whereClause: Prisma.AppointmentWhereInput = {
      AND: [
        { doctorId: doctorId },
        { appointmentStartUTC: startTime },
        { appointmentEndUTC: endTime },
        {
          OR: [
            // Case 1: The appointment is confirmed by payment or cash.
            {
              status: {
                in: [
                  AppointmentStatus.BOOKING_CONFIRMED,
                  AppointmentStatus.CASH,
                ],
              },
            },
            // Case 2: The appointment is pending payment but the reservation has not expired.
            {
              AND: [
                { status: AppointmentStatus.PAYMENT_PENDING },
                { reservationExpiresAt: { gt: new Date() } },
              ],
            },
          ],
        },
      ],
    };

    // If rescheduling, exclude the current appointment from the conflict check
    if (currentAppointmentId) {
      if (whereClause.AND && Array.isArray(whereClause.AND)) {
        whereClause.AND.push({
          appointmentId: {
            not: currentAppointmentId,
          },
        });
      }
    }

    const conflictingAppointment = await prisma.appointment.findFirst({
      where: whereClause,
    });

    // If a conflicting appointment is found, the slot is not available.
    // If no conflict is found (conflictingAppointment is null), the slot is available.
    return !conflictingAppointment;
  } catch (error) {
    console.error("Error checking slot availability:", error);
    // In case of a database error, assume the slot is not available to be safe.
    return false;
  }
}

export async function createGuestAppointment({
  doctorId,
  date,
  startTime,
  endTime,
}: GuestAppointmentParams): Promise<
  ServerActionResponse<GuestAppointmentSuccessData>
> {
  try {
    // 1. Generate a unique identifier for the guest
    const guestIdentifier = uuidv4();
    const appTimeZone = getAppTimeZone();

    // 2. Convert local time strings to UTC Date objects
    const appointmentStartUTC = fromZonedTime(
      `${date}T${startTime}`, // 2025-05-10T14:00
      appTimeZone
    );
    const appointmentEndUTC = fromZonedTime(`${date}T${endTime}`, appTimeZone);

    // 3. Check if the slot is still available
    const isSlotAvailable = await checkSlotAvailability(
      doctorId,
      appointmentStartUTC,
      appointmentEndUTC
    );

    if (!isSlotAvailable) {
      return {
        success: false,
        message:
          "This time slot is no longer available. Please select another time.",
        error:
          "This time slot is no longer available. Please select another time.",
        errorType: "SLOT_UNAVAILABLE",
      };
    }

    // 4. Calculate the reservation expiration time
    const appSettings = await prisma.appSettings.findUnique({
      where: { id: "global" },
    });
    const reservationDuration = appSettings?.slotReservationDuration ?? 10; // Default to 10 minutes
    const reservationExpiresAt = addMinutes(new Date(), reservationDuration);

    // 5. Create the appointment with a 'PAYMENT_PENDING' status
    const newAppointment = await prisma.appointment.create({
      data: {
        doctorId,
        guestIdentifier,
        userId: null, // Explicitly null for guest users
        patientType: "MYSELF",
        patientName: "Guest User", // Placeholder name for guest
        appointmentStartUTC,
        appointmentEndUTC,
        reservationExpiresAt,
        status: AppointmentStatus.PAYMENT_PENDING,
      },
    });

    // 6. Revalidate the doctor's schedule page to show the pending slot
    revalidatePath(`/doctors/${doctorId}`);

    // 7. On success, return the new appointmentId and guestIdentifier
    return {
      success: true,
      message: "Appointment slot reserved successfully.",
      data: {
        appointmentId: newAppointment.appointmentId,
        guestIdentifier: newAppointment.guestIdentifier!, // Non-null assertion as it's just been set
      },
    };
  } catch (error) {
    console.error("Error creating guest appointment:", error);
    return {
      success: false,
      message:
        "An unexpected error occurred while booking the appointment. Please try again later.",
      error: error instanceof Error ? error.message : "Unkown error",
      errorType: "SERVER_ERROR",
    };
  }
}

export async function createOrUpdateAppointmentReservation({
  doctorId,
  userId,
  date,
  startTime,
  endTime,
}: AppointmentReservationParams): Promise<
  ServerActionResponse<ReservationSuccessData>
> {
  try {
    // 1. Authenticate and authorize the user
    const session = await auth();
    if (!session || !session.user) {
      return {
        success: false,
        message: "Authentication required",
        error: "You must be logged in.",
        errorType: "UNAUTHENTICATED",
      };
    }
    if (session.user.id !== userId) {
      return {
        success: false,
        message: "You are not authorized to perform this action",
        error: "Authorization failed.",
        errorType: "UNAUTHORIZED",
      };
    }

    // 2. Prepare time data and calculate expiration
    const appTimeZone = getAppTimeZone();
    const appointmentStartUTC = fromZonedTime(
      `${date}T${startTime}`,
      appTimeZone
    );
    const appointmentEndUTC = fromZonedTime(`${date}T${endTime}`, appTimeZone);

    const appSettings = await prisma.appSettings.findUnique({
      where: { id: "global" },
    });
    const reservationDuration = appSettings?.slotReservationDuration ?? 10;
    const reservationExpiresAt = addMinutes(new Date(), reservationDuration);

    // 3. Check for an existing pending reservation for this user and doctor
    const existingPendingReservation = await prisma.appointment.findFirst({
      where: {
        userId: session.user.id,
        doctorId: doctorId,
        status: AppointmentStatus.PAYMENT_PENDING,
        reservationExpiresAt: { gt: new Date() },
      },
    });

    let savedAppointment;
    let message;

    if (existingPendingReservation) {
      // --- UPDATE PATH ---
      // 4a. Check if the new slot is available, excluding the current reservation from the check
      const isSlotAvailable = await checkSlotAvailability(
        doctorId,
        appointmentStartUTC,
        appointmentEndUTC,
        existingPendingReservation.appointmentId // Pass existing ID to avoid self-conflict
      );

      if (!isSlotAvailable) {
        return {
          success: false,
          message:
            "The selected slot is no longer available. Please choose another time",
          error: "This time slot is not available. Please select another.",
          errorType: "SLOT_UNAVAILABLE",
        };
      }

      // 5a. Update the existing appointment
      savedAppointment = await prisma.appointment.update({
        where: { appointmentId: existingPendingReservation.appointmentId },
        data: {
          appointmentStartUTC,
          appointmentEndUTC,
          reservationExpiresAt, // Refresh the reservation timer
        },
      });
      message = "Your appointment time has been successfully updated.";
    } else {
      // --- CREATE PATH ---
      // 4b. Check if the requested slot is available
      const isSlotAvailable = await checkSlotAvailability(
        doctorId,
        appointmentStartUTC,
        appointmentEndUTC
      );

      if (!isSlotAvailable) {
        return {
          success: false,
          message:
            "The selected appointment slot is no longer available. Please choose another time",
          error: "This time slot is not available. Please select another.",
          errorType: "SLOT_UNAVAILABLE",
        };
      }

      // 5b. Create a new appointment
      savedAppointment = await prisma.appointment.create({
        data: {
          doctorId,
          userId: session.user.id,
          patientType: "MYSELF",
          patientName: session.user.name ?? "User", // Use name from session, with a fallback
          appointmentStartUTC,
          appointmentEndUTC,
          reservationExpiresAt,
          status: AppointmentStatus.PAYMENT_PENDING,
        },
      });
      message = "Appointment slot reserved successfully.";
    }

    // 6. Revalidate the path to update UI
    revalidatePath(`/doctors/${doctorId}`);

    // 7. Return success response
    return {
      success: true,
      message,
      data: { appointmentId: savedAppointment.appointmentId },
    };
  } catch (error) {
    console.error("Error in createOrUpdateAppointmentReservation:", error);
    return {
      success: false,
      message: "Failed to complete your reservation due to a server issue",
      error: error instanceof Error ? error.message : "Unknow error occured",
      errorType: "SERVER_ERROR",
    };
  }
}

export async function cleanupExpiredReservations(): Promise<ServerActionResponse> {
  try {
    const now = new Date();

    // Use deleteMany to efficiently remove all matching records
    const result = await prisma.appointment.deleteMany({
      where: {
        status: AppointmentStatus.PAYMENT_PENDING,
        reservationExpiresAt: {
          lt: now, // 'lt' means "less than"
        },
      },
    });

    console.log(
      `[Server Action] Cleaned up ${result.count} expired reservations.`
    );

    return {
      success: true,
      message: `${result.count} expired reservations were successfully deleted.`,
    };
  } catch (error) {
    console.error("Error cleaning up expired reservations:", error);
    return {
      success: false,
      message: "Failed to cleanup expired reservations",
      error: "An unexpected error occurred while cleaning up reservations.",
      errorType: "SERVER_ERROR",
    };
  }
}
