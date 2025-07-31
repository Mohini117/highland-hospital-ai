"use client";
import { AppointmentDataWithBilling } from "@/types";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, DollarSign, Loader2 } from "lucide-react";

import BookingSteps from "@/components/molecules/booking-steps";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import PayPalCheckoutButton from "./paypal-checkout-button";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { confirmCashAppointment } from "@/lib/actions/appointment.actions";
import { toast } from "react-hot-toast";
import { FaPaypal } from "react-icons/fa";

interface PaymentClientProps {
  appointmentData: AppointmentDataWithBilling;
  paypalClientId: string;
}

export default function PaymentClient({
  appointmentData,
  paypalClientId,
}: PaymentClientProps) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<"paypal" | "cash">(
    "paypal"
  );
  const [isTermsChecked, setIsTermsChecked] = useState(false);
  const [isNvigating, startNavigation] = useTransition();
  const [isProcessingCashPayment, setIsProcessingCashPayment] = useState(false);
  const [isNavigatingBack, startBackNavigation] = useTransition();

  const {
    appointmentId,
    doctorId,
    doctorName,
    doctorSpecilaity,
    date,
    timeSlot,
    patientName,
    patientdateofbirth,
    patientEmail,
    phoneNumber,
    additionalNotes,
    reasonForVisit,
    fee,
  } = appointmentData;

  const formattedDate = format(new Date(date), "MMMM dd, yyyy");
  const formattedDob = patientdateofbirth
    ? format(new Date(patientdateofbirth), "MM/dd/yyyy")
    : "N/A";
  const displayTime = new Date(`${date}T${timeSlot}`).toLocaleTimeString(
    "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // Using 24-hour format as in screenshot `12:30`
    }
  );

  const handleEditDetails = () => {
    startBackNavigation(() => {
      router.push(
        `/appointments/patient-details?appointmentId=${appointmentId}`
      );
    });
  };

  const handleCashPayment = () => {
    if (!isTermsChecked) {
      toast.error("Please agree to the terms to proceed");
      return;
    }
    setIsProcessingCashPayment(true);
    startNavigation(async () => {
      const toastId = toast.loading("Confirming your appointment...");

      try {
        const response = await confirmCashAppointment(appointmentId);

        if (response.success) {
          toast.success(response.message || "Appointment confirmed!", {
            id: toastId,
          });
          // Redirect on success
          router.push(`/appointments/success?appointmentId=${appointmentId}`);
        } else {
          // Show specific error from server (e.g., "Status Conflict")
          toast.error(response.message || "Failed to confirm appointment.", {
            id: toastId,
          });
        }
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again.", {
          id: toastId,
        });
        console.error("Cash payment confirmation failed:", error);
      } finally {
        setIsProcessingCashPayment(false);
      }
    });
  };

  const handlePaymentSuccess = () => {
    startNavigation(() => {
      router.push(
        `/appointments/success?appointmentId=${appointmentData.appointmentId}`
      );
    });
  };

  const isButtonDisabled =
    isProcessingCashPayment || isNvigating || isNavigatingBack;

  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalClientId,
        currency: "USD",
        intent: "capture",
        disableFunding: "card",
        dataNamespace: "paypal_sdk",
      }}
    >
      <div className="w-full max-w-[768px] mx-auto bg-background mt-[15px] mb-[15px]">
        <Link
          href={`/doctors/${doctorId}`}
          className="flex p-6 items-center body-small text-text-body-subtle hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1 text-text-body-subtle" />
          Back to Doctor Profile
        </Link>
        <Separator />
        <div className="pt-4 pb-4">
          <BookingSteps currentStep={3} />
        </div>

        <div className="p-6 rounded-lg space-y-6">
          {/* Appointment Details */}
          <div className="p-4 rounded-lg bg-primary-subtle space-y-2">
            <div className="body-semibold text-text-title">
              Appointment Details
            </div>
            <div className="flex justify-between">
              <div className="body-small text-text-body-subtle">
                Date & Time:
              </div>
              <div className="body-small text-text-title">{`${formattedDate} at ${displayTime}`}</div>
            </div>
            <div className="flex justify-between">
              <div className="body-small text-text-body-subtle">Doctor:</div>
              <div className="body-small text-text-title">{doctorName}</div>
            </div>
            <div className="flex justify-between">
              <div className="body-small text-text-body-subtle">Specialty:</div>
              <div className="body-small text-text-title">
                {doctorSpecilaity}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="body-small text-text-body-subtle">
                Visit Type:
              </div>
              <div className="body-small text-text-title">
                {reasonForVisit || "Regular Checkup"}
              </div>
            </div>
          </div>

          {/* Patient Information */}
          <div className="p-4 rounded-lg bg-primary-subtle space-y-2">
            <div className="body-semibold text-text-title">
              Patient Information
            </div>
            <div className="flex justify-between">
              <div className="body-small text-text-body-subtle">Name:</div>
              <div className="body-small text-text-title">{patientName}</div>
            </div>
            <div className="flex justify-between">
              <div className="body-small text-text-body-subtle">
                Date of Birth:
              </div>
              <div className="body-small text-text-title">{formattedDob}</div>
            </div>
            <div className="flex justify-between">
              <div className="body-small text-text-body-subtle">Email:</div>
              <div className="body-small text-text-title">{patientEmail}</div>
            </div>
            <div className="flex justify-between">
              <div className="body-small text-text-body-subtle">Phone:</div>
              <div className="body-small text-text-title">{phoneNumber}</div>
            </div>
          </div>

          {/* Additional Notes */}
          {additionalNotes && (
            <div className="p-4 rounded-lg bg-primary-subtle space-y-2">
              <div className="body-semibold text-text-title">
                Additional Notes
              </div>
              <p className="body-small text-text-title">{additionalNotes}</p>
            </div>
          )}

          {/* Payment Details */}
          <div className="p-4 rounded-lg bg-primary-subtle">
            <div className="body-semibold text-text-title mb-4">
              Payment Details
            </div>
            <div className="flex justify-between items-center text-sm mb-2">
              <p className="body-small text-text-body-subtle">
                Consultation Fee
              </p>
              <p className="body-small text-text-title">${fee.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center font-bold text-base">
              <p className="text-text-title body-small-bold">
                Total Amount Due
              </p>
              <p className="body-small text-text-body-subtle">
                ${fee.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <div className="body-semibold text-text-title mb-4">
              Select Payment Method
            </div>
            <RadioGroup
              defaultValue="paypal"
              value={paymentMethod}
              onValueChange={(value: "paypal" | "cash") =>
                setPaymentMethod(value)
              }
              className="space-y-2 gap-0"
              disabled={isButtonDisabled}
            >
              <Label
                htmlFor="cash"
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                  paymentMethod === "cash"
                    ? "border-primary bg-primary/5"
                    : "border-gray-300"
                }`}
              >
                <RadioGroupItem
                  value="cash"
                  id="cash"
                  className="mr-3"
                  disabled={isButtonDisabled}
                />
                <DollarSign className="w-5 h-5 mr-3 text-gray-600" />
                <span className="body-regular">Pay Cash at Counter</span>
              </Label>
              <Label
                htmlFor="paypal"
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                  paymentMethod === "paypal"
                    ? "border-primary bg-primary/5"
                    : "border-gray-300"
                }`}
              >
                <RadioGroupItem
                  value="paypal"
                  id="paypal"
                  className="mr-3"
                  disabled={isButtonDisabled}
                />
                {/* <CreditCard className="w-5 h-5 mr-3 text-gray-600" /> */}
                <FaPaypal className="h-6 w-6 text-primary" />
                <span className="body-regular">PayPal</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Terms and Footer */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="terms"
              checked={isTermsChecked}
              onCheckedChange={(checked) => setIsTermsChecked(Boolean(checked))}
              disabled={isButtonDisabled}
            />
            <Label
              htmlFor="terms"
              className="body-small text-text-title cursor-pointer"
            >
              I agree to the payment terms and cancellation policy. I understand
              that I can cancel or reschedule up to 24 hours before the
              appointment.
            </Label>
          </div>
        </div>
        <Separator />
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={handleEditDetails}
              disabled={isButtonDisabled}
              className="text-xs md:text-sm font-bold text-text-title"
            >
              Edit Details
            </Button>
            <div className="text-right">
              <p className="body-small text-text-body-subtle">Total Amount </p>
              <p className="body-regular text-text-title">${fee.toFixed(2)}</p>
            </div>
          </div>
          {/* <Button
              size="lg"
              onClick={handlePayment}
              disabled={!isTermsChecked}
              className="w-full sm:w-auto"
            >
              {paymentMethod === "paypal"
                ? "Pay with PayPal"
                : "Confirm & Pay at Counter"}
            </Button> */}
          {paymentMethod === "cash" && (
            <Button
              onClick={handleCashPayment}
              className="w-full h-11 text-base bg-primary hover:bg-primary/50"
              disabled={isButtonDisabled || !isTermsChecked}
            >
              {isProcessingCashPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  Processing...
                </>
              ) : isNvigating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  Redirecting...
                </>
              ) : (
                `Pay ${appointmentData.fee.toFixed(2)} with Cash`
              )}
            </Button>
          )}
          {paymentMethod === "paypal" && (
            <PayPalCheckoutButton
              appointmentId={appointmentData.appointmentId}
              disabled={!isTermsChecked || isButtonDisabled}
              onSuccess={handlePaymentSuccess}
            />
          )}
        </div>
      </div>
    </PayPalScriptProvider>
  );
}
