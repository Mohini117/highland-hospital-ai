"use server";
import { ServerActionResponse } from "@/types";
import { prisma } from "@/db/prisma";
import { AppointmentStatus } from "@/lib/generated/prisma";
import { getAppTimeZone } from "@/lib/config";
import { toZonedTime, format } from "date-fns-tz";

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
