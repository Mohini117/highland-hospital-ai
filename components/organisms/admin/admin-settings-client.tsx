"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AdminUsersTable from "@/components/molecules/admin/admin-users-table";
import AddAdminDialog from "@/components/molecules/admin/add-admin-dialog";
import { AdminUserData } from "@/types";
import EditAdminDialog from "@/components/molecules/admin/edit-admin-dialog";

// Props received from the server page component for this specific tab
interface AdminSettingsClientProps {
  initialUsers: AdminUserData[];
  usersFetchError: string | null;
}

export default function AdminSettingsClient({
  initialUsers,
  usersFetchError,
}: AdminSettingsClientProps) {
  // State for dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserData | null>(null);

  const handleOpenEditDialog = (user: AdminUserData) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingUser(null);
  };

  // Data received from props
  const users = initialUsers;

  return (
    // This component returns only the content for its tab
    <>
      <div className="flex justify-between items-center mb-8">
        <div /> {/* Empty div for spacing  */}
        <Button
          className="text-xs md:text-sm text-text-caption-2 font-normal"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Admin
        </Button>
      </div>

      {/* Display the fetch error message if it exists */}
      {usersFetchError && (
        <div
          className="mb-4 p-3 text-center text-sm text-red-700 bg-red-100 rounded-lg"
          role="alert"
        >
          <span className="font-medium">Error loading admin users:</span>{" "}
          {usersFetchError}
        </div>
      )}

      <Card className="p-0 shadow-sm border border-gray-100 bg-white rounded-lg">
        <CardContent className="p-0">
          <AdminUsersTable users={users} onEditUser={handleOpenEditDialog} />
        </CardContent>
      </Card>

      {/* Dialogs are conditionally rendered to ensure fresh state */}
      {isAddDialogOpen && (
        <AddAdminDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
        />
      )}
      {/* Dialogs are conditionally rendered to ensure fresh state */}
      {isEditDialogOpen && (
        <EditAdminDialog
          user={editingUser}
          open={isEditDialogOpen}
          onOpenChange={handleCloseEditDialog}
        />
      )}
    </>
  );
}
