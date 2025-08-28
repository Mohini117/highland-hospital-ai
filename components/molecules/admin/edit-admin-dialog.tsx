"use client";

import React, { useActionState, useEffect, useRef, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { editAdminFormSchema } from "@/lib/validators";
import { updateAdminUser } from "@/lib/actions/admin.actions";
import { AdminUserData, EditAdminFormValues } from "@/types";

interface EditAdminDialogProps {
  user: AdminUserData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditAdminDialog({
  user,
  open,
  onOpenChange,
}: EditAdminDialogProps) {
  const toastIdRef = useRef<string | null>(null);
  const [, startTransition] = useTransition();

  const [state, formAction] = useActionState(updateAdminUser, {
    success: false,
    message: "",
    fieldErrors: undefined,
    error: undefined,
    errorType: undefined,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: clientFormErrors, isSubmitting },
  } = useForm<EditAdminFormValues>({
    resolver: zodResolver(editAdminFormSchema),
    defaultValues: {
      name: "",
    },
  });

  // EFFECT 1: Populate and clean up the form. This is the main difference from AddAdminDialog.
  useEffect(() => {
    if (open && user) {
      // When the dialog opens with a user, reset the form with their data.
      reset({ name: user.name || "" });
    } else if (!open) {
      // When the dialog closes, clear the form and any lingering toasts.
      reset({ name: "" });
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  }, [user, open, reset]);

  // EFFECT 2: Handle server response toasts. This is identical to AddAdminDialog.
  useEffect(() => {
    // A guard clause to prevent this from running on the initial empty state.
    if (!state.message && !state.fieldErrors && !state.error) {
      return;
    }

    const currentToastId = toastIdRef.current;

    if (state.success) {
      toast.success(state.message || "Admin updated successfully!", {
        id: currentToastId ?? undefined,
      });
      onOpenChange(false);
      // No need to reset() here, the effect above handles it on close.
      toastIdRef.current = null;
    } else {
      let errorMessage = "Failed to update admin. Please try again.";
      if (state.fieldErrors) {
        errorMessage = "Please check errors on the form.";
      } else if (state.message) {
        errorMessage = state.message;
      }
      toast.error(errorMessage, { id: currentToastId ?? undefined });
    }
  }, [state, onOpenChange]);

  const onSubmit = (data: EditAdminFormValues) => {
    if (!user?.id) {
      toast.error("Cannot save changes: User ID is missing.");
      return;
    }

    // 1. Show loading toast
    if (toastIdRef.current) toast.dismiss(toastIdRef.current);
    toastIdRef.current = toast.loading("Saving changes...");

    // 2. Prepare FormData
    const formData = new FormData();
    formData.append("userId", user.id);
    formData.append("name", data.name);

    // 3. Call the server action
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Edit Admin User</DialogTitle>
        </DialogHeader>
        {!user ? (
          <div className="py-10 text-center text-muted-foreground">
            Loading user data...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 py-4"
            noValidate
          >
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue={user.email}
                readOnly
                className="cursor-not-allowed bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="name-edit">Name</Label>
              <Input
                id="name-edit"
                {...register("name")}
                className={
                  clientFormErrors.name || state.fieldErrors?.name
                    ? "border-destructive"
                    : ""
                }
              />
              {clientFormErrors.name && (
                <p className="text-xs text-destructive mt-1">
                  {clientFormErrors.name.message}
                </p>
              )}
              {state.fieldErrors?.name && (
                <p className="text-xs text-destructive mt-1">
                  {state.fieldErrors.name[0]}
                </p>
              )}
            </div>

            {!state.success && state.message && !state.fieldErrors && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
