"use client";

import { format, parseISO } from "date-fns";
import { LeaveType } from "@/lib/generated/prisma";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface LeaveEditorProps {
  modifiedLeaveDates: { date: string; type: LeaveType | "WORKING" }[];
  onLeaveTypeChange: (
    dateStr: string,
    newType: LeaveType | "WORKING" | "REMOVE"
  ) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isConflictPresent: boolean;
}

export const LeaveEditor = ({
  modifiedLeaveDates,
  onLeaveTypeChange,
  onSubmit,
  isSubmitting,
  isConflictPresent,
}: LeaveEditorProps) => {
  if (modifiedLeaveDates.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
        Select dates on the calendar to mark as leave or working.
      </div>
    );
  }

  return (
    <div className="bg-background-1 p-4 md:p-6 rounded-lg dark:border-gray-600">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 text-base">
        Modified Leave Dates
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {modifiedLeaveDates.map(({ date, type }) => (
          <div key={date} className="flex items-center justify-between ...">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {format(parseISO(date), "MMM dd, yyyy")}
            </span>
            <Select
              value={type}
              onValueChange={(value: LeaveType | "WORKING" | "REMOVE") =>
                onLeaveTypeChange(date, value)
              }
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-[155px] h-9 text-xs">
                <SelectValue placeholder="Set Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LeaveType.FULL_DAY}>
                  Full Day Leave
                </SelectItem>
                <SelectItem value={LeaveType.MORNING}>
                  First Half Leave
                </SelectItem>
                <SelectItem value={LeaveType.AFTERNOON}>
                  Second Half Leave
                </SelectItem>
                <SelectItem value={"WORKING"}>Working Day</SelectItem>
                <SelectItem value={"REMOVE"} className="text-red-600">
                  Revert Changes
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || isConflictPresent}
          className={isConflictPresent ? "bg-alert-3 cursor-not-allowed" : ""}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
            </>
          ) : isConflictPresent ? (
            "Resolve Conflicts"
          ) : (
            "Submit Leave Updates"
          )}
        </Button>
      </div>
    </div>
  );
};
