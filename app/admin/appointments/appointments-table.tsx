"use client";

import React, { useTransition, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Import AlertDialog components

// --- Icons ---
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

// --- Actions and Types ---
import { AdminAppointment } from "@/types";
import {
  markAdminAppointmentNoShow,
  markAdminAppointmentCompleted,
  markCashAppointmentAsPaid,
  cancelAdminAppointment,
} from "@/lib/actions/admin.actions";
import { cancelCashAppointment } from "@/lib/actions/shared.actions";
import { AppointmentStatus } from "@/lib/generated/prisma";
import AppointmentStatusBadge from "@/components/molecules/admin/appointment-status-badge";
import PaginationControls from "@/components/molecules/pagination-controls";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ServerActionResponse } from "@/types";

// --- Props Interface ---
interface AppointmentsTableProps {
  appointments: AdminAppointment[];
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  totalAppointments: number;
  searchQuery: string;
}

// --- Main Table Component ---
export default function AppointmentsTable({
  appointments,
  totalPages,
  currentPage,
  searchQuery,
}: AppointmentsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const activeToastId = useRef<string | null>(null);

  // --- State for AlertDialog ---
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertDetails, setAlertDetails] = useState<{
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    title: "",
    description: "",
    confirmText: "Confirm",
    onConfirm: () => {},
    isDestructive: false,
  });

  // Helper to execute the action and show toasts
  const executeTableAction = (
    actionFn: () => Promise<ServerActionResponse>, // The actual server action call
    actionPendingText: string = "Processing...",
    actionSuccessText: string = "Action successful.",
    actionErrorText: string = "Action failed."
  ) => {
    startTransition(async () => {
      if (activeToastId.current) toast.dismiss(activeToastId.current);
      activeToastId.current = toast.loading(actionPendingText);

      try {
        const result = await actionFn(); // Call the passed server action
        if (result.success) {
          toast.success(result.message || actionSuccessText, {
            id: activeToastId.current,
          });
        } else {
          toast.error(result.message || actionErrorText, {
            id: activeToastId.current,
          });
          console.error(
            "Action failed:",
            result.error,
            "Type:",
            result.errorType
          );
        }
      } catch (error) {
        toast.error(actionErrorText, { id: activeToastId.current });
        console.error("Error executing action:", error);
      }
    });
  };

  const openConfirmationDialog = (
    title: string,
    description: string,
    confirmText: string,
    onConfirmAction: () => void,
    isDestructive: boolean = false
  ) => {
    setAlertDetails({
      title,
      description,
      confirmText,
      onConfirm: onConfirmAction,
      isDestructive,
    });
    setIsAlertOpen(true);
  };

  const handleCancel = (id: string) => {
    openConfirmationDialog(
      "Confirm Cancellation",
      "Are you sure you want to cancel this appointment? This action cannot be undone.",
      "Yes, Cancel Appointment",
      () =>
        executeTableAction(
          () => cancelAdminAppointment(id),
          "Cancelling appointment...",
          "Appointment cancelled successfully.",
          "Failed to cancel appointment."
        ),
      true // Destructive action
    );
  };

  const handleCancelCash = (id: string) => {
    openConfirmationDialog(
      "Confirm Cancellation",
      "Are you sure you want to cancel this 'Pay at Counter' appointment? This action cannot be undone.",
      "Yes, Cancel Appointment",
      () =>
        executeTableAction(
          () => cancelCashAppointment(id),
          "Cancelling appointment...",
          "Appointment cancelled successfully.",
          "Failed to cancel appointment."
        ),
      true // Destructive action
    );
  };

  const handleMarkPaid = (id: string) => {
    openConfirmationDialog(
      "Confirm Payment",
      "Are you sure you want to mark this cash appointment as paid and confirmed?",
      "Yes, Mark as Paid",
      () =>
        executeTableAction(
          () => markCashAppointmentAsPaid(id),
          "Marking as paid...",
          "Appointment marked as paid successfully.",
          "Failed to mark appointment as paid."
        )
    );
  };

  const handleMarkNoShow = (id: string) => {
    openConfirmationDialog(
      "Confirm No Show",
      "Are you sure you want to mark this appointment as No Show?",
      "Yes, Mark as No Show",
      () =>
        executeTableAction(
          () => markAdminAppointmentNoShow(id),
          "Marking as No Show...",
          "Appointment marked as No Show.",
          "Failed to mark as No Show."
        ),
      true
    );
  };

  const handleMarkCompleted = (id: string) => {
    openConfirmationDialog(
      "Confirm Completion",
      "Are you sure you want to mark this appointment as Completed?",
      "Yes, Mark as Completed",
      () =>
        executeTableAction(
          () => markAdminAppointmentCompleted(id),
          "Marking as Completed...",
          "Appointment marked as Completed.",
          "Failed to mark as Completed."
        )
    );
  };

  const handlePageChange = (page: number) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("page", page.toString());
    router.push(`${pathname}?${current.toString()}`);
  };

  return (
    <>
      <div className="relative overflow-x-auto rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 bg-gray-50">
              <TableHead className="px-4 py-3 body-small-bold text-text-body-subtle ">
                ID
              </TableHead>
              <TableHead className="px-4 py-3  font-medium body-small-bold text-text-body-subtle ">
                Doctor
              </TableHead>
              <TableHead className="px-4 py-3  font-medium  body-small-bold text-text-body-subtle ">
                Patient
              </TableHead>
              <TableHead className="px-4 py-3  font-medium  body-small-bold text-text-body-subtle ">
                Phone Number
              </TableHead>
              <TableHead className="px-4 py-3  font-medium  body-small-bold text-text-body-subtle ">
                Booked By
              </TableHead>
              <TableHead className="px-4 py-3  font-medium  body-small-bold text-text-body-subtle ">
                Slot Date
              </TableHead>
              <TableHead className="px-4 py-3  font-medium  body-small-bold text-text-body-subtle ">
                Slot Time
              </TableHead>
              <TableHead className="px-4 py-3  font-medium  body-small-bold text-text-body-subtle ">
                Status
              </TableHead>
              <TableHead className="px-4 py-3  font-medium  body-small-bold text-text-body-subtle  text-center">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-10 text-gray-500"
                >
                  {searchQuery
                    ? `No appointments found matching "${searchQuery}".`
                    : "No appointments found."}
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
                <TableRow
                  key={appointment.id}
                  className="border-b border-border  hover:bg-gray-50 "
                >
                  <TableCell className="px-4 py-3 body-small text-text-body-subtle  font-mono">
                    {appointment.formattedId}
                  </TableCell>
                  <TableCell className="px-4 py-3 body-small text-text-body-subtle ">
                    {appointment.doctorName}
                  </TableCell>
                  <TableCell className="px-4 py-3 body-small text-text-body-subtle ">
                    {appointment.patientName}
                  </TableCell>
                  <TableCell className="px-4 py-3 body-small text-text-body-subtle ">
                    {appointment.phoneNumber ||
                      appointment.userPhoneNumber ||
                      "N/A"}
                  </TableCell>
                  <TableCell className="px-4 py-3 body-small text-text-body-subtle ">
                    {appointment.bookedByName}
                  </TableCell>
                  <TableCell className="px-4 py-3 body-small text-text-body-subtle ">
                    {appointment.appointmentDate}
                  </TableCell>
                  <TableCell className="px-4 py-3 body-small text-text-body-subtle ">
                    {appointment.appointmentTime}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <AppointmentStatusBadge status={appointment.status} />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    <div className="flex justify-center items-center gap-2">
                      {appointment.status ===
                        AppointmentStatus.BOOKING_CONFIRMED && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 py-1 rounded-md whitespace-nowrap border-alert-3 hover:bg-red-50  disabled:opacity-50 text-xs md:text-sm text-alert-1 font-bold"
                            onClick={() => handleCancel(appointment.id)}
                            disabled={isPending}
                            title="Cancel Appointment"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 py-1 rounded-md whitespace-nowrap border-notice-3 hover:bg-yellow-50  disabled:opacity-50 text-xs md:text-sm text-notice-1 font-bold"
                            onClick={() => handleMarkNoShow(appointment.id)}
                            disabled={isPending}
                            title="Mark as No Show"
                          >
                            No Show
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 py-1 rounded-md whitespace-nowrap border-positive-3 hover:bg-green-50  disabled:opacity-50 text-xs md:text-sm text-positive-1 font-bold"
                            onClick={() => handleMarkCompleted(appointment.id)}
                            disabled={isPending}
                            title="Mark as Completed"
                          >
                            Completed
                          </Button>
                        </>
                      )}
                      {appointment.status === AppointmentStatus.CASH && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 py-1 rounded-md whitespace-nowrap border-positive-3 hover:bg-green-50  disabled:opacity-50 text-xs md:text-sm text-positive-1 font-bold"
                            onClick={() => handleMarkPaid(appointment.id)}
                            disabled={isPending}
                            title="Mark as Paid"
                          >
                            Mark as Paid
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 py-1 rounded-md whitespace-nowrap border-alert-3 hover:bg-red-50  disabled:opacity-50 text-xs md:text-sm text-alert-1 font-bold"
                            onClick={() => handleCancelCash(appointment.id)}
                            disabled={isPending}
                            title="Cancel Appointment"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 py-1 rounded-md whitespace-nowrap border-notice-3 hover:bg-yellow-50  disabled:opacity-50 text-xs md:text-sm text-notice-1 font-bold"
                            onClick={() => handleMarkNoShow(appointment.id)}
                            disabled={isPending}
                            title="Mark as No Show"
                          >
                            No Show
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {appointments.length > 0 && totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center justify-center">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}

      {/* --- AlertDialog Component --- */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-card text-card-foreground border-border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-title">
              {alertDetails.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-body-subtle">
              {alertDetails.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-3">
            <AlertDialogCancel
              onClick={() => setIsAlertOpen(false)}
              disabled={isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                alertDetails.onConfirm();
                setIsAlertOpen(false);
              }}
              disabled={isPending}
              className={cn(
                alertDetails.isDestructive &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                alertDetails.confirmText
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
