"use client";

import { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "react-hot-toast";
import { LeaveType, AppointmentStatus } from "@/lib/generated/prisma";
import { getDoctorAppointmentsForDate } from "@/lib/actions/admin.actions";
import { LeaveEntry } from "./useLeaveState";

// Types needed by this hook
export interface AppointmentDetail {
  id: string;
  time: string;
  patientName: string | null;
  bookedByName?: string | null;
  phoneNumber: string | null;
  email: string | null;
  status: AppointmentStatus;
}

type AppointmentFetchStatus =
  | AppointmentDetail[]
  | "loading"
  | "error"
  | "none"
  | "idle";

// This helper function is used to determine conflicts
function checkTimeConflict(apptTime: string, leaveType: LeaveType): boolean {
  if (leaveType === LeaveType.FULL_DAY) return true;
  const timeParts = apptTime.match(/(\d+):(\d+)\s*(am|pm)?/i);
  if (!timeParts) return false;
  let apptHour = parseInt(timeParts[1], 10);
  const isPM = timeParts[3]?.toLowerCase() === "pm";
  if (isPM && apptHour !== 12) apptHour += 12;
  else if (isPM && apptHour === 12) apptHour = 12; // Noon
  else if (apptHour === 12) apptHour = 0; // Midnight
  const morningCutoff = 13; // 1 PM is the start of the afternoon
  if (leaveType === LeaveType.MORNING && apptHour < morningCutoff) return true;
  if (leaveType === LeaveType.AFTERNOON && apptHour >= morningCutoff)
    return true;
  return false;
}

export const useAppointmentConflicts = (
  datesToFetch: string[],
  leaveEntries: Record<string, LeaveEntry>,
  doctorId: string
) => {
  const [appointmentsByDate, setAppointmentsByDate] = useState<
    Record<string, AppointmentFetchStatus>
  >({});

  useEffect(() => {
    // Fetches data for a single date
    const fetchAppointments = async (dateStr: string) => {
      setAppointmentsByDate((prev) => ({ ...prev, [dateStr]: "loading" }));
      try {
        const result = await getDoctorAppointmentsForDate(doctorId, dateStr);
        if (result.success) {
          const appts = result.data?.appointments || [];
          setAppointmentsByDate((prev) => ({
            ...prev,
            [dateStr]: appts.length > 0 ? appts : "none",
          }));
        } else {
          throw new Error(result.message || "Failed to fetch appointments.");
        }
      } catch (error) {
        console.error(`Fetch error for ${dateStr}:`, error);
        toast.error(
          `Error fetching appointments for ${format(
            parseISO(dateStr),
            "MMM dd"
          )}.`
        );
        setAppointmentsByDate((prev) => ({ ...prev, [dateStr]: "error" }));
      }
    };

    // Iterate over the dates and fetch only if they haven't been fetched yet
    datesToFetch.forEach((dateStr) => {
      if (
        !appointmentsByDate[dateStr] ||
        appointmentsByDate[dateStr] === "idle"
      ) {
        fetchAppointments(dateStr);
      }
    });
  }, [datesToFetch, doctorId]); // Effect runs only when the list of dates to fetch changes

  // Memoized derived state to check if any conflicts exist
  const isConflictPresent = useMemo(() => {
    return Object.entries(leaveEntries).some(([dateStr, entry]) => {
      if (entry.type === "WORKING") return false;
      const status = appointmentsByDate[dateStr];
      if (Array.isArray(status)) {
        return status.some((appt) =>
          checkTimeConflict(appt.time, entry.type as LeaveType)
        );
      }
      return false;
    });
  }, [leaveEntries, appointmentsByDate]);

  return { appointmentsByDate, isConflictPresent, checkTimeConflict };
};
