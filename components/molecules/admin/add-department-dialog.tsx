"use client";

import React, { useEffect, useMemo, useRef, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addDepartmentSchema } from "@/lib/validators";
import { addDepartment } from "@/lib/actions/settings.actions";
import { getAvailableIconNames, getIconComponent } from "@/lib/utils";
import { AddDepartmentFormValues } from "@/types";
import { useRouter } from "next/navigation";

interface AddDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddDepartmentDialog({
  open,
  onOpenChange,
}: AddDepartmentDialogProps) {
  const router = useRouter();
  const toastIdRef = useRef<string | null>(null);
  const [, startTransition] = useTransition();

  const [state, formAction] = useActionState(addDepartment, {
    success: false,
    message: "",
    fieldErrors: undefined,
  });

  const availableIcons = useMemo(() => getAvailableIconNames(), []);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors: clientFormErrors, isSubmitting },
  } = useForm<AddDepartmentFormValues>({
    resolver: zodResolver(addDepartmentSchema),
    defaultValues: { name: "", iconName: "" },
  });

  const selectedIconName = watch("iconName");
  const IconPreview = getIconComponent(selectedIconName);

  // EFFECT 1: This effect handles only cleanup for abandoned actions.
  useEffect(() => {
    if (!open) {
      reset();
      // This will only run if the dialog is closed WHILE a toast is loading
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  }, [open, reset]);

  // EFFECT 2: Handles the server's response.
  useEffect(() => {
    if (!state.message && !state.fieldErrors) {
      return;
    }

    const currentToastId = toastIdRef.current;

    if (state.success) {
      toast.success(state.message || "Department added successfully!", {
        id: currentToastId ?? undefined,
      });
      onOpenChange(false);
      router.refresh();
    } else {
      let errorMessage = "Failed to add department. Please try again.";
      if (state.fieldErrors) {
        errorMessage = "Please check errors on the form.";
      } else if (state.message) {
        errorMessage = state.message;
      }
      toast.error(errorMessage, { id: currentToastId ?? undefined });
    }

    // Clear the ref after showing the final toast.
    // This prevents the cleanup effect from dismissing the success/error toast.
    toastIdRef.current = null;
  }, [state, onOpenChange, router]);

  const onSubmit = (data: AddDepartmentFormValues) => {
    toastIdRef.current = toast.loading("Adding department...");

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("iconName", data.iconName);
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Add New Department</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 py-4"
          noValidate
        >
          {/* Department Name Input */}
          <div>
            <Label htmlFor="name">
              Department Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., Cardiology"
              className={
                clientFormErrors.name || state.fieldErrors?.name
                  ? "border-red-500"
                  : ""
              }
              disabled={isSubmitting}
            />
            {clientFormErrors.name && (
              <p className="text-xs text-red-500 mt-1">
                {clientFormErrors.name.message}
              </p>
            )}
            {state.fieldErrors?.name && (
              <p className="text-xs text-red-500 mt-1">
                {state.fieldErrors.name[0]}
              </p>
            )}
          </div>

          {/* Icon Select Input */}
          <div>
            <Label htmlFor="iconName">
              Icon <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Controller
                name="iconName"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="iconName"
                      className={`flex-grow ${
                        clientFormErrors.iconName || state.fieldErrors?.iconName
                          ? "border-red-500"
                          : ""
                      }`}
                    >
                      <SelectValue placeholder="Select an icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableIcons.map((iconKey) => {
                        const IconComp = getIconComponent(iconKey);
                        return (
                          <SelectItem key={iconKey} value={iconKey}>
                            <div className="flex items-center gap-2">
                              {IconComp && (
                                <IconComp className="h-4 w-4 flex-shrink-0" />
                              )}
                              <span>{iconKey}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
              <div className="flex-shrink-0 w-9 h-9 border rounded-md flex items-center justify-center bg-muted/50">
                {IconPreview && (
                  <IconPreview className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
            {clientFormErrors.iconName && (
              <p className="text-xs text-red-500 mt-1">
                {clientFormErrors.iconName.message}
              </p>
            )}
            {state.fieldErrors?.iconName && (
              <p className="text-xs text-red-500 mt-1">
                {state.fieldErrors.iconName[0]}
              </p>
            )}
          </div>

          {/* General Server Error Message */}
          {!state.success && state.message && !state.fieldErrors && (
            <p className="text-sm text-red-500">{state.message}</p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                </>
              ) : (
                "Add Department"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
