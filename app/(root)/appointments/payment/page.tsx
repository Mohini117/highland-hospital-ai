import { redirectToErrorPage } from "@/lib/config";
import { getAppTimeZone } from "@/lib/config";
import { auth } from "@/auth";
import PaymentClient from "./payment-client";
import { AppointmentDataWithBilling } from "@/types";
import { getAppointmentData } from "@/lib/actions/appointment.actions";
import { prisma } from "@/db/prisma";
import { format as formatDateFns } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface SearchParams {
  appointmentId: string;
}

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { appointmentId } = await searchParams;
  if (!appointmentId) {
    redirectToErrorPage(
      "MISSING_PARAMS",
      "There was an issue with your Appointment. Please try again"
    );
  }

  const timeZone = getAppTimeZone();
  const session = await auth();
  const userId = session?.user?.id;

  //getAppointmentData server action
  const appointmentActionResponse = await getAppointmentData({ appointmentId });

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

  if (appointment.userId && appointment.userId !== session?.user.id) {
    redirectToErrorPage(
      "USER_MISMATCH",
      "Something went wrong. Please try again"
    );
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
    },
  });

  // Convert DB data (UTC) to the application's timezone
  const zonedStartDate = toZonedTime(appointment.appointmentStartUTC, timeZone);
  const zonedEndTime = toZonedTime(appointment.appointmentEndUTC, timeZone);

  const formattedDateString = formatDateFns(zonedStartDate, "yyyy-MM-dd");
  const formattedTimeString = formatDateFns(zonedStartDate, "HH:mm");
  const formattedEndTimeString = formatDateFns(zonedEndTime, "HH:mm");

  // Prepare the data for the client component
  //Prepare data for PaymentClient

  const appointmentData: AppointmentDataWithBilling = {
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
    fee: 150,
    patientEmail: user?.email || "",
  };

  const paypalClientId = process.env.PAYPAL_CLIENT_ID;

  if (!paypalClientId) {
    return (
      <div className="text-alert-2 text-center my-4">
        Payment gateway is not configured. Please contact support
      </div>
    );
  }

  return (
    <PaymentClient
      appointmentData={appointmentData}
      paypalClientId={paypalClientId}
    />
  );
}
