"use client";

import React, { useState, useTransition, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
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
import { toast } from "react-hot-toast";

import AdminDepartmentCard from "@/components/molecules/admin/admin-department-card";
import AddDepartmentDialog from "../../molecules/admin/add-department-dialog";
import EditDepartmentDialog from "../../molecules/admin/edit-department-dialog";
import { deleteDepartment } from "@/lib/actions/settings.actions";
import { DepartmentData } from "@/types";
import { useRouter } from "next/navigation";

interface DepartmentSettingsProps {
  initialDepartments: DepartmentData[];
}

export default function DepartmentSettings({
  initialDepartments,
}: DepartmentSettingsProps) {
  const departments = initialDepartments; // Use data passed from server
  const router = useRouter();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] =
    useState<DepartmentData | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] =
    useState(false);
  const [departmentToDelete, setDepartmentToDelete] =
    useState<DepartmentData | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const deleteToastIdRef = useRef<string | null>(null);

  const handleOpenEditDialog = (department: DepartmentData) => {
    setEditingDepartment(department);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    // Delay clearing data slightly for animation
    setTimeout(() => setEditingDepartment(null), 300);
  };

  const handleDeleteClick = (department: DepartmentData) => {
    setDepartmentToDelete(department);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!departmentToDelete) return;

    if (deleteToastIdRef.current) toast.dismiss(deleteToastIdRef.current);
    deleteToastIdRef.current = toast.loading(
      `Deleting department "${departmentToDelete.name}"...`
    );

    startDeleteTransition(async () => {
      const result = await deleteDepartment(departmentToDelete.id);
      const currentToastId = deleteToastIdRef.current;

      if (result.success) {
        toast.success(result.message || "Department deleted successfully.", {
          id: currentToastId ?? undefined,
        });
        router.refresh();
      } else {
        toast.error(result.message || "Failed to delete department.", {
          id: currentToastId ?? undefined,
        });
        if (result.error) {
          console.error(
            "deleteDepartment failed:",
            result.error,
            "Type:",
            result.errorType
          );
        }
      }
      setIsConfirmDeleteDialogOpen(false);
      setDepartmentToDelete(null);
      deleteToastIdRef.current = null;
    });
  };

  return (
    <>
      <Card className="p-0 shadow-sm border border-gray-100 bg-white rounded-lg">
        {/* Header Section */}
        <CardContent className="p-6 border-b border-gray-100 ">
          <div className="flex justify-between items-center">
            <div>
              <h4 className=" text-text-title ">Departments</h4>
              <p className="body-small mt-1">
                Manage hospital departments and their icons.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              disabled={!!editingDepartment || isDeleting} // Disable if editing or deleting any
              className="text-xs md:text-sm font-bold text-text-caption-2"
            >
              <Plus className="mr-2 h-3 w-3" />
              Add Department
            </Button>
          </div>
        </CardContent>

        {/* Department Grid */}
        <CardContent className="p-6">
          {departments.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No departments added yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {departments.map((dept) => (
                <AdminDepartmentCard
                  key={dept.id}
                  department={dept}
                  onEdit={handleOpenEditDialog}
                  onDelete={handleDeleteClick}
                  // Pass true only if *this specific* department is being deleted
                  isDeleting={isDeleting && departmentToDelete?.id === dept.id}
                  // Pass true to disable buttons if another department is in the edit dialog
                  isEditingAnother={
                    !!editingDepartment && editingDepartment.id !== dept.id
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddDepartmentDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
      <EditDepartmentDialog
        department={editingDepartment}
        open={isEditDialogOpen}
        onOpenChange={handleCloseEditDialog}
      />
      <AlertDialog
        open={isConfirmDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsConfirmDeleteDialogOpen(open);
          if (!open) {
            // If dialog is closed (e.g. via cancel), dismiss active toast
            if (deleteToastIdRef.current) {
              toast.dismiss(deleteToastIdRef.current);
              deleteToastIdRef.current = null;
            }
            setDepartmentToDelete(null); // Also reset department to delete
          }
        }}
      >
        <AlertDialogContent className="bg-card text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              &ldquo;{departmentToDelete?.name}&rdquo; department. Ensure no
              doctors are currently assigned this specialty.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
