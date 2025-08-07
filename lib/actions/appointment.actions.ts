"use server";
import {
  ServerActionResponse,
  GuestAppointmentParams,
  GuestAppointmentSuccessData,
  ReservationSuccessData,
  AppointmentReservationParams,
  AppointmentSubmissionData,
} from "@/types";
import { prisma } from "@/db/prisma";
import {
  AppointmentStatus,
  Prisma,
  TransactionStatus,
  Appointment,
} from "@/lib/generated/prisma";
import { getAppTimeZone } from "@/lib/config";
import { toZonedTime, format, fromZonedTime } from "date-fns-tz";
import { v4 as uuidv4 } from "uuid";
import { addMinutes } from "date-fns";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { PatientDetailsFormSchema } from "@/lib/validators";
import { parse, isValid } from "date-fns";
import { paypal } from "@/lib/paypal";

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

export type AppoitmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    doctor: {
      include: {
        doctorProfile: true;
      };
    };
  };
}>;

export async function getAppointmentData({
  appointmentId,
}: {
  appointmentId: string;
}): Promise<ServerActionResponse<AppoitmentWithRelations>> {
  // 1. Basic input validation
  if (!appointmentId) {
    return {
      success: false,
      message: "Appointment identifier is missing",
      error: "Appointment ID is required.",
      errorType: "BAD_REQUEST",
    };
  }

  try {
    // 2. Fetch the appointment with its relations
    const appointment = await prisma.appointment.findUnique({
      where: {
        appointmentId: appointmentId,
      },
      include: {
        doctor: {
          include: {
            // Assuming 'doctorProfile' is the name of the relation on the User model
            doctorProfile: true,
          },
        },
      },
    });

    // 3. Handle case where appointment is not found
    if (!appointment) {
      return {
        success: false,
        error: "Appointment not found.",
        errorType: "NOT_FOUND",
        message: "The requested appointment does not exist.",
      };
    }

    // 4. Check if the appointment status is PAYMENT_PENDING
    if (appointment.status !== "PAYMENT_PENDING") {
      return {
        success: false,
        error: "Appointment status conflict.",
        errorType: "StatusConflict",
        message: `This appointment cannot be processed as its status is '${appointment.status}'. Only appointments pending payment can be accessed.`,
      };
    }

    // 5. Check if the reservation has expired
    const now = new Date();
    if (
      appointment.reservationExpiresAt &&
      appointment.reservationExpiresAt < now
    ) {
      // Optionally, you could also trigger the cleanup action here or just inform the user.
      // For now, we just inform the user as requested.
      return {
        success: false,
        error: "Appointment reservation has expired.",
        errorType: "ReservationExpired",
        message:
          "Your reserved time slot has expired. Please select a new appointment time.",
      };
    }

    // 6. Success case: Return the appointment data
    return {
      success: true,
      message: "Appointment data fetched successfully.",
      data: appointment,
    };
  } catch (error) {
    console.error("Error fetching appointment data:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected server error occurred.",
      errorType: "SERVER_ERROR",
      message:
        "We could not retrieve the appointment details. Please try again later.",
    };
  }
}

export async function updateGuestAppointmentWithUser(
  guestIdentifier: string
): Promise<ServerActionResponse<{ appointmentId?: string }>> {
  // 1. Authenticate the user
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      errorType: "AUTHENTICATION_ERROR",
      error: "User is not authenticated.",
      message: "You must be logged in to claim an appointment.",
    };
  }
  const userId = session.user.id;

  // 2. Validate input
  if (!guestIdentifier) {
    return {
      success: false,
      errorType: "VALIDATION_ERROR",
      error: "Guest identifier is missing.",
      message: "We were not able to find your appointment. Please try again",
    };
  }

  try {
    // 3. Find the guest appointment that is not expired and not already claimed
    const appointmentToClaim = await prisma.appointment.findFirst({
      where: {
        guestIdentifier: guestIdentifier,
        userId: null, // Ensure it's a guest appointment that hasn't been claimed
        reservationExpiresAt: {
          gt: new Date(), // Check that the reservation slot has not expired
        },
      },
    });

    // 4. Handle if appointment is not found, expired, or already claimed
    if (!appointmentToClaim) {
      return {
        success: false,
        errorType: "NOT_FOUND",
        error: "Appointment not found or expired.",
      };
    }

    // 5. Update the appointment record with the user's ID
    const updatedAppointment = await prisma.appointment.update({
      where: {
        appointmentId: appointmentToClaim.appointmentId,
      },
      data: {
        userId: userId,
        // It's good practice to nullify the guest identifier after it's been used
        guestIdentifier: null,
      },
    });

    // 6. Return a success response
    return {
      success: true,
      message: "Appointment has been successfully linked to your account.",
      data: { appointmentId: updatedAppointment.appointmentId },
    };
  } catch (error) {
    console.error("Error updating guest appointment with user:", error);
    return {
      success: false,
      errorType: "SERVER_ERROR",
      error: error instanceof Error ? error.message : "An unkown error occured",
      message: "An unexpected error occurred while updating the appointment.",
    };
  }
}

