import { useTransition } from "react";
import {
  createGuestAppointment,
  createOrUpdateAppointmentReservation,
} from "@/lib/actions/appointment.actions";
import { useRouter } from "next/navigation";
import {
  ServerActionResponse,
  GuestAppointmentSuccessData,
  ReservationSuccessData,
} from "@/types";
import { toast } from "react-hot-toast";

interface HookProps {
  userId?: string;
  onConflict: () => void;
}

interface ReservationPayload {
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export const useAppointmentReservation = ({
  userId,
  onConflict,
}: HookProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const mutate = (payload: ReservationPayload) => {
    startTransition(async () => {
      toast.dismiss();
      try {
        let response: ServerActionResponse<
          GuestAppointmentSuccessData | ReservationSuccessData
        >;

        // Decide which server action to call based on user authentication status
        if (userId) {
          // Authenticated user flow
          response = await createOrUpdateAppointmentReservation({
            ...payload,
            userId,
          });
        } else {
          // Guest user flow
          response = await createGuestAppointment(payload);
        }

        // Handle the server action response
        if (response.success && response.data) {
          toast.success(response.message || "Slot reserved successfully!");

          // Construct the redirection URL
          const params = new URLSearchParams({
            appointmentId: response.data.appointmentId,
          });

          // For guest users, append the guestIdentifier to the URL
          if (!userId && "guestIdentifier" in response.data) {
            params.append("guestIdentifier", response.data.guestIdentifier);
          }

          // Navigate to the patient details page
          router.push(`/appointments/patient-details?${params.toString()}`);
        } else {
          // Handle failure
          toast.error(response.error || "An unknown error occurred.");

          // If the error is a slot conflict, invoke the callback
          if (response.errorType === "SLOT_UNAVAILABLE") {
            onConflict();
          }
        }
      } catch (error) {
        toast.error("An unexpected error occured. Please try again later");
      }
    });
  };

  return {
    mutate,
    isPending,
  };
};
