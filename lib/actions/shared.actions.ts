"use server";

import { ServerActionResponse } from "@/types";
import { prisma } from "@/db/prisma";
import { AppointmentStatus } from "@/lib/generated/prisma";
import { revalidatePath } from "next/cache";

import { LeaveType, Prisma } from "@/lib/generated/prisma";
import { getAppTimeZone } from "@/lib/config";
import { startOfDay, endOfDay, parseISO, getHours } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export async function cancelCashAppointment(
  appointmentId: string
): Promise<ServerActionResponse> {
  if (!appointmentId) {
    return {
      success: false,
      message: "Appointment ID is required.",
      errorType: "badRequest",
    };
  }
  try {
    // Step 1: Find the appointment by its ID
    const appointment = await prisma.appointment.findUnique({
      where: { appointmentId },
    });

    // Step 2: Handle case where appointment is not found
    if (!appointment) {
      return {
        success: false,
        message: "Appointment not found.",
        errorType: "notFound",
      };
    }

    // Step 3: Check if the appointment status is 'CASH'
    if (appointment.status !== AppointmentStatus.CASH) {
      return {
        success: false,
        message:
          "This appointment cannot be cancelled. This is not a cash payment appointment. Please call the Admin",
        errorType: "InvalidStatus",
      };
    }

    // Step 4: Update the appointment status to 'CANCELLED'
    await prisma.appointment.update({
      where: { appointmentId },
      data: {
        status: AppointmentStatus.CANCELLED,
      },
    });

    revalidatePath(`/user/profile`);
    // revalidatePath("/admin/appointments");

    // Step 6: Return a success response
    return {
      success: true,
      message: "Appointment successfully cancelled.",
    };
  } catch (error) {
    // Step 7: Handle any unexpected errors
    console.error("Error cancelling cash appointment:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again later.",
      error: error instanceof Error ? error.message : "Unknown error",
      errorType: "SERVER_ERROR",
    };
  }
}

type SelectedAppointmentInfo = {
  appointmentId: string;
  appointmentStartUTC: Date;
  patientName: string | null;
  phoneNumber: string | null;
  status: AppointmentStatus;
  user: {
    email: string | null;
    phoneNumber: string | null;
    name: string | null;
  } | null;
};

export async function getDoctorAppointmentsForDateInternal(
  doctorId: string,
  dateStr: string,
  leaveType?: LeaveType
): Promise<SelectedAppointmentInfo[]> {
  const TIMEZONE = getAppTimeZone();
  const leaveDateStart = startOfDay(parseISO(dateStr));
  const leaveDateEnd = endOfDay(parseISO(dateStr));

  const timeFilter: Prisma.AppointmentWhereInput = {
    appointmentStartUTC: {
      gte: leaveDateStart,
      lte: leaveDateEnd,
    },
  };

  // Fetch all potentially conflicting appointments for the UTC day
  const potentiallyConflictingAppointments = await prisma.appointment.findMany({
    where: {
      doctorId: doctorId,
      status: {
        in: [AppointmentStatus.BOOKING_CONFIRMED, AppointmentStatus.CASH],
      },
      // Use the simplified timeFilter (just the date range)
      AND: [timeFilter],
    },
    select: {
      appointmentId: true,
      appointmentStartUTC: true,
      patientName: true,
      phoneNumber: true,
      status: true,
      user: {
        select: { email: true, phoneNumber: true, name: true },
      },
    },
    orderBy: {
      appointmentStartUTC: "asc",
    },
  });

  let conflictingAppointments: SelectedAppointmentInfo[];

  if (leaveType === LeaveType.MORNING) {
    conflictingAppointments = potentiallyConflictingAppointments.filter(
      (apt) => {
        const zonedStartTime = toZonedTime(apt.appointmentStartUTC, TIMEZONE);
        const hourInAppZone = getHours(zonedStartTime);
        // Morning leave conflicts if appointment starts *before* 1 PM (13:00) in the app's timezone
        return hourInAppZone < 13;
      }
    );
  } else if (leaveType === LeaveType.AFTERNOON) {
    conflictingAppointments = potentiallyConflictingAppointments.filter(
      (apt) => {
        const zonedStartTime = toZonedTime(apt.appointmentStartUTC, TIMEZONE);
        const hourInAppZone = getHours(zonedStartTime);
        // Afternoon leave conflicts if appointment starts *at or after* 1 PM (13:00) in the app's timezone
        return hourInAppZone >= 13;
      }
    );
  } else {
    // For FULL_DAY or no leave type, all fetched appointments are considered conflicts
    conflictingAppointments = potentiallyConflictingAppointments;
  }

  return conflictingAppointments;
}
