"use client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useAppointmentSlots } from "@/hooks/useAppointmentSlots";
import { useAppointmentReservation } from "@/hooks/useAppointmentReservation";
import { useState, useEffect } from "react";
import { TimeSlot } from "@/types";
import { startOfMonth, addMonths, startOfDay, isAfter } from "date-fns";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface AppointmentSchedulerProps {
  doctorId: string;
  userId?: string;
  userRole?: string;
}
export default function AppointmentScheduler({
  doctorId,
  userId,
  userRole,
}: AppointmentSchedulerProps) {
  //userId = "b914f2c1-9cc0-4f35-8c8c-34282aa43e56";
  console.log(userRole);
  // 1. Core hook for managing slots data and state
  const {
    date: selectedDate,
    setDate,
    timeSlots,
    initialTimeSlot,
    isLoading,
    fetchSlotsForDate,
  } = useAppointmentSlots(doctorId, userId);

  const { mutate: reserveApointment, isPending } = useAppointmentReservation({
    userId,
    onConflict: () => {
      setSelectedSlot(null);
      if (selectedDate) fetchSlotsForDate(selectedDate);
    },
  });

  // 2. Local state for UI interaction
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [outOfRangeMessage, setOutOfRangeMessage] = useState<string | null>(
    null
  );

  // 3. Effect to sync local state with hook's initial data
  // This runs when the initial pending appointment data is loaded.
  useEffect(() => {
    if (initialTimeSlot && timeSlots.length > 0) {
      const slotToSelect = timeSlots.find(
        (slot) => slot.startTime === initialTimeSlot
      );
      setSelectedSlot(slotToSelect || null);
    }
  }, [initialTimeSlot, timeSlots]);

  // This ensures the calendar displays the correct month when a pending
  // appointment date is loaded by the hook.
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

  // 4. Handlers for user interaction
  const handleReservation = () => {
    // Ensure a date and slot are selected before proceeding.
    // The button's disabled state should prevent this, but it's a good safeguard.
    if (!selectedDate || !selectedSlot) {
      console.error("A date and time slot must be selected.");
      return;
    }
    // Call the mutate function from the useAppointmentReservation hook
    // with the required payload.
    reserveApointment({
      doctorId,
      date: format(selectedDate, "yyyy-MM-dd"), // Format date to YYYY-MM-DD
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setDate(date);
      // Reset selected slot when the date changes
      setSelectedSlot(null);
      fetchSlotsForDate(date);
    }
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
    if (isAfter(startOfMonth(month), toDate)) {
      setDate(undefined);
      setSelectedSlot(null);
      setOutOfRangeMessage("This is too far in the future");
    } else {
      // As requested, select the first day of the new month automatically
      setOutOfRangeMessage(null);
      const firstOfMonth = startOfMonth(month);

      const today = startOfDay(new Date());

      const dateToSelect = firstOfMonth < today ? today : firstOfMonth;

      setDate(dateToSelect);
      setSelectedSlot(null);
      fetchSlotsForDate(dateToSelect);
    }
  };

  // Define the valid date range for the calendar
  const today = new Date();
  //const fromDate = today;
  const toDate = addMonths(today, 2);

  const getButtonText = () => {
    if (userRole === "ADMIN") return "Admins cannot Book";
    return "Continue to Next Step";
  };

  return (
    <div className="bg-background p-6 rounded-lg shadow-small max-w-md mx-auto md:flex-1">
      <h3 className="text-text-title mb-3">Schedule Appointment</h3>
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          month={currentMonth}
          onMonthChange={handleMonthChange}
          disabled={
            (date) =>
              date < new Date(new Date().setDate(new Date().getDate() - 1)) || // Disable past dates
              date.getDay() === 0 || // Disable Sundays
              date > toDate // Disable dates after 2 months
          }
          className="rounded-md border border-border"
          classNames={{ day: "focus-visible:ring-0" }}
        />
      </div>

      <div className="mt-[20px] ">
        <div className="body-semibold text-text-title mb-3">
          Available Time Slots
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        ) : outOfRangeMessage ? (
          <div className="text-center text-grey-500 rounded-md p-4 bg-gray-50">
            {outOfRangeMessage}
          </div>
        ) : timeSlots.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {timeSlots.map((slot) => (
              <Button
                key={slot.startTime}
                variant={
                  selectedSlot?.startTime === slot.startTime
                    ? "brand"
                    : "outline"
                }
                onClick={() => setSelectedSlot(slot)}
                className={cn(
                  "w-full py-2 px-4 border border-border-2 body-small-bold",
                  {
                    "text-text-caption-2":
                      selectedSlot?.startTime === slot.startTime,
                    "text-text-body":
                      selectedSlot?.startTime !== slot.startTime,
                  }
                )}
              >
                {slot.startTime}
              </Button>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 bg-gray-50 p-4 rounded-md">
            No available slots for this day.
          </div>
        )}
      </div>

      <div className="mt-6">
        <Button
          onClick={handleReservation}
          disabled={!selectedSlot || isLoading || userRole === "ADMIN"}
          className="w-full py-6 body-semibold text-text-caption-2 mb-20"
        >
          {isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
          {getButtonText()}
        </Button>
      </div>
    </div>
  );
}
