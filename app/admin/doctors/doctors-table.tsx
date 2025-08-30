import React, { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import {
  deleteDoctor,
  checkDoctorAppointments,
} from "@/lib/actions/admin.actions";
import { AdminDoctorData } from "@/types";
import { toast } from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { AppointmentStatus } from "@/lib/generated/prisma";
import { useActionState } from "react";

//defines the exact shape of an object that will hold the necessary details of a doctor's active appointments
//We will use this to prevent deleting a doctor with active appointments
interface ActiveAppointmentDetail {
  id: string;
  date: string;
  time: string;
  patientName: string | null;
  patientPhone: string | null;
  patientEmail: string | null;
  status: AppointmentStatus;
}

interface DoctorsTableProps {
  doctors: AdminDoctorData[];
  onEdit: (doctor: AdminDoctorData) => void;
}

export default function DoctorsTable({ doctors, onEdit }: DoctorsTableProps) {
  const router = useRouter();
  const [isDeleting, startTransition] = useTransition();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<{
    id: string;
    name: string | null;
  } | null>(null);
  const [activeAppointmentsList, setActiveAppointmentsList] = useState<
    ActiveAppointmentDetail[]
  >([]);

  const [allowDeletion, setAllowDeletion] = useState(false);
  const [checkResult, checkAction, isChecking] = useActionState(
    checkDoctorAppointments,
    null
  );

  const handleManage = (doctorId: string) => {
    router.push(`/admin/doctors/${doctorId}/manage`); // Navigate to the manage page
  };

  const handleEdit = (doctor: AdminDoctorData) => {
    onEdit(doctor);
  };

  const initiateDelete = async (
    doctorId: string,
    doctorName: string | null
  ) => {
    setDoctorToDelete({ id: doctorId, name: doctorName });
    setActiveAppointmentsList([]);
    setAllowDeletion(false);
    startTransition(() => {
      checkAction(doctorId);
    }); // Dispatch the action
  };

  useEffect(() => {
    if (!checkResult) {
      return; // The action hasn't completed yet
    }

    if (!checkResult.success) {
      toast.error(
        checkResult.message || "Could not check for active appointments."
      );
      setAllowDeletion(false);
    } else if (
      checkResult.data?.hasActiveAppointments &&
      checkResult.data?.appointments
    ) {
      setActiveAppointmentsList(checkResult.data.appointments);
      setAllowDeletion(false);
    } else {
      setAllowDeletion(true);
    }
    setIsDeleteDialogOpen(true); // Open dialog after check is complete
  }, [checkResult]);

  const confirmDelete = () => {
    if (!doctorToDelete || !allowDeletion) return;

    const id = doctorToDelete.id;
    const name = doctorToDelete.name;

    startTransition(async () => {
      const operationToastId = `delete-doctor-${id}`;
      toast.loading(`Deleting Dr. ${name || "N/A"}...`, {
        id: operationToastId,
      });

      const result = await deleteDoctor(id);

      // Use result.message for toasts, log result.error
      if (result.success) {
        toast.success(
          result.message || `Dr. ${name || "N/A"} deleted successfully.`,
          { id: operationToastId }
        );
      } else {
        toast.error(result.message || "Failed to delete doctor.", {
          id: operationToastId,
        });
        console.error(
          "deleteDoctor failed:",
          result.error,
          "Type:",
          result.errorType
        );
      }
      setIsDeleteDialogOpen(false);
      setDoctorToDelete(null);
      setActiveAppointmentsList([]);
    });
  };

  const closeDialog = () => {
    setIsDeleteDialogOpen(false);
    setDoctorToDelete(null);
    setActiveAppointmentsList([]); // Clear list
    setAllowDeletion(false);
  };

  return (
    <>
      <div className="relative overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 bg-gray-50 ">
              <TableHead className="px-4 py-3 body-small-bold text-text-body-subtle  w-[40%]">
                Doctor
              </TableHead>
              <TableHead className="px-4 py-3 body-small-bold text-text-body-subtle  w-[30%]">
                Department
              </TableHead>
              <TableHead className="px-4 py-3 body-small-bold text-text-body-subtle w-[30%]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-10 text-gray-500"
                >
                  No active doctors found.
                </TableCell>
              </TableRow>
            ) : (
              doctors.map((doctor) => (
                <TableRow
                  key={doctor.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  {/* Doctor Cell */}
                  <TableCell className="px-4 py-3 body-regular text-text-title">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                        {doctor.image ? (
                          <Image
                            src={doctor.image}
                            alt={doctor.name || "Doctor"}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full w-full bg-gray-200 text-gray-600 font-bold text-lg">
                            {doctor.name
                              ? doctor.name.charAt(0).toUpperCase()
                              : "N/A"}
                          </div>
                        )}
                      </div>
                      <span>{doctor.name || "N/A"}</span>
                    </div>
                  </TableCell>
                  {/* Department Cell */}
                  <TableCell className="px-4 py-3 body-regular text-text-title">
                    {doctor.specialty || "N/A"}
                  </TableCell>
                  {/* Actions Cell */}
                  <TableCell className="px-4 py-3">
                    <div className="flex  items-center gap-2">
                      {/* Manage Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 py-1 rounded-md whitespace-nowrap text-xs text-text-title border-border hover:bg-background-3 hover:cursor-pointer disabled:opacity-50"
                        onClick={() => handleManage(doctor.id)} // Calls the router push function
                        disabled={isDeleting || isChecking}
                        title="Manage Schedule/Leave"
                      >
                        <CalendarDays className="h-3.5 w-3.5 mr-1" /> Manage{" "}
                        {/* Use CalendarDays icon */}
                      </Button>
                      {/* Edit Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 py-1 rounded-md whitespace-nowrap text-xs text-text-title border-border hover:bg-background-3 hover:cursor-pointer disabled:opacity-50"
                        onClick={() => handleEdit(doctor)}
                        disabled={isDeleting || isChecking} // Disable during delete or check
                        title="Edit Doctor"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      {/* Delete Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 py-1 rounded-md whitespace-nowrap text-red-600 border-red-300 hover:bg-red-50 disabled:opacity-50"
                        onClick={() => initiateDelete(doctor.id, doctor.name)}
                        disabled={isDeleting || isChecking}
                        title="Delete Doctor"
                      >
                        {isChecking && doctorToDelete?.id === doctor.id ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* --- Alert Dialog for Delete Confirmation / Prevention --- */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={closeDialog}>
        <AlertDialogContent className={cn("sm:max-w-3xl", "bg-card")}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {allowDeletion ? "Delete Doctor" : "Cannot Delete Doctor"}
            </AlertDialogTitle>
            {/* Render description directly if deletion is allowed */}
            {allowDeletion && (
              <AlertDialogDescription>
                Are you sure you want to delete Dr.{" "}
                {doctorToDelete?.name || "N/A"}? This action cannot be undone.
              </AlertDialogDescription>
            )}
            {/* If deletion is NOT allowed, the main text goes here,
                warning/table go outside the header */}
            {!allowDeletion && (
              <AlertDialogDescription>
                This doctor cannot be deleted because they have active
                appointments (Confirmed or Pay at Counter). Please go to the
                appointments page and cancel the following appointments manually
                before proceeding.
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>

          {/* --- Custom Content Area (Only when deletion is NOT allowed) --- */}
          {!allowDeletion && activeAppointmentsList.length > 0 && (
            <div className="my-4 space-y-4 flex-1 overflow-y-auto pr-6">
              {" "}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 ">
                <p className="text-yellow-800  flex items-center text-sm font-medium">
                  <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                  The following appointments must be cancelled before deletion
                  is possible.
                </p>
              </div>
              {/* Appointments Table */}
              <div className="max-h-60 overflow-y-auto border rounded-md">
                {" "}
                {/* Added border */}
                <Table className="w-full text-sm">
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="h-9 px-3 text-xs font-medium text-gray-600 ">
                        Date
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs font-medium text-gray-600 ">
                        Time
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs font-medium text-gray-600 ">
                        Patient
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs font-medium text-gray-600 ">
                        Phone
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs font-medium text-gray-600 ">
                        Email
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs font-medium text-gray-600 ">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeAppointmentsList.map((apt) => (
                      <TableRow key={apt.id} className="bg-white">
                        <TableCell className="px-3 py-2">{apt.date}</TableCell>
                        <TableCell className="px-3 py-2">{apt.time}</TableCell>
                        <TableCell className="px-3 py-2">
                          {apt.patientName || "-"}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {apt.patientPhone || "-"}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {apt.patientEmail || "-"}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {apt.status}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            {allowDeletion ? (
              <>
                <AlertDialogCancel onClick={closeDialog} disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </>
            ) : (
              // Apply default button styles using buttonVariants
              <AlertDialogCancel
                onClick={closeDialog}
                className={cn(
                  buttonVariants({ variant: "brand" }),
                  "text-text-caption-2 hover:cursor-pointer hover:text-text-caption-2"
                )}
              >
                Close
              </AlertDialogCancel>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
