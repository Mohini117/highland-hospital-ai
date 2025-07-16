"use client";

import { PatientProfile } from "@/types";
import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

// --- UI Components (Assuming these are in your project) ---
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// --- Server Action and Validator ---
import { updateUserProfile } from "@/lib/actions/user.actions"; // Adjust path as needed
import { patientProfileUpdateSchema } from "@/lib/validators";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientData: PatientProfile;
}

type ProfileUpdateInput = Omit<PatientProfile, "id" | "email">;

export default function EditProfileModal({
  isOpen,
  onClose,
  patientData,
}: EditProfileModalProps) {
  const [isPending, startTransition] = useTransition();
  const { data: session, update } = useSession();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(patientProfileUpdateSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      address: "",
      // Format the date for the input type='date' (YYYY-MM-DD)
      dateOfBirth: "",
    },
  });

  // Reset the form when the modal is opened with new data
  useEffect(() => {
    if (isOpen) {
      reset({
        name: patientData.name || "",
        phoneNumber: patientData.phoneNumber || "",
        address: patientData.address || "",
        dateOfBirth: patientData.dateOfBirth
          ? new Date(patientData.dateOfBirth).toISOString().split("T")[0]
          : "",
      });
    }
  }, [isOpen, patientData, reset]);

  const onSubmit = (data: ProfileUpdateInput) => {
    const submissionToastId = toast.loading("Updating profile...");
    startTransition(async () => {
      // The date from the form is already a string in 'YYYY-MM-DD' format.
      // The server action's Zod schema will coerce it into a Date object.
      const result = await updateUserProfile(data);

      if (result.success) {
        await update({
          ...session,
          user: { ...session?.user, name: data.name },
        });
        toast.success(result.message || "Profile updated successfully!", {
          id: submissionToastId,
        });
        onClose();
        router.refresh();
      } else {
        // Handle field-specific errors from the server
        if (result.fieldErrors) {
          // This is a basic way to show errors. You might want a more
          // sophisticated display for each field.
          const errorMessages = Object.values(result.fieldErrors)
            .flat()
            .join("\n");
          toast.error(errorMessages || "Please check your input.", {
            id: submissionToastId,
          });
        } else {
          toast.error(result.message || "An unknown error occurred.", {
            id: submissionToastId,
          });
        }
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-white rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              {...register("name")}
              className="w-full"
              disabled={isPending}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              {...register("phoneNumber")}
              className="w-full"
              disabled={isPending}
            />
            {errors.phoneNumber && (
              <p className="text-sm text-red-500">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              {...register("address")}
              className="w-full min-h-[80px]"
              disabled={isPending}
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              {...register("dateOfBirth")}
              className="w-full"
              disabled={isPending}
            />
            {errors.dateOfBirth && (
              <p className="text-sm text-red-500">
                {errors.dateOfBirth.message}
              </p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || !isDirty}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