interface AppointmentData {
  appointmentId?: string;
}

export async function processAppointmentBooking(
  data: AppointmentSubmissionData
): Promise<ServerActionResponse<AppointmentData>> {
  // 1. Check for authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: "Authentication required. Please sign in to book an appointment.",
      errorType: "AUTH_ERROR",
    };
  }
  const userId = session.user.id;

  // 2. Validate form data
  const validationResult = PatientDetailsFormSchema.safeParse(data);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Please correct the errors below.",
      fieldErrors: validationResult.error.flatten().fieldErrors,
      errorType: "VALIDATION_ERROR",
    };
  }
  const validatedData = validationResult.data;

  try {
    const appTimeZone = getAppTimeZone(); // e.g., 'Asia/Kolkata'

    // 3. Convert local time slot to UTC Dates for database storage
    // Assumes `data.date` is in a format like 'YYYY-MM-DD'
    const appointmentStartUTC = fromZonedTime(
      `${data.date} ${data.timeSlot}`,
      appTimeZone
    );
    const appointmentEndUTC = fromZonedTime(
      `${data.date} ${data.endTime}`,
      appTimeZone
    );

    // Parse patient's date of birth if provided
    let patientDob: Date | null = null;
    if (
      // validatedData.patientType === "SOMEONE_ELSE" &&
      // validatedData.dateOfBirth
      data.patientdateofbirth
    ) {
      const parsedDob = parse(
        data.patientdateofbirth,
        // "dd/MM/yyyy",
        "yyyy-MM-dd",
        new Date()
      );
      if (isValid(parsedDob)) {
        patientDob = parsedDob;
      }
    }

    const { appointmentId, doctorId } = data;
    let finalAppointmentId: string | undefined = appointmentId;

    // 4. Find the original appointment reservation
    const existingAppointment = appointmentId
      ? await prisma.appointment.findFirst({
          where: {
            appointmentId: appointmentId,
            userId: userId, // Ensure user can only access their own appointments
          },
        })
      : null;

    const isReservationValid =
      existingAppointment &&
      existingAppointment.reservationExpiresAt &&
      existingAppointment.reservationExpiresAt > new Date();

    // 5. Decide whether to UPDATE or CREATE
    if (isReservationValid && existingAppointment) {
      // --- Scenario 1: Reservation is valid, UPDATE the appointment ---
      await prisma.appointment.update({
        where: { appointmentId: existingAppointment.appointmentId },
        data: {
          patientType: validatedData.patientType,
          patientName: validatedData.fullName,
          patientRelation:
            validatedData.patientType === "SOMEONE_ELSE"
              ? validatedData.relationship
              : null,
          phoneNumber: data.phone,
          patientdateofbirth: patientDob,
          reasonForVisit: validatedData.reason,
          additionalNotes: validatedData.notes,
        },
      });
      finalAppointmentId = existingAppointment.appointmentId;
    } else {
      // --- Scenario 2 & 3: Reservation expired or not found, try to CREATE a new one ---

      // First, check if the desired slot has been taken by someone else
      const isSlotAvailable = await checkSlotAvailability(
        doctorId,
        appointmentStartUTC,
        appointmentEndUTC
      );

      if (!isSlotAvailable) {
        return {
          success: false,
          message:
            "Your appointment reservation for the selection slot has expired. Please select another slot",
          error:
            "This time slot is no longer available. Please select a different one.",
          errorType: "SLOT_UNAVAILABLE",
        };
      }

      // Slot is available, so create a new appointment with a new reservation window
      const settings = await prisma.appSettings.findUnique({
        where: { id: "global" },
      });
      const reservationDuration = settings?.slotReservationDuration ?? 10; // Fallback to 10 mins
      const reservationExpiresAt = new Date(
        Date.now() + reservationDuration * 60 * 1000
      );

      const newAppointment = await prisma.appointment.create({
        data: {
          doctorId: doctorId,
          userId: userId,
          appointmentStartUTC: appointmentStartUTC,
          appointmentEndUTC: appointmentEndUTC,
          status: "PAYMENT_PENDING",
          reservationExpiresAt: reservationExpiresAt,
          patientType: validatedData.patientType,
          patientName: validatedData.fullName,
          patientRelation:
            validatedData.patientType === "SOMEONE_ELSE"
              ? validatedData.relationship
              : null,
          phoneNumber: data.phone,
          patientdateofbirth: patientDob,
          reasonForVisit: validatedData.reason,
          additionalNotes: validatedData.notes,
        },
      });
      finalAppointmentId = newAppointment.appointmentId;
    }

    // 6. Revalidate the cache and return a success response
    if (finalAppointmentId) {
      revalidatePath(
        `/appointments/patient-details?appointmentId=${finalAppointmentId}`
      );
    }

    return {
      success: true,
      message: "Appointment details saved successfully.",
      data: {
        appointmentId: finalAppointmentId,
      },
    };
  } catch (error) {
    console.error("Error in processAppointmentBooking:", error);
    return {
      success: false,
      message: "An unexpected server error occurred. Please try again later.",
      error: error instanceof Error ? error.message : "An unkown error occured",
      errorType: "SERVER_ERROR",
    };
  }
}

