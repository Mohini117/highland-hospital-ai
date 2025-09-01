"use client";

import { format, parseISO } from "date-fns";
import { LeaveType } from "@/lib/generated/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import { LeaveEntry } from "@/hooks/useLeaveState";
import { AppointmentDetail } from "@/hooks/useAppointmentConflicts";

interface ConflictDisplayProps {
  appointmentsByDate: Record<
    string,
    AppointmentDetail[] | "loading" | "error" | "none" | "idle"
  >;
  leaveEntries: Record<string, LeaveEntry>;
  checkTimeConflict: (time: string, type: LeaveType) => boolean;
}
// "idle": No attempt has been made to fetch data yet.
// "loading": The request is in progress.
// "error": The request failed.
// "none": The request was successful, but there are no appointments for that day.
// AppointmentDetail[]: The request was successful and returned appointments.

export const ConflictDisplay = ({
  appointmentsByDate,
  leaveEntries,
  checkTimeConflict,
}: ConflictDisplayProps) => {
  // Filter for dates that have potential conflicts and sort them chronologically
  const conflictingDates = Object.entries(appointmentsByDate)
    .filter(([dateStr, status]) => {
      const entry = leaveEntries[dateStr];
      if (!entry || entry.type === "WORKING" || !Array.isArray(status)) {
        return false;
      }
      // A date is considered for display if it has at least one appointment that conflicts with the leave schedule
      return status.some((appt: AppointmentDetail) =>
        checkTimeConflict(appt.time, entry.type as LeaveType)
      );
    })
    .sort(
      ([dateA], [dateB]) =>
        parseISO(dateA).getTime() - parseISO(dateB).getTime()
    );

  if (conflictingDates.length === 0) {
    return null; // Don't render anything if there are no conflicts
  }

  return (
    <div className="space-y-6">
      {conflictingDates.map(([dateStr, appointments]) => {
        const currentEntry = leaveEntries[dateStr];
        // This check is slightly redundant due to filtering above, but serves as a safeguard
        if (!currentEntry || currentEntry.type === "WORKING") return null;

        return (
          <div key={dateStr} className="bg-background-1 p-4 md:p-6 rounded-lg">
            <h3 className="font-semibold text-gray-900  mb-4 text-base">
              Appointments for {format(parseISO(dateStr), "MMMM dd, yyyy")}
              <span className="text-sm font-normal text-gray-600 ">
                {" "}
                (Leave: {currentEntry.type.replace("_", " ")})
              </span>
            </h3>
            <div className="overflow-x-auto rounded-md mb-4">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="bg-background hover:bg-gray-200">
                    <TableHead className="px-4 py-2.5 text-gray-600  font-medium whitespace-nowrap">
                      Time
                    </TableHead>
                    <TableHead className="px-4 py-2.5 text-gray-600  font-medium whitespace-nowrap">
                      Patient Name
                    </TableHead>
                    <TableHead className="px-4 py-2.5 text-gray-600  font-medium whitespace-nowrap">
                      Booked By
                    </TableHead>
                    <TableHead className="px-4 py-2.5 text-gray-600  font-medium whitespace-nowrap">
                      Phone Number
                    </TableHead>
                    <TableHead className="px-4 py-2.5 text-gray-600  font-medium whitespace-nowrap">
                      Email
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(appointments) ? (
                    appointments.map((appt: AppointmentDetail) => {
                      return (
                        <TableRow
                          key={appt.id}
                          className="border-b border-gray-200 bg-white hover:bg-gray-50 text-text-body-subtle  font-medium"
                        >
                          <TableCell className="px-4 py-2 whitespace-nowrap">
                            {appt.time}
                          </TableCell>
                          <TableCell className="px-4 py-2 whitespace-nowrap">
                            {appt.patientName || "-"}
                          </TableCell>
                          <TableCell className="px-4 py-2 whitespace-nowrap">
                            {appt.bookedByName || "-"}
                          </TableCell>
                          <TableCell className="px-4 py-2 whitespace-nowrap">
                            {appt.phoneNumber || "-"}
                          </TableCell>
                          <TableCell className="px-4 py-2 truncate max-w-xs">
                            {appt.email || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-gray-500"
                      >
                        {appointments === "loading" && "Loading..."}
                        {appointments === "none" && "No appointments found."}
                        {appointments === "error" &&
                          "Failed to load appointments."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="p-3 bg-[#FEFCE8]  border border-[#FEF08A]  rounded-md text-yellow-900  flex items-center text-sm">
              <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 text-yellow-600 " />
              Please call and inform these patients and cancel their
              appointments to resolve conflicts and approve leave
            </div>
          </div>
        );
      })}
    </div>
  );
};
