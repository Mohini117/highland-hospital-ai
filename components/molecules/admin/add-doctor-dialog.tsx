"use client";

import React, {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  ChangeEvent, // Import ChangeEvent for file input
} from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { addDoctorFormSchema } from "@/lib/validators";
import { addDoctor } from "@/lib/actions/admin.actions";

import Image from "next/image";

import { useUploadThing } from "@/lib/uploadthing";
import { Camera, Loader2 } from "lucide-react";
import { AddDoctorFormValues, DepartmentData } from "@/types";

interface AddDoctorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableDepartments: DepartmentData[];
}

export default function AddDoctorDialog({
  open,
  onOpenChange,
  availableDepartments,
}: AddDoctorDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastIdRef = useRef<string | null>(null);
  const [isSaving, startTransition] = useTransition();

  // State for new file selection and preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [state, formAction] = useActionState(addDoctor, {
    success: false,
    message: "",
    fieldErrors: undefined,
    error: undefined,
    errorType: undefined,
  });

  // Initialize the useUploadThing hook
  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    onUploadError: (error: Error) => {
      // The main onSubmit handler will catch this error
      console.error("UploadThing Error:", error.message);
    },
    onUploadBegin: () => {
      toast.dismiss(toastIdRef.current ?? undefined);
      toastIdRef.current = toast.loading("Uploading image...");
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors: clientFormErrors },
  } = useForm<AddDoctorFormValues>({
    resolver: zodResolver(addDoctorFormSchema),
    defaultValues: {
      name: "",
      email: "",
      specialty: "",
      languages: "",
      specializations: "",
      brief: "",
      imageUrl: undefined,
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
      setSelectedFile(null);
      setPreviewUrl(null);
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  }, [open, reset]);

  useEffect(() => {
    if (!state.message && !state.fieldErrors && !state.error) {
      return;
    }

    const currentToastId = toastIdRef.current;

    if (state.success) {
      toast.success(state.message || "Doctor added successfully!", {
        id: currentToastId ?? undefined,
      });
      onOpenChange(false);
    } else {
      let errorMessage = "Failed to add doctor.";
      if (state.fieldErrors) {
        errorMessage = "Please check errors on the form.";
      } else if (state.message) {
        errorMessage = state.message;
      }
      toast.error(errorMessage, { id: currentToastId ?? undefined });
    }
    toastIdRef.current = null;
  }, [state, onOpenChange]);

  // Handler for the hidden file input
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // onSubmit handler with atomic upload and submission
  const onSubmit = async (data: AddDoctorFormValues) => {
    let finalImageUrl: string | undefined = undefined;
    toastIdRef.current = toast.loading("Saving doctor details...");

    try {
      if (selectedFile) {
        toast.loading("Uploading image...", { id: toastIdRef.current });
        const uploadResponse = await startUpload([selectedFile]);

        if (!uploadResponse || uploadResponse.length === 0) {
          throw new Error("Image upload failed to return a URL.");
        }
        finalImageUrl = uploadResponse[0].url;
      }

      toast.loading("Adding doctor...", { id: toastIdRef.current });

      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key !== "imageUrl" && value) {
          formData.append(key, String(value));
        }
      });

      if (finalImageUrl) {
        formData.append("imageUrl", finalImageUrl);
      }

      startTransition(() => {
        formAction(formData);
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
        { id: toastIdRef.current ?? undefined }
      );
      toastIdRef.current = null;
    }
  };

  const isBusy = isSaving || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Add New Doctor</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 py-4"
          noValidate
        >
          {/* --- Image Upload Section --- */}
          <div className="flex items-center gap-4 mb-4">
            <div
              className="relative h-20 w-20 rounded-full border border-dashed flex items-center justify-center text-muted-foreground hover:border-primary transition-colors cursor-pointer overflow-hidden bg-muted/50"
              onClick={() => !isBusy && fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              ) : (
                <Camera className="h-8 w-8 text-gray-400" />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-20">
                  <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              hidden
              disabled={isBusy}
            />

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Doctor Image</Label>
              <p className="text-xs text-muted-foreground">
                Click icon to upload (Max 4MB)
              </p>
            </div>
          </div>
          {(clientFormErrors.imageUrl || state.fieldErrors?.imageUrl) && (
            <p className="text-xs text-red-500 mt-1">
              {clientFormErrors.imageUrl?.message ||
                state.fieldErrors?.imageUrl?.[0]}
            </p>
          )}

          {/* --- Form Fields --- */}
          {/* Email */}
          <div>
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              disabled={isBusy}
              className={
                clientFormErrors.email || state.fieldErrors?.email
                  ? "border-red-500"
                  : ""
              }
            />
            {clientFormErrors.email && (
              <p className="text-xs text-red-500 mt-1">
                {clientFormErrors.email?.message}
              </p>
            )}
            {state.fieldErrors?.email && (
              <p className="text-xs text-red-500 mt-1">
                {state.fieldErrors?.email?.[0]}
              </p>
            )}
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name-add-doc">
              Name of Doctor <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name-add-doc"
              placeholder="Enter doctor name"
              {...register("name")}
              disabled={isBusy}
              className={
                clientFormErrors.name || state.fieldErrors?.name
                  ? "border-red-500"
                  : ""
              }
            />
            {clientFormErrors.name && (
              <p className="text-xs text-red-500 mt-1">
                {clientFormErrors.name?.message}
              </p>
            )}
            {state.fieldErrors?.name && (
              <p className="text-xs text-red-500 mt-1">
                {state.fieldErrors?.name?.[0]}
              </p>
            )}
          </div>
          {/* Credentials */}
          <div>
            <Label htmlFor="cred-add-doc">
              Credentials of Doctor <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cred-add-doc"
              placeholder="Enter doctor credentials (e.g., MD, DO)"
              {...register("credentials")}
              disabled={isBusy}
              className={
                clientFormErrors.credentials || state.fieldErrors?.credentials
                  ? "border-red-500"
                  : ""
              }
            />
            {clientFormErrors.credentials && (
              <p className="text-xs text-red-500 mt-1">
                {clientFormErrors.credentials?.message}
              </p>
            )}
            {state.fieldErrors?.credentials && (
              <p className="text-xs text-red-500 mt-1">
                {state.fieldErrors?.credentials?.[0]}
              </p>
            )}
          </div>

          {/* Department */}
          <div>
            <Label htmlFor="specialty">
              Department <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="specialty"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isBusy}
                >
                  <SelectTrigger
                    className={
                      clientFormErrors.specialty || state.fieldErrors?.specialty
                        ? "border-red-500"
                        : ""
                    }
                  >
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDepartments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {clientFormErrors.specialty && (
              <p className="text-xs text-red-500 mt-1">
                {clientFormErrors.specialty?.message}
              </p>
            )}
            {state.fieldErrors?.specialty && (
              <p className="text-xs text-red-500 mt-1">
                {state.fieldErrors?.specialty?.[0]}
              </p>
            )}
          </div>

          {/* Other fields... */}
          <div>
            <Label htmlFor="languages-add-doc">
              Languages Spoken <span className="text-red-500">*</span>
            </Label>
            <Input
              id="languages-add-doc"
              {...register("languages")}
              disabled={isBusy}
              className={
                clientFormErrors.languages || state.fieldErrors?.languages
                  ? "border-red-500"
                  : ""
              }
            />
            {clientFormErrors.languages && (
              <p className="text-xs text-red-500 mt-1">
                {clientFormErrors.languages?.message}
              </p>
            )}
            {state.fieldErrors?.languages && (
              <p className="text-xs text-red-500 mt-1">
                {state.fieldErrors?.languages?.[0]}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="specializations-add-doc">
              Specialization <span className="text-red-500">*</span>
            </Label>
            <Input
              id="specializations-add-doc"
              {...register("specializations")}
              disabled={isBusy}
              className={
                clientFormErrors.specializations ||
                state.fieldErrors?.specializations
                  ? "border-red-500"
                  : ""
              }
            />
            {clientFormErrors.specializations && (
              <p className="text-xs text-red-500 mt-1">
                {clientFormErrors.specializations?.message}
              </p>
            )}
            {state.fieldErrors?.specializations && (
              <p className="text-xs text-red-500 mt-1">
                {state.fieldErrors?.specializations?.[0]}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="brief-add-doc">
              About Doctor <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="brief-add-doc"
              {...register("brief")}
              disabled={isBusy}
              className={
                clientFormErrors.brief || state.fieldErrors?.brief
                  ? "border-red-500"
                  : ""
              }
            />
            {clientFormErrors.brief && (
              <p className="text-xs text-red-500 mt-1">
                {clientFormErrors.brief?.message}
              </p>
            )}
            {state.fieldErrors?.brief && (
              <p className="text-xs text-red-500 mt-1">
                {state.fieldErrors?.brief?.[0]}
              </p>
            )}
          </div>

          {!state.success && state.message && !state.fieldErrors && (
            <p className="text-sm text-red-500">{state.message}</p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isBusy}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isBusy}>
              {isBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Add Doctor"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