interface PayPalOrderSuccessData {
  orderId: string;
}

export async function createPayPalOrder(
  appointmentId: string
): Promise<ServerActionResponse<PayPalOrderSuccessData>> {
  // 1. Validate input
  if (!appointmentId) {
    return {
      success: false,
      message: "Appointment ID is required.",
      errorType: "validation_error",
    };
  }

  try {
    // 2. Verify the appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { appointmentId },
    });

    if (!appointment) {
      return {
        success: false,
        message: `Appointment with ID ${appointmentId} not found.`,
        errorType: "not_found",
      };
    }

    // The price is fixed at $150
    const price = 150;

    // 3. Create the PayPal order
    // The paypal.createOder function will throw an error on failure, which will be caught below.
    const payPalOrder = await paypal.createOder(price);

    // 4. Check for a valid order ID from PayPal
    if (!payPalOrder || !payPalOrder.id) {
      console.error("PayPal order creation failed:", payPalOrder);
      return {
        success: false,
        message: "Failed to create PayPal order. Invalid response from PayPal.",
        errorType: "api_error",
      };
    }

    const orderId = payPalOrder.id;

    // 5. Update the appointment record with PayPal details
    await prisma.appointment.update({
      where: {
        appointmentId: appointmentId,
      },
      data: {
        paymentMethod: "PayPal",
        paymentResult: {
          id: orderId,
          pricePaid: 0, // Payment is not captured yet
          status: payPalOrder.status || "CREATED", // Status from PayPal response
          email_address: "", // Not available at order creation
        },
      },
    });

    // 6. Return a successful response
    return {
      success: true,
      message: "PayPal order created successfully.",
      data: {
        orderId: orderId,
      },
    };
  } catch (error) {
    // 7. Handle any errors during the process
    console.error("Error in createPayPalOrder:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";

    return {
      success: false,
      message: `Server error: ${errorMessage}`,
      errorType: "SERVER_ERROR",
    };
  }
}

