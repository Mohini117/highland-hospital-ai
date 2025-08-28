"use client";

import React, { useEffect, useMemo, useRef, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
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
import { editDepartmentSchema } from "@/lib/validators";
import { updateDepartment } from "@/lib/actions/settings.actions";
import { DepartmentData } from "@/types";
import { getAvailableIconNames, getIconComponent } from "@/lib/utils";
import { EditDepartmentFormValues } from "@/types";

interface EditDepartmentDialogProps {
  department: DepartmentData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditDepartmentDialog({
  department,
  open,
  onOpenChange,
}: EditDepartmentDialogProps) {
  const router = useRouter();
  const toastIdRef = useRef<string | null>(null);
  const [, startTransition] = useTransition();
  const successHandledRef = useRef(false);
  const initialRenderRef = useRef(true);

  const [state, formAction] = useActionState(updateDepartment, {
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
  } = useForm<EditDepartmentFormValues>({
    resolver: zodResolver(editDepartmentSchema),
    defaultValues: { name: "", iconName: "" },
  });

  const selectedIconName = watch("iconName");
  const IconPreview = getIconComponent(selectedIconName);

  useEffect(() => {
    if (open && department) {
      reset({ name: department.name, iconName: department.iconName });
      successHandledRef.current = false;
      initialRenderRef.current = true;
    } else if (!open) {
      reset({ name: "", iconName: "" });
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  }, [open, department, reset]);

  useEffect(() => {
    // guard to ensure this effect NEVER runs when the dialog is closed.
    if (!open) {
      return;
    }

    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }

    if (!state.message && !state.fieldErrors) {
      return;
    }

    const currentToastId = toastIdRef.current;

    if (state.success && !successHandledRef.current) {
      successHandledRef.current = true;
      toast.success(state.message || "Department updated successfully!", {
        id: currentToastId ?? undefined,
      });
      onOpenChange(false);
      router.refresh();
    } else if (!state.success) {
      successHandledRef.current = false;
      let errorMessage = "Failed to update department. Please try again.";
      if (state.fieldErrors) {
        errorMessage = "Please check errors on the form.";
      } else if (state.message) {
        errorMessage = state.message;
      }
      toast.error(errorMessage, { id: currentToastId ?? undefined });
    }

    toastIdRef.current = null;
  }, [state, open, onOpenChange, router]);

  const onSubmit = (data: EditDepartmentFormValues) => {
    if (!department?.id) {
      toast.error("Cannot save changes: Department ID is missing.");
      return;
    }
    successHandledRef.current = false;
    toastIdRef.current = toast.loading("Saving changes...");

    const formData = new FormData();
    formData.append("departmentId", department.id);
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
          <DialogTitle>Edit Department</DialogTitle>
        </DialogHeader>
        {!department ? (
          <div className="py-10 text-center text-muted-foreground">
            Loading department data...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 py-4"
            noValidate
          >
            {/* Department Name Input */}
            <div>
              <Label htmlFor="edit-name">
                Department Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                {...register("name")}
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
              <Label htmlFor="edit-iconName">
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
                        id="edit-iconName"
                        className={`flex-grow ${
                          clientFormErrors.iconName ||
                          state.fieldErrors?.iconName
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
