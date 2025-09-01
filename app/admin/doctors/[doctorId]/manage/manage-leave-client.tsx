"use client";

import React, { useTransition, useRef } from "react";
import { startOfDay, parseISO } from "date-fns";
import { toast } from "react-hot-toast";
import { LeaveType } from "@/lib/generated/prisma";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { updateDoctorLeave } from "@/lib/actions/admin.actions";
import { InitialLeave } from "@/types";
import { AdminDoctorDataSimple as DoctorData } from "@/types";

// Local Hooks
import { useLeaveState } from "@/hooks/useLeaveState";
import { useAppointmentConflicts } from "@/hooks/useAppointmentConflicts";

// Child Components
import { LeaveCalendar } from "@/components/molecules/admin/leave-calendar";
import { ConflictDisplay } from "@/components/molecules/admin/conflict-display";
import { LeaveEditor } from "@/components/molecules/admin/leave-editor";
import { LeaveLegend } from "@/components/molecules/admin/leave-legend";

interface ManageLeaveClientProps {
  doctor: DoctorData;
  initialLeaves: InitialLeave[];
}

const startOfToday = startOfDay(new Date());

export default function ManageLeaveClient({
  doctor,
  initialLeaves,
}: ManageLeaveClientProps) {
  const [isPending, startTransition] = useTransition();
  const toastIdRef = useRef<string | null>(null);

  const {
    leaveEntries,
    selectedCalendarDate,
    modifiedLeaveDates,
    futureLeaveDatesForFetch,
    handleDateSelect,
    handleLeaveTypeChange,
    resetModifications,
  } = useLeaveState(initialLeaves);

  const { appointmentsByDate, isConflictPresent, checkTimeConflict } =
    useAppointmentConflicts(futureLeaveDatesForFetch, leaveEntries, doctor.id);

  const handleSubmit = () => {
    if (isConflictPresent) {
      toast.error("Cannot submit. Resolve appointment conflicts first.");
      return;
    }

    if (toastIdRef.current) toast.dismiss(toastIdRef.current);
    toastIdRef.current = toast.loading("Updating leave schedule...");

    startTransition(async () => {
      const changedLeaves: Record<string, LeaveType | "WORKING"> = {};
      Object.entries(leaveEntries).forEach(([dateStr, entry]) => {
        if (entry.isModified && parseISO(dateStr) >= startOfToday) {
          changedLeaves[dateStr] = entry.type;
        }
      });

      try {
        const result = await updateDoctorLeave(doctor.id, changedLeaves);
        if (result.success) {
          toast.success(result.message || "Leave updated successfully!", {
            id: toastIdRef.current ?? undefined,
          });
          resetModifications();
        } else {
          throw new Error(result.message || "Failed to update leave.");
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred.";
        toast.error(message, { id: toastIdRef.current ?? undefined });
        console.error("Error calling updateDoctorLeave:", error);
      }
    });
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 ">
            {doctor.name || "Doctor"} - Leave Management
          </h1>
        </div>
      </div>

      <div className="bg-white  rounded-xl shadow border border-gray-200  p-6">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6 justify-start">
            <LeaveCalendar
              leaveEntries={leaveEntries}
              selectedDates={
                selectedCalendarDate ? [selectedCalendarDate] : undefined
              }
              onSelect={handleDateSelect}
            />
            <LeaveLegend />
          </div>

          {isConflictPresent && (
            <ConflictDisplay
              appointmentsByDate={appointmentsByDate}
              leaveEntries={leaveEntries}
              checkTimeConflict={checkTimeConflict}
            />
          )}

          <LeaveEditor
            modifiedLeaveDates={modifiedLeaveDates}
            onLeaveTypeChange={handleLeaveTypeChange}
            onSubmit={handleSubmit}
            isSubmitting={isPending}
            isConflictPresent={isConflictPresent}
          />
        </div>
      </div>
    </div>
  );
}