export async function approvePayPalOrder(
  appointmentId: string,
  data: { orderId: string }
): Promise<ServerActionResponse> {
  const { orderId } = data;

  // 1. Validate input
  if (!appointmentId || !orderId) {
    return {
      success: false,
      message: "Appointment ID and Order ID are required.",
      errorType: "validation_error",
    };
  }

  // 2. Fetch the appointment to get the doctorId and verify its existence
  const appointment = await prisma.appointment.findUnique({
    where: { appointmentId },
    select: { doctorId: true },
  });

  if (!appointment) {
    return {
      success: false,
      message: `Appointment with ID ${appointmentId} not found.`,
      errorType: "not_found",
    };
  }

  let transactionStatus: TransactionStatus = TransactionStatus.FAILED;
  let errorMessage: string | null = null;
  let captureData;

  //capture payment
  try {
    // 3. Capture the payment using the PayPal service
    captureData = await paypal.capturePayment(orderId);

    // 4. Check for a successful capture status from PayPal
    if (captureData.status === "COMPLETED") {
      // 6. Call the function to update the appointment status to paid (placeholder)
      await updateAppointmentToPaid({
        appointmentId: appointmentId,
        paymentResult: {
          id: captureData.id,
          status: captureData.status,
          email_address: captureData.payer.email_address,
          pricePaid:
            captureData.purchase_units[0]?.payments?.captures[0]?.amount?.value,
        },
      });
      transactionStatus = TransactionStatus.COMPLETED;
    } else {
      errorMessage = `Paypal capture status was ${
        captureData?.status || "unkown"
      }`;
    }
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "unknown error during Paypal approval";
    console.error(errorMessage);
  }

  //is to make an entry in the transaction table
  try {
    const captureDetails =
      captureData?.purchase_units[0]?.payments?.captures[0];

    // 5. Create a record for the successful transaction
    await prisma.transaction.create({
      data: {
        appointmentId: appointmentId,
        doctorId: appointment.doctorId,
        paymentGateway: "PayPal",
        gatewayTransactionId: captureDetails?.id || data.orderId, // Use the capture ID for successful transactions
        amount: parseFloat(captureDetails?.amount?.value ?? "0"),
        currency: captureDetails?.amount?.currency_code || "USD",
        status: transactionStatus,
        paymentDetails: captureData ? captureData : Prisma.JsonNull, // Store the full raw response
        transactionDate: new Date(),
        notes:
          transactionStatus === TransactionStatus.FAILED ? errorMessage : null,
      },
    });
  } catch (dbError) {
    console.error(`Failed to create transaction record`, dbError);
  }

  if (transactionStatus === TransactionStatus.COMPLETED) {
    return {
      success: true,
      message: "Appointment booking confirmed",
    };
  } else {
    return {
      success: false,
      message: errorMessage || "Failed to process paypal payment",
      errorType: "PAYMENT_GATEWAY_ERROR",
    };
  }
}

export async function updateAppointmentToPaid({
  appointmentId,
  paymentResult,
}: {
  appointmentId: string;
  paymentResult: {
    id: string;
    status: string;
    email_address: string;
    pricePaid: string | number;
  };
}): Promise<ServerActionResponse<Appointment>> {
  // 1. Validate input
  if (!appointmentId || !paymentResult) {
    return {
      success: false,
      message: "Appointment ID and payment result are required.",
      errorType: "validation_error",
    };
  }

  try {
    // 2. Update the appointment record in the database
    // The `update` method will throw an error if the appointment is not found,
    // which will be caught by the catch block.

    const pricePaidNumber =
      typeof paymentResult.pricePaid === "string"
        ? parseFloat(paymentResult.pricePaid)
        : paymentResult.pricePaid;

    const updatedAppointment = await prisma.appointment.update({
      where: {
        appointmentId: appointmentId,
      },
      data: {
        paymentResult: {
          id: paymentResult.id,
          status: paymentResult.status,
          email_address: paymentResult.email_address,
          pricePaid: pricePaidNumber,
        },
        paidAt: new Date(), // Set the payment timestamp to now
        status: AppointmentStatus.BOOKING_CONFIRMED, // Update the status
        reservationExpiresAt: null, // Clear the reservation expiry as it's now confirmed
      },
    });

    // 3. Return a successful response with the updated data
    return {
      success: true,
      message: "Appointment successfully updated to paid.",
      data: updatedAppointment,
    };
  } catch (error) {
    // 4. Handle any errors during the database update
    console.error(
      `Error updating appointment ${appointmentId} to paid:`,
      error
    );

    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";

    return {
      success: false,
      message: `Server error: ${errorMessage}`,
      errorType: "SERVER_ERROR",
    };
  }
}

