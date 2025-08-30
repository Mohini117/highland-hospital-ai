"use server";
import {
  ServerActionResponse,
  DoctorSummary,
  DoctorDetails,
  TimeSlot,
} from "@/types";
import { prisma } from "@/db/prisma";
import { Role } from "@/lib/generated/prisma";
import { getAppTimeZone } from "@/lib/config";
import { addMinutes, format, isSameDay, parse } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { AppointmentStatus, LeaveType } from "@/lib/generated/prisma"; // Import enums from generated Prisma client

export async function getOurDoctors(): Promise<
  ServerActionResponse<DoctorSummary[]>
> {
  try {
    // Fetch users who have the DOCTOR role and an active profile.
    // We use `select` to efficiently query only the necessary fields.
    const doctors = await prisma.user.findMany({
      where: {
        role: Role.DOCTOR,
        doctorProfile: {
          isActive: true,
        },
      },
      select: {
        id: true,
        name: true,
        image: true, // This will be mapped to imageUrl
        doctorProfile: {
          select: {
            specialty: true,
            rating: true,
            reviewCount: true,
          },
        },
      },
      orderBy: {
        // Optional: you can order the results, e.g., by rating or name
        doctorProfile: {
          rating: "desc",
        },
      },
    });

    // The `where` clause ensures `doctorProfile` is not null, but it's good practice to handle it safely.
    if (!doctors) {
      return {
        success: true,
        data: [], // Return empty array if no doctors found
      };
    }

    // Map the fetched data to the DoctorSummary structure.
    const formattedDoctors: DoctorSummary[] = doctors.map((doc) => ({
      id: doc.id,
      name: doc.name,
      imageUrl: doc.image,
      specialty: doc.doctorProfile?.specialty ?? "N/A",
      rating: doc.doctorProfile?.rating ?? 0,
      reviewCount: doc.doctorProfile?.reviewCount ?? 0,
    }));

    // Return a success response with the formatted doctor data.
    return {
      success: true,
      data: formattedDoctors,
    };
  } catch (error) {
    // Log the detailed error for server-side debugging.
    console.error("Error fetching our doctors:", error);

    // Return a generic error response to the client.
    return {
      success: false,
      message:
        "An unexpected error occurred while fetching doctor information.",
      error: error instanceof Error ? error.message : String(error),
      errorType: "SERVER_ERROR",
    };
  }
}

export async function getDoctorDetails(
  doctorId: string
): Promise<ServerActionResponse<DoctorDetails>> {
  // Validate input to ensure doctorId is provided.
  if (!doctorId) {
    return {
      success: false,
      message: "Doctor ID is required.",
    };
  }

  try {
    // Query the database to find the user with the specified ID and DOCTOR role.
    // We select specific fields from the User and the related DoctorProfile models.
    const doctor = await prisma.user.findUnique({
      where: {
        id: doctorId,
        role: "DOCTOR",
        isActive: true, //<--- ADD THIS LINE
      },
      select: {
        id: true,
        name: true,
        image: true,
        doctorProfile: {
          select: {
            credentials: true,
            specialty: true,
            rating: true,
            reviewCount: true,
            languages: true,
            specializations: true,
            brief: true,
          },
        },
      },
    });

    // If no doctor is found or the doctor does not have a profile,
    // return a "not found" response.
    if (!doctor || !doctor.doctorProfile) {
      return {
        success: false,
        message: "Doctor not found or profile is incomplete.",
        errorType: "NOT_FOUND",
      };
    }

    // Map the fetched data to the DoctorDetails interface.
    // Note the mapping from `specialty` (from schema) to `speciality` (in type).
    const doctorDetails: DoctorDetails = {
      id: doctor.id,
      name: doctor.name,
      image: doctor.image,
      credentials: doctor.doctorProfile.credentials,
      speciality: doctor.doctorProfile.specialty,
      rating: doctor.doctorProfile.rating,
      reviewCount: doctor.doctorProfile.reviewCount,
      languages: doctor.doctorProfile.languages,
      specializations: doctor.doctorProfile.specializations,
      brief: doctor.doctorProfile.brief,
    };

    // Return a successful response with the doctor's details.
    return {
      success: true,
      message: "Doctor details fetched successfully.",
      data: doctorDetails,
    };
  } catch (error) {
    // In case of any database or unexpected errors, log the error
    // and return a generic error response.
    console.error("Error in getDoctorDetails server action:", error);
    return {
      success: false,
      message: "An unexpected error occurred while fetching doctor details.",
      error: error instanceof Error ? error.message : "Unknown error",
      errorType: "SERVER_ERROR",
    };
  }
}

interface GetAvailableSlotsParams {
  doctorId: string;
  date: string; //format - YYYY - MM-DD
  currentUserId?: string;
}

