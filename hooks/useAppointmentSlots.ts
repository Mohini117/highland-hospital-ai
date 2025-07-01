import { useState, useCallback, useEffect } from "react";
import { getAppTimeZone } from "@/lib/config";
import { toZonedTime, format } from "date-fns-tz";
import { getAvailableDoctorSlots } from "@/lib/actions/doctor.actions";
import { getPendingAppointmentForDoctor } from "@/lib/actions/appointment.actions";
import { TimeSlot } from "@/types";
import { toast } from "react-hot-toast";

export const useAppointmentSlots = (doctorId: string, userId?: string) => {
  // --- State Management ---

  // The currently selected date for viewing slots.
  const [date, setDate] = useState<Date | undefined>(new Date());
  // List of available time slots for the selected `date`.
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  // If the user has a pending appointment, this holds its start time.
  const [initialTimeSlot, setInitialTimeSlot] = useState<string | null>(null);
  // Loading flag for UI feedback during data fetching.
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // --- Core Logic ---

  /**
   * Fetches available time slots for a given date by calling the server action.
   * @param {Date} dateToFetch - The date for which to fetch slots.
   */
  const fetchSlotsForDate = useCallback(
    async (dateToFetch: Date) => {
      setIsLoading(true);
      try {
        const dateString = format(dateToFetch, "yyyy-MM-dd");
        const response = await getAvailableDoctorSlots({
          doctorId,
          date: dateString,
          currentUserId: userId,
        });

        if (response.success && response.data) {
          setTimeSlots(response.data);
        } else {
          // Reset slots and show an error toast if the fetch fails
          setTimeSlots([]);
          toast.error(response.message || "Could not load appointment slots.");
        }
      } catch (error) {
        console.error("Failed to fetch slots:", error);
        setTimeSlots([]);
        toast.error("An unexpected error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [doctorId, userId] // Dependencies for the callback
  );

  /**
   * This effect runs on initial component mount to determine the
   * starting date and fetch the first set of slots.
   */
  useEffect(() => {
    // A cleanup flag to prevent state updates on an unmounted component.
    let isMounted = true;

    const initialize = async () => {
      setIsLoading(true);

      let effectiveDate = new Date(); // Default to today
      let pendingSlot: string | null = null;

      // 1. Check for a pending appointment if a user is logged in.
      if (userId) {
        try {
          const response = await getPendingAppointmentForDoctor({
            userId,
            doctorId,
          });

          if (isMounted && response.success && response.data?.appointment) {
            const { date: pendingDate, startTime } = response.data.appointment;
            // Override defaults if a pending appointment is found.
            effectiveDate = new Date(pendingDate);
            pendingSlot = startTime;
          }
        } catch (error) {
          // It's not critical if this fails; we can proceed with the default date.
          console.warn("Could not check for pending appointments:", error);
        }
      }

      // If the component is still mounted after async operations:
      if (isMounted) {
        // 2. Set the determined date and initial time slot in state.
        setDate(effectiveDate);
        setInitialTimeSlot(pendingSlot);
        // 3. Fetch the slots for the determined effective date.
        await fetchSlotsForDate(effectiveDate);
      }
    };

    initialize();

    // 4. Cleanup function to run when the component unmounts.
    return () => {
      isMounted = false;
    };
  }, [doctorId, userId, fetchSlotsForDate]);

  // --- Return Values ---

  return {
    date,
    setDate,
    timeSlots,
    initialTimeSlot,
    isLoading,
    fetchSlotsForDate, // Expose for manual refetching
  };
};
