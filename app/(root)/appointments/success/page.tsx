import { getAppTimeZone } from "@/lib/config";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { getConfirmationDetails } from "@/lib/actions/appointment.actions";

import { AlertCircle, Info, Check } from "lucide-react";
import Link from "next/link";
import { AppointmentStatus } from "@/lib/generated/prisma";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface SearchParams {
  appointmentId?: string;
}

function formatBookingId(aptId: string): string {
  const datePart = format(new Date(), "yyyyMMdd"); //20250807
  const apptEnd = aptId.slice(-4).toUpperCase();
  return `HH-${datePart}-${apptEnd}`;
}

export default async function Success({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { appointmentId } = await searchParams;
  const timeZone = getAppTimeZone();
  if (!appointmentId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Invalid Request
        </h1>
        <p className="text-gray-600">
          No appointment ID was provided. Please go back to the homepage.
        </p>
        <Link href="/">
          <button className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            Go To Homepage
          </button>
        </Link>
      </div>
    );
  }

  // 2. Fetch confirmation details
  const response = await getConfirmationDetails(appointmentId);

  // 3. Handle fetch errors or unsuccessful responses
  if (!response.success || !response.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Something Went Wrong
        </h1>
        <p className="text-gray-600">
          {response.message ||
            "We couldn't retrieve your appointment details. Please try again later."}
        </p>
        <Link href="/">
          <button className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            Go To Homepage
          </button>
        </Link>
      </div>
    );
  }

  const { appointment, doctor, transaction } = response.data;
  const isCashPayment = appointment.status === AppointmentStatus.CASH;

  // Convert UTC date to the application's timezone
  const zonedTime = toZonedTime(appointment.startDateTime, timeZone);

  return (
    <div className="w-full max-w-[768px] mx-auto bg-background mt-[15px] mb-[15px]">
      {/* Header Section */}
      <div className="text-center pt-8 pb-8">
        {/* <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" /> */}
        <div className="w-16 h-16 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="text-green-600 w-8 h-8" />
        </div>
        <h2 className="text-text-title">
          {isCashPayment ? "Appointment Confirmed" : "Payment Successful"}
        </h2>
        <p className="mt-2 body-regular text-text-body-subtle">
          {isCashPayment
            ? "Please arrive at the counter 30 min before your appointment to make the payment."
            : "Your appointment has been confirmed"}
        </p>
      </div>
      <Separator className="bg-border-2" />

      <div className="p-6 space-y-6">
        {/* Booking Details Section (Conditional) */}
        {!isCashPayment && transaction && (
          <div className="p-4 rounded-lg bg-primary-subtle">
            <div className="flex justify-between mb-4 ">
              <div className="body-semibold text-text-title">
                Booking Details
              </div>
              <div className="body-small">{formatBookingId(appointmentId)}</div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="body-small text-text-body-subtle">
                  Payment ID
                </div>
                <div className="body-small text-text-title">
                  {transaction.gatewayTransactionId}
                </div>
              </div>
              <div className="flex justify-between">
                <div className="body-small text-text-body-subtle">
                  Amount Paid
                </div>
                <div className="body-small text-text-title">
                  {transaction.amount.toFixed(2)} {transaction.currency}
                </div>
              </div>
              <div className="flex justify-between">
                <div className="body-small text-text-body-subtle">
                  Payment Method
                </div>
                <div className="body-small text-text-title">
                  {transaction.paymentGateway}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appointment Information Section */}
        <div className="p-4 rounded-lg bg-primary-subtle">
          <div className="body-semibold text-text-title mb-4">
            Appointment Information
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="body-small text-text-body-subtle">
                Date & Time
              </div>
              <div className="body-small text-text-title">
                {`${format(zonedTime, "MMMM dd, yyyy")} at ${format(
                  zonedTime,
                  "hh:mm a"
                )}`}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="body-small text-text-body-subtle">Doctor</div>
              <div className="body-small text-text-title">{doctor.name}</div>
            </div>
            <div className="flex justify-between">
              <div className="body-small text-text-body-subtle">Speciality</div>
              <div className="body-small text-text-title">
                {doctor.speciality}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="body-small text-text-body-subtle">Visit Type</div>
              <div className="body-small text-text-title capitalize">
                {appointment.reason?.replace(/_/g, " ").toLowerCase() ||
                  "Regular Checkup"}
              </div>
            </div>
          </div>
        </div>

        {/* Patient Details Section */}
        <div className="p-4 rounded-lg bg-primary-subtle">
          <div className="body-semibold text-text-title mb-4">
            Patient Details
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="body-small text-text-body-subtle">Name</div>
              <div className="body-small text-text-title">
                {appointment.patientName}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="body-small text-text-body-subtle">Email</div>
              <div className="body-small text-text-title">
                {appointment.patientEmail}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="body-small text-text-body-subtle">Phone</div>
              <div className="body-small text-text-title">
                {appointment.patientPhone}
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Instructions Section */}
        <div className="flex p-4 rounded-lg bg-primary-subtle">
          <div className="flex-shrink-0 mt-[3px]">
            <Info className="h-5 w-5 text-blue-500" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <div className=" body-semibold text-alert-1 mb-1">
              Appointment Instructions
            </div>
            <div className="mt-2 body-small text-notice-1">
              <ul className="space-y-1">
                <li>
                  {isCashPayment
                    ? "Please arrive 30 min before your scheduled time to complete the payment at the counter."
                    : "Please arrive 15 minutes before your scheduled time."}
                </li>
                <li>Bring any relevant medical records or test reports.</li>
                <li>Wear a mask during your visit.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <Button
            variant="outline"
            className="flex-1 text-xs md:text-sm text-text-body font-normal"
            asChild
          >
            <Link href="/user/profile">View Appointment</Link>
          </Button>
          <Button
            variant="brand"
            className="flex-1 text-xs md:text-sm font-bold text-text-caption-2"
            asChild
          >
            <Link href="/">Go to Homepage</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
