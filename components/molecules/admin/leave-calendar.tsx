"use client";

import { format, startOfDay } from "date-fns";
import { LeaveType } from "@/lib/generated/prisma";
import { Calendar } from "@/components/ui/calendar";
import { LeaveEntry } from "@/hooks/useLeaveState";

interface LeaveCalendarProps {
  leaveEntries: Record<string, LeaveEntry>;
  selectedDates: Date[] | undefined;
  onSelect: (days: Date[] | undefined, selectedDay: Date) => void;
}

const startOfToday = startOfDay(new Date());

export const LeaveCalendar = ({
  leaveEntries,
  selectedDates,
  onSelect,
}: LeaveCalendarProps) => {
  return (
    <Calendar
      mode="multiple"
      max={1}
      selected={selectedDates}
      onSelect={onSelect}
      className="rounded-lg border border-gray-200 shadow-sm bg-white"
      modifiers={{
        fullDayLeave: (d) =>
          leaveEntries[format(d, "yyyy-MM-dd")]?.type === LeaveType.FULL_DAY,
        morningLeave: (d) =>
          leaveEntries[format(d, "yyyy-MM-dd")]?.type === LeaveType.MORNING,
        afternoonLeave: (d) =>
          leaveEntries[format(d, "yyyy-MM-dd")]?.type === LeaveType.AFTERNOON,
        working: (d) =>
          leaveEntries[format(d, "yyyy-MM-dd")]?.type === "WORKING",
        modified: (d) =>
          leaveEntries[format(d, "yyyy-MM-dd")]?.isModified || false,
        disabled: (d) => startOfDay(d) < startOfToday || d.getDay() === 0,
        today: new Date(),
      }}
      modifiersClassNames={{
        fullDayLeave: "bg-red-100 text-red-900 ",
        morningLeave: "bg-orange-100 text-orange-900 ",
        afternoonLeave: "bg-yellow-100 text-yellow-900 ",
        working: "bg-gray-100 text-gray-700  opacity-80",
        modified: "bg-blue-100 text-blue-900 rounded-md font-bold",
        selected: "!bg-opacity-0 !text-current", // Keeps other styles on selected day
        today: "border-2 border-green-500",
        disabled: "text-gray-400 opacity-50 cursor-not-allowed",
      }}
      disabled={(date) =>
        startOfDay(date) < startOfToday || date.getDay() === 0
      }
      startMonth={startOfToday}
    />
  );
};
