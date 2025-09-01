"use client";

import { useState, useMemo } from "react";
import { format, startOfDay, parseISO } from "date-fns";
import { toast } from "react-hot-toast";
import { LeaveType } from "@/lib/generated/prisma";
import { InitialLeave } from "@/types";

// This interface is the core state for each date entry
export interface LeaveEntry {
  type: LeaveType | "WORKING";
  isModified: boolean;
}

const startOfToday = startOfDay(new Date());

// Helper to set up the initial state from props
const initializeLeaveEntries = (
  initialLeaves: InitialLeave[]
): Record<string, LeaveEntry> => {
  const entries: Record<string, LeaveEntry> = {};
  initialLeaves.forEach((leave) => {
    try {
      const dateKey = format(parseISO(leave.date), "yyyy-MM-dd");
      entries[dateKey] = { type: leave.type, isModified: false };
    } catch (e) {
      console.error(`Invalid initial leave date format: ${leave.date}`, e);
    }
  });
  return entries;
};

export const useLeaveState = (initialLeaves: InitialLeave[]) => {
  const [leaveEntries, setLeaveEntries] = useState<Record<string, LeaveEntry>>(
    () => initializeLeaveEntries(initialLeaves)
  );
  // State to track the single selected date for calendar highlighting
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<
    Date | undefined
  >();

  // Memoized derived state: list of dates modified in this session
  const modifiedLeaveDates = useMemo(
    () =>
      Object.entries(leaveEntries)
        .filter(
          ([date, entry]) => entry.isModified && parseISO(date) >= startOfToday
        )
        .map(([date, entry]) => ({ date, type: entry.type }))
        .sort(
          (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
        ),
    [leaveEntries]
  );

  // Memoized derived state: list of future leave dates to fetch appointments for
  const futureLeaveDatesForFetch = useMemo(
    () =>
      Object.entries(leaveEntries)
        .filter(
          ([dateStr, entry]) =>
            entry.type !== "WORKING" && parseISO(dateStr) >= startOfToday
        )
        .map(([dateStr]) => dateStr),
    [leaveEntries]
  );

  const handleDateSelect = (_days: Date[] | undefined, selectedDay: Date) => {
    const normalizedDay = startOfDay(selectedDay);

    if (normalizedDay.getDay() === 0) {
      // Sunday check
      toast.error("Sundays are not selectable.");
      return;
    }
    if (normalizedDay < startOfToday) {
      toast.error("Cannot select past dates.");
      return;
    }

    const dateStr = format(normalizedDay, "yyyy-MM-dd");
    const currentEntry = leaveEntries[dateStr];

    setLeaveEntries((prev) => {
      const next = { ...prev };
      const initialEntry = initialLeaves.find(
        (l) => format(parseISO(l.date), "yyyy-MM-dd") === dateStr
      );

      // If the date is already modified, clicking it again reverts the change
      if (currentEntry?.isModified) {
        if (initialEntry) {
          next[dateStr] = { type: initialEntry.type, isModified: false };
        } else {
          delete next[dateStr]; // It was not an initial leave, so remove it
        }
        setSelectedCalendarDate(undefined);
      } else {
        // Otherwise, mark it as a modified Full Day Leave by default
        next[dateStr] = { type: LeaveType.FULL_DAY, isModified: true };
        setSelectedCalendarDate(normalizedDay);
      }
      return next;
    });
  };

  const handleLeaveTypeChange = (
    dateStr: string,
    newType: LeaveType | "WORKING" | "REMOVE"
  ) => {
    setLeaveEntries((prev) => {
      const next = { ...prev };
      const initialEntry = initialLeaves.find(
        (l) => format(parseISO(l.date), "yyyy-MM-dd") === dateStr
      );

      if (newType === "REMOVE") {
        if (initialEntry) {
          // Revert to its original state
          next[dateStr] = { type: initialEntry.type, isModified: false };
        } else {
          // It had no original state, so delete it
          delete next[dateStr];
        }
      } else {
        // Set the new type and ensure it's marked as modified
        next[dateStr] = { type: newType, isModified: true };
      }
      return next;
    });
  };

  // Resets the 'isModified' flag on all entries after a successful submission
  const resetModifications = () => {
    setLeaveEntries((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key].isModified) {
          next[key].isModified = false;
        }
      });
      return next;
    });
    setSelectedCalendarDate(undefined);
  };

  return {
    leaveEntries,
    selectedCalendarDate,
    modifiedLeaveDates,
    futureLeaveDatesForFetch,
    handleDateSelect,
    handleLeaveTypeChange,
    resetModifications,
  };
};