export async function getAvailableDoctorSlots({
  doctorId,
  date,
  currentUserId,
}: GetAvailableSlotsParams): Promise<ServerActionResponse<TimeSlot[]>> {
  try {
    // --- 1. SETUP & PREREQUISITES ---

    const appTimeZone = getAppTimeZone();
    const nowUTC = new Date(); // Current moment in time, the date object's internal value is UTC based

    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      include: { doctorProfile: true },
    });

    if (!doctor || !doctor.doctorProfile) {
      return {
        success: false,
        message: "Docotr not found",
        errorType: "NOT_FOUND",
      };
    }

    // Fetch global application settings for slot generation.
    const appSettings = await prisma.appSettings.findFirst();
    if (!appSettings) {
      return {
        success: false,
        message: "Application settings are not configured.",
        errorType: "ConfigurationError",
      };
    }
    const { slotsPerHour, startTime, endTime } = appSettings;
    const slotDurationInMinutes = 60 / slotsPerHour;

    // --- 2. GENERATE ALL POTENTIAL SLOTS (MASTER LIST) ---

    const allPotentialSlots: TimeSlot[] = [];
    // Convert the day's start and end times from app timezone to UTC.
    const dayStartTimeUTC = fromZonedTime(`${date}T${startTime}`, appTimeZone);
    const dayEndTimeUTC = fromZonedTime(`${date}T${endTime}`, appTimeZone);

    let currentSlotStartUTC = dayStartTimeUTC;

    // Loop through the day and generate all possible slots.
    while (currentSlotStartUTC < dayEndTimeUTC) {
      const currentSlotEndUTC = addMinutes(
        currentSlotStartUTC,
        slotDurationInMinutes
      );

      // Ensure the generated slot does not exceed the doctor's end time.
      if (currentSlotEndUTC > dayEndTimeUTC) {
        break;
      }

      allPotentialSlots.push({
        startTimeUTC: currentSlotStartUTC,
        endTimeUTC: currentSlotEndUTC,
        // Format display times in the application's local timezone.
        startTime: format(
          toZonedTime(currentSlotStartUTC, appTimeZone),
          "HH:mm"
        ),
        endTime: format(toZonedTime(currentSlotEndUTC, appTimeZone), "HH:mm"),
      });

      currentSlotStartUTC = currentSlotEndUTC;
    }

    let availableSlots = [...allPotentialSlots];

    // --- 3. FILTER UNAVAILABLE SLOTS (SUBTRACTION LOGIC) ---

    // A. Filter based on Doctor's Leave
    const leaveDate = new Date(date); // Prisma's @db.Date type maps to a JS Date at midnight UTC.
    const doctorLeave = await prisma.doctorLeave.findUnique({
      where: {
        doctorId_leaveDate: {
          doctorId,
          leaveDate: leaveDate,
        },
      },
    });

    if (doctorLeave) {
      if (doctorLeave.leaveType === LeaveType.FULL_DAY) {
        return { success: true, data: [], message: "Full day on leave" }; // Doctor is on leave the whole day.
      }

      // 1:00 PM in the app's timezone, converted to UTC.
      const afternoonStartUTC = fromZonedTime(`${date}T13:00:00`, appTimeZone);

      if (doctorLeave.leaveType === LeaveType.MORNING) {
        availableSlots = availableSlots.filter(
          (slot) => slot.startTimeUTC >= afternoonStartUTC
        );
      } else if (doctorLeave.leaveType === LeaveType.AFTERNOON) {
        availableSlots = availableSlots.filter(
          (slot) => slot.startTimeUTC < afternoonStartUTC
        );
      }
    }

    // B. Filter based on Existing Appointments
    const dayStartInAppTz = fromZonedTime(`${date}T00:00:00`, appTimeZone);
    const dayEndInAppTz = fromZonedTime(`${date}T23:59:59`, appTimeZone);

    const appointmentsOnDate = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentStartUTC: {
          gte: dayStartInAppTz,
          lte: dayEndInAppTz,
        },
        status: {
          in: [
            AppointmentStatus.BOOKING_CONFIRMED,
            AppointmentStatus.CASH,
            AppointmentStatus.PAYMENT_PENDING,
          ],
        },
      },
      select: {
        appointmentStartUTC: true,
        status: true,
        reservationExpiresAt: true,
        userId: true,
      },
    });

    // Create a set of UTC start times for all "taken" slots for efficient lookup.
    const takenSlotTimesUTC = new Set<string>();
    appointmentsOnDate.forEach((appt) => {
      const isConfirmed =
        appt.status === AppointmentStatus.BOOKING_CONFIRMED ||
        appt.status === AppointmentStatus.CASH;

      const isPendingAndActive =
        appt.status === AppointmentStatus.PAYMENT_PENDING &&
        appt.reservationExpiresAt &&
        appt.reservationExpiresAt > nowUTC;

      // User-Specific Exception: A user's own pending slot should not be considered "taken".
      const isCurrentUserOwnPendingSlot =
        isPendingAndActive && currentUserId && appt.userId === currentUserId;

      if ((isConfirmed || isPendingAndActive) && !isCurrentUserOwnPendingSlot) {
        takenSlotTimesUTC.add(appt.appointmentStartUTC.toISOString());
      }
    });

    if (takenSlotTimesUTC.size > 0) {
      availableSlots = availableSlots.filter(
        (slot) => !takenSlotTimesUTC.has(slot.startTimeUTC.toISOString())
      );
    }

    // C. Filter Past Slots for Today
    const requestedDateParsed = parse(date, "yyyy-MM-dd", new Date());
    const isToday = isSameDay(
      toZonedTime(nowUTC, appTimeZone),
      requestedDateParsed
    );

    if (isToday) {
      availableSlots = availableSlots.filter(
        (slot) => slot.startTimeUTC > nowUTC
      );
    }

    // --- 4. FINALIZE AND RETURN ---
    return {
      success: true,
      data: availableSlots,
      message: "available slots fetched successfully",
    };
  } catch (error) {
    // In a real application, you might use a more sophisticated logging service.
    console.error("Error in getAvailableDoctorSlots:", error);
    return {
      success: false,
      message: "An unexpected error occurred while fetching available slots.",
      error: error instanceof Error ? error.message : "Unknown server error",
      errorType: "SERVER_ERROR",
    };
  }
}
