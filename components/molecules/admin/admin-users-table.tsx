"use client";

import React, { useTransition } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { deleteAdminUser } from "@/lib/actions/admin.actions";
import { toast } from "react-hot-toast";
import { AdminUserData } from "@/types";
// Props Interface
interface AdminUsersTableProps {
  users: AdminUserData[];
  onEditUser: (user: AdminUserData) => void;
}

// Main Table Component
export default function AdminUsersTable({
  users,
  onEditUser,
}: AdminUsersTableProps) {
  const [isPending, startTransition] = useTransition();

  // --- Delete Handler ---
  const handleDelete = (
    userId: string,
    userName: string | null,
    isRoot: boolean | null
  ) => {
    if (isRoot) {
      toast.error("Root admins cannot be deleted.");
      return;
    }
    if (
      confirm(
        `Are you sure you want to delete admin user "${
          userName || userId
        }"? This action cannot be undone.`
      )
    ) {
      startTransition(async () => {
        const toastId = `delete-${userId}`;
        toast.loading(`Deleting ${userName || userId}...`, {
          id: toastId,
        });
        const result = await deleteAdminUser(userId);
        if (result.success) {
          toast.success(
            result.message ||
              `User ${userName || userId} deleted successfully.`,
            { id: toastId }
          );
        } else {
          toast.error(result.message || "Failed to delete user.", {
            id: toastId,
          });
          console.error(
            "deleteAdminUser failed:",
            result.error,
            "Type:",
            result.errorType
          );
        }
      });
    }
  };

  const handleEdit = (user: AdminUserData) => {
    console.log("Edit user requested:", user);
    onEditUser(user); // Call the callback passed from parent
  };

  return (
    <>
      <div className="relative overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 bg-gray-50 ">
              <TableHead className="px-4 py-3 font-medium body-small-bold text-text-body-subtle">
                Name
              </TableHead>
              <TableHead className="px-4 py-3 font-medium body-small-bold text-text-body-subtle">
                Email
              </TableHead>
              <TableHead className="px-4 py-3 font-medium body-small-bold text-text-body-subtle">
                Role
              </TableHead>
              <TableHead className="px-4 py-3 font-medium body-small-bold text-text-body-subtle">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-10 text-gray-500"
                ></TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <TableCell className="px-4 py-3 text-sm text-gray-700 ">
                    {user.name || "N/A"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-700 ">
                    {user.email}
                  </TableCell>
                  <TableCell className="px-4 py-3 capitalize">
                    {user.role.toLowerCase()} {user.isRootAdmin ? "(Root)" : ""}{" "}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex justify-start items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-body-subtle hover:text-text-body-subtle/20"
                        onClick={() => handleEdit(user)}
                        disabled={isPending}
                        title="Edit User"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {/* ---- Conditional Delete Button ---- */}
                      {!user.isRootAdmin && ( // Only show if NOT root admin
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-text-body-subtle hover:text-text-body-subtle/20"
                          onClick={() =>
                            handleDelete(user.id, user.name, user.isRootAdmin)
                          }
                          disabled={isPending}
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
