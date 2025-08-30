"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import DoctorsTable from "./doctors-table";
import AddDoctorDialog from "@/components/molecules/admin/add-doctor-dialog";
import EditDoctorDialog from "@/components/molecules/admin/edit-doctor-dialog";
import { AdminDoctorData } from "@/types";
import { DepartmentData } from "@/types";

// Props interface for the client wrapper
interface DoctorsManagementClientProps {
  doctors: AdminDoctorData[];
  availableDepartments: DepartmentData[];
  doctorsFetchError: string | null;
}

export default function DoctorsManagementClient({
  doctors,
  availableDepartments,
  doctorsFetchError,
}: DoctorsManagementClientProps) {
  // State for Add Dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // State for Edit Dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<AdminDoctorData | null>(
    null
  );

  // Function to open the edit dialog, called by the DoctorsTable via the onEdit prop
  const handleOpenEditDialog = (doctor: AdminDoctorData) => {
    console.log("[Client] Opening edit dialog for:", doctor.id);
    setEditingDoctor(doctor); // Set the doctor data to pass to the dialog
    setIsEditDialogOpen(true); // Set state to open the dialog
  };

  // Function to close the edit dialog, passed to EditDoctorDialog
  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    // Delay clearing the doctor data slightly to avoid flickering in the dialog during closing animation
    setTimeout(() => {
      setEditingDoctor(null);
    }, 300);
  };

  return (
    <>
      {/* Main content area for the doctors management page */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50">
        {/* Header section with title and Add button */}
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <h2 className=" text-text-title">Doctors Management</h2>
          {/* Button to open the Add dialog */}
          <Button
            size="sm"
            variant="brand"
            className="text-text-caption-2"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Doctor
          </Button>
        </div>
        {/* Conditionally render this block if doctorsFetchError has a value */}
        {doctorsFetchError && (
          <div
            className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg"
            role="alert"
          >
            <span className="font-medium">Error loading doctors:</span>{" "}
            {doctorsFetchError}
          </div>
        )}

        {/* Card containing the doctors table */}
        <Card className="p-0 shadow-sm border border-gray-100 bg-white rounded-lg">
          <CardContent className="p-0">
            {/* Render the Doctors Table, passing the fetched doctors and the edit handler */}
            <DoctorsTable doctors={doctors} onEdit={handleOpenEditDialog} />
          </CardContent>
        </Card>
      </main>

      {/* Render the Add Doctor Dialog, controlled by its state */}
      <AddDoctorDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen} // Function to close the dialog
        availableDepartments={availableDepartments}
      />

      {/* Render the Edit Doctor Dialog, controlled by its state and passing the doctor data */}
      <EditDoctorDialog
        key={`edit-doctor-${editingDoctor?.id}-${isEditDialogOpen}`}
        doctor={editingDoctor} // Pass the doctor currently being edited
        open={isEditDialogOpen}
        onOpenChange={handleCloseEditDialog} // Function to close the dialog
        availableDepartments={availableDepartments}
      />
    </>
  );
}
