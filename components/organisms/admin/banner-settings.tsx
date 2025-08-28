"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { deleteBanner, updateBannerName } from "@/lib/actions/settings.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BannerImageData } from "@/types";

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
import { Trash2, Edit, Loader2, Plus, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import AddBannerDialog from "@/components/molecules/admin/add-banner-dialog";

interface BannerSettingsProps {
  initialBanner: BannerImageData | null;
}

export default function BannerSettings({ initialBanner }: BannerSettingsProps) {
  const router = useRouter();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] =
    useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  const [isPending, startTransition] = useTransition();

  const confirmDelete = () => {
    if (!initialBanner) return;

    const toastId = toast.loading("Deleting banner...");

    startTransition(async () => {
      const result = await deleteBanner(initialBanner.id);
      if (result.success) {
        toast.success(result.message || "Banner deleted successfully.", {
          id: toastId,
        });
        router.refresh();
      } else {
        toast.error(result.message || "Failed to delete banner.", {
          id: toastId,
        });
        console.error("deleteBanner failed:", result.error, result.errorType);
      }
      setIsConfirmDeleteDialogOpen(false);
    });
  };

  const handleEditClick = () => {
    if (!initialBanner) return;
    setIsEditingName(true);
    setNewName(initialBanner.name);
  };

  const cancelEdit = () => {
    setIsEditingName(false);
    setNewName("");
  };

  const saveEdit = () => {
    if (!initialBanner || !newName || newName === initialBanner.name) {
      cancelEdit();
      return;
    }

    const toastId = toast.loading("Updating banner name...");

    startTransition(async () => {
      const result = await updateBannerName(initialBanner.id, newName);
      if (result.success) {
        toast.success(result.message || "Banner name updated.", {
          id: toastId,
        });
        setIsEditingName(false); // Close edit mode on success
        router.refresh();
      } else {
        toast.error(result.message || "Failed to update name.", {
          id: toastId,
        });
        console.error(
          "updateBannerName failed:",
          result.error,
          result.errorType
        );
      }
    });
  };

  return (
    <Card className="p-0 shadow-sm border border-gray-100 bg-white rounded-lg gap-0">
      <CardContent className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-text-title">Home Page Banner</h4>
            <p className="body-small mt-1">
              Upload one banner for the home page.
            </p>
          </div>
        </div>
      </CardContent>
      <CardContent className="p-6">
        <div>
          {initialBanner ? (
            // If a banner exists, display it
            <div
              key={initialBanner.id}
              className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden group relative flex flex-col"
            >
              <div className="relative aspect-[2.5/1]">
                {isPending && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20">
                    <Loader2 className="h-6 w-6 animate-spin text-destructive" />
                  </div>
                )}
                <Image
                  src={initialBanner.imageUrl}
                  alt={initialBanner.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="p-3 bg-background-1 flex justify-between items-center mt-auto border-t border-gray-200">
                {isEditingName ? (
                  <div className="flex-grow mr-2">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-8 text-sm"
                      disabled={isPending}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                  </div>
                ) : (
                  <span className="body-small truncate mr-2">
                    {initialBanner.name}
                  </span>
                )}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isEditingName ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-green-600 hover:bg-green-100"
                        onClick={saveEdit}
                        disabled={isPending || !newName}
                        title="Save name"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-500 hover:bg-gray-100"
                        onClick={cancelEdit}
                        disabled={isPending}
                        title="Cancel edit"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-text-body-subtle hover:text-text-body-subtle/50"
                        onClick={handleEditClick}
                        disabled={isPending}
                        title="Edit name"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-600 hover:bg-red-100"
                        onClick={() => setIsConfirmDeleteDialogOpen(true)}
                        disabled={isPending}
                        title="Delete banner"
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // If no banner exists, display the placeholder
            <div className="bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 aspect-[2.5/1] flex items-center justify-center">
              <Button
                variant="secondary"
                size="sm"
                className="text-gray-600 "
                onClick={() => setIsAddDialogOpen(true)}
                disabled={isPending}
              >
                <Plus className="mr-2 h-4 w-4" /> Upload Banner
              </Button>
            </div>
          )}
        </div>
      </CardContent>
      <AddBannerDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
      {/* For Delete */}
      <AlertDialog
        open={isConfirmDeleteDialogOpen}
        onOpenChange={setIsConfirmDeleteDialogOpen}
      >
        <AlertDialogContent className="bg-card text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              banner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
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
    </Card>
  );
}
