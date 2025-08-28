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
import { addAdminFormSchema } from "@/lib/validators";
import { addAdminUser } from "@/lib/actions/admin.actions";
import { AddAdminFormValues } from "@/types";

interface AddAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddAdminDialog({
  open,
  onOpenChange,
}: AddAdminDialogProps) {
  const [, startTransition] = useTransition();
  const toastIdRef = useRef<string | null>(null);

  // useActionState for handling form submission with server action
  const [state, formAction] = useActionState(addAdminUser, {
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
  } = useForm<AddAdminFormValues>({
    resolver: zodResolver(addAdminFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
      if (toastIdRef.current) {
        // Ensure toast is dismissed if dialog is closed abruptly
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  }, [open, reset]);

  useEffect(() => {
    // A guard clause to prevent this from running on the initial empty state.
    if (!state.message && !state.fieldErrors && !state.error) {
      return;
    }

    const currentToastId = toastIdRef.current;

    if (state.success) {
      // --- SUCCESS CASE ---
      toast.success(state.message || "Admin user created successfully!", {
        id: currentToastId ?? undefined,
      });
      onOpenChange(false);
      reset();
      toastIdRef.current = null; // Clean up on success
    } else {
      // --- ERROR CASE ---
      let errorMessage = "Failed to add admin. Please try again.";
      if (state.fieldErrors) {
        errorMessage = "Please check errors on the form.";
      } else if (state.message) {
        errorMessage = state.message;
      }
      toast.error(errorMessage, { id: currentToastId ?? undefined });
    }
  }, [state, reset, onOpenChange]);

  const onSubmit = (data: AddAdminFormValues) => {
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
    }
    toastIdRef.current = toast.loading("Adding admin...");

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("email", data.email);
    formData.append("password", data.password);
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Add New Admin</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 py-4"
          noValidate
        >
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register("name")}
              className={
                clientFormErrors.name || state.fieldErrors?.name
                  ? "border-red-500"
                  : ""
              }
            />
            {/* Display client-side validation error */}
            {clientFormErrors.name && (
              <p className="text-xs text-red-500 mt-1">
                {clientFormErrors.name.message}
              </p>
            )}
            {/* Display server-side field error for name */}
            {state.fieldErrors?.name && (
              <p className="text-xs text-red-500 mt-1">
                {state.fieldErrors.name[0]}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              className={
                clientFormErrors.email || state.fieldErrors?.email
                  ? "border-red-500"
                  : ""
              }
            />
            {/* Display client-side validation error */}
            {clientFormErrors.email && (
              <p className="text-xs text-red-500 mt-1">
                {clientFormErrors.email.message}
              </p>
            )}
            {/* Display server-side field error for email */}
            {state.fieldErrors?.email && (
              <p className="text-xs text-red-500 mt-1">
                {state.fieldErrors.email[0]}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              className={
                clientFormErrors.password || state.fieldErrors?.password
                  ? "border-red-500"
                  : ""
              }
            />
            {/* Display client-side validation error */}
            {clientFormErrors.password && (
              <p className="text-xs text-red-500 mt-1">
                {clientFormErrors.password.message}
              </p>
            )}
            {/* Display server-side field error for password */}
            {state.fieldErrors?.password && (
              <p className="text-xs text-red-500 mt-1">
                {state.fieldErrors.password[0]}
              </p>
            )}
          </div>

          {/* Display general server error message (non-field specific) */}
          {!state.success && state.message && !state.fieldErrors && (
            <p className="text-sm text-red-500">{state.message}</p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Admin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
