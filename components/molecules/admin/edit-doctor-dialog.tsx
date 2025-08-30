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
import { editDoctorFormSchema } from "@/lib/validators";
import { updateDoctor } from "@/lib/actions/admin.actions";
import { AdminDoctorData } from "@/types";

import Image from "next/image";

import { useUploadThing } from "@/lib/uploadthing"; // Import the hook instead of the button component
import { Camera, Loader2 } from "lucide-react"; // Add Loader2 for saving indicator

import {
  EditDoctorFormValues,
  DepartmentData,
  ServerActionResponse,
} from "@/types";

interface EditDoctorDialogProps {
  doctor: AdminDoctorData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableDepartments: DepartmentData[];
}

// Define ActionResponseState to match ServerActionResponse
type ActionResponseState = ServerActionResponse<null>;

export default function EditDoctorDialog({
  doctor,
  open,
  onOpenChange,
  availableDepartments,
}: EditDoctorDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  const [isSaving, setIsSaving] = useState(false); // Combined saving state
  const successHandledRef = useRef(false);

  const [isActionPending, startTransition] = useTransition();
  const initialRenderForDoctorRef = useRef(true);

  const toastIdRef = useRef<string | null>(null);

  // State for image management
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null); // Existing image URL
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // New file selected by user
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // URL for previewing selected file

  // Server action state
  const [state, formAction] = useActionState<ActionResponseState, FormData>(
    updateDoctor,
    {
      success: false,
      message: "",
      fieldErrors: undefined, // Use fieldErrors
      error: undefined,
      errorType: undefined,
    }
  );

  const { startUpload, isUploading: isUploadThingUploading } = useUploadThing(
    "imageUploader",
    {
      onClientUploadComplete: (res) => {
        console.log(
          "UploadThing onClientUploadComplete (URL handled in onSubmit):",
          res
        );
        toast.success("Image ready for saving!", {
          id: "doctorEditImageUploadToast",
        });
      },
      onUploadError: (error: Error) => {
        toast.error(`Image upload failed: ${error.message}`, {
          id: "doctorEditImageUploadToast",
        });
      },
      onUploadBegin: (fileName: string) => {
        console.log("Image upload starting for:", fileName);
        toast.loading("Uploading image...", {
          id: "doctorEditImageUploadToast",
        });
      },
    }
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors: clientFormErrors }, // Renamed for clarity
  } = useForm<EditDoctorFormValues>({
    resolver: zodResolver(editDoctorFormSchema),
    defaultValues: {},
  });

  // --- Effect 1: Reset form and image state when dialog opens/doctor changes ---
  useEffect(() => {
    if (open && doctor) {
      const formatMultiValue = (
        value: string[] | string | null | undefined
      ): string => {
        if (Array.isArray(value)) return value.join(", ");
        return typeof value === "string" ? value : "";
      };
      reset({
        name: doctor.name || "",
        email: doctor.email || "",
        credentials: doctor.credentials || "",
        specialty: doctor.specialty || "",
        languages: formatMultiValue(doctor.languages),
        specializations: formatMultiValue(doctor.specializations),
        brief: doctor.brief || "",
      });
      setCurrentImageUrl(doctor.image || null);
      setSelectedFile(null);
      setPreviewUrl(null);
      successHandledRef.current = false;
      initialRenderForDoctorRef.current = true;
      setIsSaving(false);
      if (toastIdRef.current) {
        // Dismiss any old action toast on open
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      toast.dismiss("doctorEditImageUploadToast"); // Dismiss image toast too
    } else if (!open) {
      setCurrentImageUrl(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsSaving(false);

      if (toastIdRef.current) {
        // Dismiss action toast on close
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      toast.dismiss("doctorEditImageUploadToast"); // Dismiss image toast too
    }
  }, [doctor, open, reset]);

  const previousStateRef = useRef<typeof state | null>(null);

  // useEffect for the main action loading toast
  useEffect(() => {
    if (isActionPending && !isUploadThingUploading) {
      // Show action toast only if not already showing image upload toast
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
      toastIdRef.current = toast.loading("Saving changes...");
    }
  }, [isActionPending, isUploadThingUploading]);

  // Handle file selection from the input
  useEffect(() => {
    if (!open) return;
    if (initialRenderForDoctorRef.current && open) {
      initialRenderForDoctorRef.current = false;
      previousStateRef.current = state;
      return;
    }
    if (!state || state === previousStateRef.current) return;

    previousStateRef.current = state;
    const currentActionToastId = toastIdRef.current;

    setIsSaving(false); // Action has completed (successfully or not)

    if (state.success) {
      if (!successHandledRef.current) {
        if (currentActionToastId) {
          toast.success(state.message || "Doctor updated successfully!", {
            id: currentActionToastId,
          });
          toastIdRef.current = null;
        } else {
          toast.success(state.message || "Doctor updated successfully!");
        }
        successHandledRef.current = true;
        onOpenChange(false);
      }
    } else {
      // state.success is false
      successHandledRef.current = false;
      if (state.fieldErrors) {
        // Prioritize field errors for toast
        if (currentActionToastId) {
          toast.error("Please check errors on the form.", {
            id: currentActionToastId,
          });
          toastIdRef.current = null;
        } else {
          toast.error("Please check errors on the form.");
        }
      } else if (state.message) {
        if (currentActionToastId) {
          toast.error(state.message, { id: currentActionToastId });
          toastIdRef.current = null;
        } else {
          toast.error(state.message);
        }
      } else if (currentActionToastId) {
        // Fallback for other errors if loading toast was shown
        toast.error("Failed to update doctor. Please try again.", {
          id: currentActionToastId,
        });
        toastIdRef.current = null;
      }

      if (state.error) {
        console.error(
          "EditDoctorDialog - Server Action Error:",
          state.error,
          "Type:",
          state.errorType
        );
      }
    }
  }, [state, open, onOpenChange, isActionPending, isUploadThingUploading]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setCurrentImageUrl(null); // Clear the existing image URL if a new file is selected
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --- SUBMIT HANDLER ---

  const onSubmit = async (data: EditDoctorFormValues) => {
    if (!doctor?.id) {
      toast.error("Cannot update: Doctor ID is missing.");
      return;
    }
    setIsSaving(true); // Indicate overall process start
    successHandledRef.current = false;

    let finalImageUrl: string | null | undefined = currentImageUrl;

    try {
      // Upload new file if selected
      if (selectedFile) {
        console.log("[onSubmit] Starting image upload...");
        const uploadResponse = await startUpload([selectedFile]);
        console.log("[onSubmit] Image upload finished:", uploadResponse);

        if (!uploadResponse || uploadResponse.length === 0) {
          throw new Error("Image upload failed or returned no URL.");
        }
        finalImageUrl = uploadResponse[0].url;
      } else if (currentImageUrl === null && !selectedFile) {
        finalImageUrl = null; // Signal removal
      }

      // 2. Prepare FormData
      const formData = new FormData();
      formData.append("doctorId", doctor.id);
      Object.entries(data).forEach(([key, value]) => {
        if (key !== "imageUrl" && value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      if (finalImageUrl === null) {
        formData.append("imageUrl", "");
      } else if (finalImageUrl) {
        formData.append("imageUrl", finalImageUrl);
      }

      console.log(
        "[onSubmit] FormData prepared, calling formAction within startTransition:"
      );
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      // 3. Call the server action WRAPPED IN startTransition
      startTransition(() => {
        formAction(formData);
      });
    } catch (error) {
      console.error("[onSubmit] Error during submission or upload:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "An error occurred during save."
      );
      setIsSaving(false); // Reset on error
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Edit Doctor Profile</DialogTitle>
        </DialogHeader>

        {!doctor ? (
          <div className="py-10 text-center text-muted-foreground">
            Loading doctor data...
          </div>
        ) : (
          <form
            ref={formRef}
            onSubmit={handleSubmit(onSubmit)} // Use RHF's handleSubmit
            className="space-y-4 py-4"
            noValidate
          >
            {/* --- Image Upload Section --- */}
            <div className="flex items-center gap-4 mb-4">
              {/* Image Preview Area */}
              <div
                className="relative h-20 w-20 rounded-full border border-dashed flex items-center justify-center text-muted-foreground hover:border-primary transition-colors cursor-pointer overflow-hidden bg-muted/50"
                onClick={() => fileInputRef.current?.click()} // Trigger file input on click
              >
                {previewUrl ? ( // Prioritize preview of selected file
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                ) : currentImageUrl ? ( // Show existing image if no new file/preview
                  <Image
                    src={currentImageUrl}
                    alt="Current doctor image"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Camera className="h-8 w-8 text-gray-400" /> // Placeholder icon
                )}
                {/* Clickable area text */}
                {!previewUrl && !currentImageUrl && (
                  <span className="absolute bottom-1 text-[10px] text-center text-gray-500 px-1">
                    Click to upload
                  </span>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/gif, image/webp" // Specify accepted types
                hidden // Hide the default input UI
              />

              {/* Upload/Remove Text and Button */}
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="doctor-image-upload"
                  className="text-sm font-medium"
                >
                  Doctor Image
                </Label>
                <p className="text-xs text-muted-foreground">
                  Click icon to upload (Max 4MB)
                </p>
              </div>
            </div>
            {/* --- End Image Upload Section --- */}
            {/* Display image field errors */}
            {(clientFormErrors.imageUrl || state.fieldErrors?.imageUrl) && (
              <p className="text-xs text-red-500 mt-1">
                {clientFormErrors.imageUrl?.message ||
                  state.fieldErrors?.imageUrl?.[0]}
              </p>
            )}

            {/* --- Form Fields (Email, Name, etc.) --- */}
            {/* Email */}
            <div>
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                className={
                  clientFormErrors.email || state.fieldErrors?.email
                    ? "border-red-500"
                    : ""
                }
                aria-invalid={
                  !!clientFormErrors.email || !!state.fieldErrors?.email
                }
                disabled={isSaving}
              />
              {clientFormErrors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {" "}
                  {clientFormErrors.email?.message}{" "}
                </p>
              )}
              {state.fieldErrors?.email && (
                <p className="text-xs text-red-500 mt-1">
                  {" "}
                  {state.fieldErrors?.email?.[0]}{" "}
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="name">
                Name of Doctor <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter doctor name"
                {...register("name")}
                className={
                  clientFormErrors.name || state.fieldErrors?.name
                    ? "border-red-500"
                    : ""
                }
                aria-invalid={
                  !!clientFormErrors.name || !!state.fieldErrors?.name
                }
                disabled={isSaving}
              />
              {clientFormErrors.name && (
                <p className="text-xs text-red-500 mt-1">
                  {" "}
                  {clientFormErrors.name?.message}{" "}
                </p>
              )}
              {state.fieldErrors?.name && (
                <p className="text-xs text-red-500 mt-1">
                  {" "}
                  {state.fieldErrors?.name?.[0]}{" "}
                </p>
              )}
            </div>
            {/* Credentials */}
            <div>
              <Label htmlFor="credentials">
                Credentials of Doctor <span className="text-red-500">*</span>
              </Label>
              <Input
                id="credentials"
                placeholder="Enter doctor credentials"
                {...register("credentials")}
                className={
                  clientFormErrors.credentials || state.fieldErrors?.credentials
                    ? "border-red-500"
                    : ""
                }
                aria-invalid={
                  !!clientFormErrors.credentials ||
                  !!state.fieldErrors?.credentials
                }
                disabled={isSaving}
              />
              {clientFormErrors.credentials && (
                <p className="text-xs text-red-500 mt-1">
                  {" "}
                  {clientFormErrors.credentials?.message}{" "}
                </p>
              )}
              {state.fieldErrors?.credentials && (
                <p className="text-xs text-red-500 mt-1">
                  {" "}
                  {state.fieldErrors?.credentials?.[0]}{" "}
                </p>
              )}
            </div>

            {/* Department Select */}
            <div>
              <Label htmlFor="specialty-edit-doc">
                Department <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="specialty"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    disabled={isSaving}
                  >
                    <SelectTrigger
                      id="specialty-edit-doc"
                      className={
                        clientFormErrors.specialty ||
                        state.fieldErrors?.specialty
                          ? "border-red-500"
                          : ""
                      }
                      aria-invalid={
                        !!clientFormErrors.specialty ||
                        !!state.fieldErrors?.specialty
                      }
                    >
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDepartments.length > 0 ? (
                        availableDepartments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.name}>
                            {dept.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No departments found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {clientFormErrors.specialty && (
                <p className="text-xs text-red-500 mt-1">
                  {" "}
                  {clientFormErrors.specialty?.message}{" "}
                </p>
              )}
              {state.fieldErrors?.specialty && (
                <p className="text-xs text-red-500 mt-1">
                  {" "}
                  {state.fieldErrors?.specialty?.[0]}{" "}
                </p>
              )}
            </div>
            {/* Languages */}
            <div>
              <Label htmlFor="languages-edit-doc">
                Languages Spoken <span className="text-red-500">*</span>
              </Label>
              <Input
                id="languages-edit-doc"
                placeholder="e.g. English, Spanish (comma-separated)"
                {...register("languages")}
                className={
                  clientFormErrors.languages || state.fieldErrors?.languages
                    ? "border-red-500"
                    : ""
                }
                aria-invalid={
                  !!clientFormErrors.languages || !!state.fieldErrors?.languages
                }
                disabled={isSaving}
              />
              {clientFormErrors.languages && (
                <p className="text-xs text-red-500 mt-1">
                  {" "}
                  {clientFormErrors.languages?.message}{" "}
                </p>
              )}
              {state.fieldErrors?.languages && (
                <p className="text-xs text-red-500 mt-1">
                  {" "}
                  {state.fieldErrors?.languages?.[0]}{" "}
                </p>
              )}
            </div>
            {/* Specializations */}
            <div>
              <Label htmlFor="specializations-edit-doc">
                Specialization <span className="text-red-500">*</span>
              </Label>
              <Input
                id="specializations-edit-doc"
                placeholder="Enter specializations (comma-separated)"
                {...register("specializations")}
                className={
                  clientFormErrors.specializations ||
                  state.fieldErrors?.specializations
                    ? "border-red-500"
                    : ""
                }
                aria-invalid={
                  !!clientFormErrors.specializations ||
                  !!state.fieldErrors?.specializations
                }
                disabled={isSaving}
              />
              {clientFormErrors.specializations && (
                <p className="text-xs text-red-500 mt-1">
                  {" "}
                  {clientFormErrors.specializations?.message}{" "}
                </p>
              )}
              {state.fieldErrors?.specializations && (
                <p className="text-xs text-red-500 mt-1">
                  {" "}
                  {state.fieldErrors?.specializations?.[0]}{" "}
                </p>
              )}
            </div>
            {/* About Doctor */}
            <div>
              <Label htmlFor="brief-edit-doc">
                About Doctor <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="brief-edit-doc"
                placeholder="Enter doctor description"
                {...register("brief")}
                className={`min-h-[100px] ${
                  clientFormErrors.brief || state.fieldErrors?.brief
                    ? "border-red-500"
                    : ""
                }`}
                aria-invalid={
                  !!clientFormErrors.brief || !!state.fieldErrors?.brief
                }
                disabled={isSaving}
              />
              {clientFormErrors.brief && (
                <p className="text-xs text-red-500 mt-1">
                  {" "}
                  {clientFormErrors.brief?.message}{" "}
                </p>
              )}
              {state.fieldErrors?.brief && (
                <p className="text-xs text-red-500 mt-1">
                  {" "}
                  {state.fieldErrors?.brief?.[0]}{" "}
                </p>
              )}
            </div>

            {/* Display general server error message */}
            {!state.success && state.message && !state.fieldErrors && (
              <p className="text-sm text-red-500">{state.message}</p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSaving || isUploadThingUploading}
              >
                {isSaving ? (
                  <>
                    {" "}
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...{" "}
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
