import PatientDetailsClient from "./patient-details-client";
import { AppointmentData, PatientData } from "@/types";
import {
  updateGuestAppointmentWithUser,
  getAppointmentData,
} from "@/lib/actions/appointment.actions";
import { getAppTimeZone } from "@/lib/config";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { toZonedTime } from "date-fns-tz";
import { format as formatDateFns } from "date-fns";
import { redirectToErrorPage } from "@/lib/config";

interface PatientDetailsSearchParams {
  appointmentId: string;
  guestIdentifier?: string;
}

export default async function PatientDetails({
  searchParams,
}: {
  searchParams: Promise<PatientDetailsSearchParams>;
}) {
  const { appointmentId, guestIdentifier } = await searchParams;
  const session = await auth();
  const timeZone = getAppTimeZone();

  if (!appointmentId) {
    redirectToErrorPage(
      "MISSING_PARAMS",
      "There was an issue with your Appointment. Please try again"
    );
  }

  // At this point, the user is authorized. If they are logged in, fetch their details.
  const userId = session?.user?.id;

  // Fetch the appointment data using the getAppointmentData server action
  // const { data: appointment, ...appointmentActionResponse } =
  //   await getAppointmentData({ appointmentId });

  const appointmentActionResponse = await getAppointmentData({ appointmentId });

  // If fetching the appointment was not successful or data is missing, handle it.
  if (!appointmentActionResponse.success) {
    //NOT_FOUND,StatusConflict,ReservationExpired
    if (appointmentActionResponse.errorType === "NOT_FOUND") {
      redirectToErrorPage(
        "NOT_FOUND",
        "Your reservation may have timed out or is no longer available. Please select another slot and proceed making a fresh appointment"
      );
    } else if (
      appointmentActionResponse.errorType === "StatusConflict" ||
      appointmentActionResponse.errorType === "ReservationExpired"
    ) {
      redirectToErrorPage(
        appointmentActionResponse.errorType,
        appointmentActionResponse.message ||
          "There was a problem with your appointment. Please select a new slot and try again"
      );
    } else {
      redirectToErrorPage(
        "SERVER_ERROR",
        appointmentActionResponse.message ||
          "Could not load your appointment details"
      );
    }
  }

  const appointment = appointmentActionResponse.data;

  if (!appointment) {
    redirectToErrorPage("UNEXPECTED_STATE", "Failed to load appointment data");
    return;
  }

  // Authorization check:
  // The user must be the one associated with the appointment,
  // or it must be a valid guest access.
  const isValidUser =
    session?.user?.id && appointment.userId === session.user.id;
  const isValidGuest =
    !appointment.userId &&
    guestIdentifier &&
    appointment.guestIdentifier === guestIdentifier;

  if (!isValidUser && !isValidGuest) {
    // If neither condition is met, the user is not authorized.
    // Redirecting to a sign-in page is a common pattern here.
    redirectToErrorPage(
      "UNAUTHORIZED",
      "You are not authorized to view this appointment"
    );
  }

  // If there's a guestIdentifier and a logged-in user, update the appointment
  // This associates the guest appointment with the logged-in user's account.
  if (guestIdentifier && session?.user?.id && !appointment.userId) {
    const updateResult = await updateGuestAppointmentWithUser(guestIdentifier);
    if (!updateResult.success) {
      redirectToErrorPage(
        "GUESTUPDATEFAILED",
        "An error occured . Please try again later"
      );
    }
  }

  // Query the user table for details needed for PatientData
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      dateofbirth: true,
      phoneNumber: true,
    },
  });

  if (!user) {
    throw new Error("Patient details could not be found.");
  }

  // Convert DB data (UTC) to the application's timezone
  const zonedStartDate = toZonedTime(appointment.appointmentStartUTC, timeZone);
  const zonedEndTime = toZonedTime(appointment.appointmentEndUTC, timeZone);

  const formattedDateString = formatDateFns(zonedStartDate, "yyyy-MM-dd");
  const formattedTimeString = formatDateFns(zonedStartDate, "HH:mm");
  const formattedEndTimeString = formatDateFns(zonedEndTime, "HH:mm");

  // Prepare the data for the client component
  const appointmentDataForClient: AppointmentData = {
    appointmentId: appointment.appointmentId,
    doctorId: appointment.doctorId,
    doctorName: appointment.doctor.name ?? "N/A",
    doctorSpecilaity: appointment.doctor.doctorProfile?.specialty ?? "General",
    doctorImage: appointment.doctor.image,
    date: formattedDateString,
    timeSlot: formattedTimeString,
    endTime: formattedEndTimeString,
    patientType: appointment.patientType,
    patientName: appointment.patientName ?? undefined,
    patientdateofbirth: appointment.patientdateofbirth,
    phoneNumber: appointment.phoneNumber,
    reasonForVisit: appointment.reasonForVisit,
    additionalNotes: appointment.additionalNotes,
    relationship: appointment.patientRelation,
  };

  const patientDetailsForClient: PatientData = {
    name: user.name ?? "",
    email: user.email ?? "",
    phoneNumber: user.phoneNumber ?? "",
    dateOfBirth: user.dateofbirth
      ? user.dateofbirth.toISOString().split("T")[0]
      : "",
  };

  return (
    <PatientDetailsClient
      initialAppointmentData={appointmentDataForClient}
      initialPatientDetails={patientDetailsForClient}
    />
  );
}

//fetch the appointment data using getAppointmentData server action

//Authorization check - it should be either a valid user - user id from appointment is the same as the user id from the session object
//  or a valid guest - guestIdentifier (from URL) === the guestIdentifier from the appointment

//If applicable update the guest appointment with updateGuestAppointmentWithUser Server action

//query from the user table the details needed for Patient Data

//the data objects from the db are in UTC - need to convert to the application timezone