export async function confirmCashAppointment(
  appointmentId: string
): Promise<ServerActionResponse> {
  // 1. Find the appointment to ensure it exists
  const existingAppointment = await prisma.appointment.findUnique({
    where: { appointmentId },
  });

  if (!existingAppointment) {
    return {
      success: false,
      message: "Appointment not found.",
      errorType: "NOT_FOUND",
    };
  }

  // 2. Verify the appointment status is 'PAYMENT_PENDING'
  if (existingAppointment.status !== AppointmentStatus.PAYMENT_PENDING) {
    return {
      success: false,
      message: `Action cannot be completed. Appointment status is '${existingAppointment.status}'.`,
      errorType: "STATUS_CONFLICT",
    };
  }

  try {
    // 3. Update appointment status to CASH and clear reservation timer
    await prisma.appointment.update({
      where: {
        appointmentId: existingAppointment.appointmentId,
      },
      data: {
        status: AppointmentStatus.CASH,
        paymentMethod: "CASH",
        reservationExpiresAt: null, // Clear expiration as the slot is now confirmed
      },
    });

    // 4. Revalidate paths to reflect the change in the UI
    // revalidatePath(`/dashboard/appointments`);
    // revalidatePath(`/appointments/${appointmentId}`);
    revalidatePath(`/doctors/${existingAppointment.doctorId}`);
    revalidatePath("/user/profile");

    return {
      success: true,
      message: "Appointment successfully confirmed for cash payment.",
    };
  } catch (error) {
    console.error("Error confirming cash appointment:", error);
    return {
      success: false,
      message: "An unexpected server error occurred. Please try again.",
      errorType: "SERVER_ERROR",
    };
  }
}

interface ConfirmationDetailsData {
  appointment: {
    id: string;
    status: AppointmentStatus;
    startDateTime: Date;
    reason: string | null;
    patientName: string;
    patientEmail: string;
    patientPhone: string;
  };
  doctor: {
    name: string;
    speciality: string;
  };
  transaction: {
    gatewayTransactionId: string;
    amount: number;
    currency: string;
    paymentGateway: string;
  } | null;
}

export async function getConfirmationDetails(
  appointmentId: string
): Promise<ServerActionResponse<ConfirmationDetailsData>> {
  if (!appointmentId) {
    return {
      success: false,
      message: "Appointment Id is required to get confirmation details",
      error: "No appointment Id provided",
      errorType: "BAD_REQUEST",
    };
  }

  try {
    // 2. Fetch Data from Database
    const appointmentDetails = await prisma.appointment.findUnique({
      where: {
        appointmentId: appointmentId,
      },
      include: {
        // Include the doctor's details and their specialty from the profile
        doctor: {
          select: {
            name: true,
            doctorProfile: {
              select: {
                specialty: true,
              },
            },
          },
        },
        // Include the registered user's email if available
        user: {
          select: {
            email: true,
          },
        },
        // Include the latest completed transaction for this appointment
        transactions: {
          where: {
            status: TransactionStatus.COMPLETED,
          },
          orderBy: {
            transactionDate: "desc",
          },
          take: 1,
        },
      },
    });

    // 3. Handle Not Found Case
    if (!appointmentDetails) {
      return {
        success: false,
        error: "Not Found",
        message: "Appointment details could not be found.",
        errorType: "NOT_FOUND",
      };
    }

    // 4. Transform Data
    const latestTransaction =
      appointmentDetails.transactions.length > 0
        ? appointmentDetails.transactions[0]
        : null;

    const data: ConfirmationDetailsData = {
      appointment: {
        id: appointmentDetails.appointmentId,
        status: appointmentDetails.status,
        startDateTime: appointmentDetails.appointmentStartUTC,
        reason: appointmentDetails.reasonForVisit,
        patientName: appointmentDetails.patientName,
        // Use the registered user's email or a placeholder if it's a guest appointment
        patientEmail: appointmentDetails.user?.email ?? "N/A",
        // Provide a fallback for the phone number
        patientPhone: appointmentDetails.phoneNumber ?? "N/A",
      },
      doctor: {
        name: appointmentDetails.doctor.name,
        // Provide a fallback for the doctor's specialty
        speciality:
          appointmentDetails.doctor.doctorProfile?.specialty ??
          "General Physician",
      },
      // Map transaction details if a completed transaction exists
      transaction: latestTransaction
        ? {
            gatewayTransactionId: latestTransaction.gatewayTransactionId,
            amount: latestTransaction.amount,
            currency: latestTransaction.currency,
            paymentGateway: latestTransaction.paymentGateway,
          }
        : null,
    };

    // 5. Return Success Response
    return {
      success: true,
      data: data,
    };
  } catch (error) {
    // 6. Handle Server/Database Errors
    console.error("Failed to get confirmation details:", error);
    return {
      success: false,
      error: "Database Error",
      message:
        "An unexpected error occurred while fetching appointment details. Please try again later.",
      errorType: "SERVER_ERROR",
    };
  }
}
