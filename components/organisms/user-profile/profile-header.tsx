"use client";
import { PatientProfile } from "@/types";
import { UploadButton } from "@/lib/uploadthing";
import { updateProfileImage } from "@/lib/actions/user.actions";
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface ProfileHeaderProps {
  patientData: PatientProfile;
  appointmentId?: string;
}

export default function ProfileHeader({
  patientData,
  appointmentId,
}: ProfileHeaderProps) {
  // --- State and Hooks ---
  const { data: session, update: updateSession } = useSession();
  const [currentImage, setCurrentImage] = useState<string | undefined>(
    patientData.image
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  // --- Handlers ---

  /**
   * Handles the successful upload of a new image to UploadThing.
   * It triggers the server action to update the database, preloads the new image,
   * updates the session, and updates the UI.
   * @param {Array<{url: string}>} res The response from UploadThing containing the new image URL.
   */
  //   const handleUploadComplete =

  /**
   * Handles errors during the upload process.
   * @param {Error} error The error object from UploadThing.
   */
  const handleUploadError = (error: Error) => {
    toast.error(`Upload failed: ${error.message}`);
    setIsProcessing(false);
  };

  const handleReturnToBooking = () => {
    if (appointmentId) {
      router.push(
        `/appointments/patient-details?appointmentId=${appointmentId}`
      );
    } else {
      toast.error(
        "Could not find the appointment details. Please make a fresh appointment"
      );
    }
  };

  // --- Render ---
  return (
    <div className="flex items-center gap-6 mb-10 md:mb-12">
      {/* Avatar and Upload Button Container */}
      <div className="relative group">
        <Avatar className="w-24 h-24 text-3xl ">
          <AvatarImage
            src={currentImage}
            alt={patientData.name || "Profile"}
            className="object-cover"
          />
          <AvatarFallback>
            {patientData.name?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        <div
          className={`aboslute inset-0 rounded-full ${
            isProcessing ? "pointer-events-none" : "cursor-pointer"
          }`}
        >
          <div className="absolute inset-0 bg-background-4 bg-opacity-50 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center transition-opacity duration-300">
            <Camera className="h-8 w-8 text-white " />
          </div>

          {/* Invisible UploadThing Button */}
          <div className="absolute inset-0 opacity-0">
            <UploadButton
              endpoint="imageUploader"
              onUploadBegin={() => setIsProcessing(true)}
              onClientUploadComplete={async (res) => {
                if (!res || res.length === 0) {
                  toast.error("Upload failed. Please try again later");
                  setIsProcessing(false);
                  return;
                }
                const newImageUrl = res[0].ufsUrl;

                // Call the server action to update the user's profile image in the database
                const response = await updateProfileImage(newImageUrl);

                if (response.success) {
                  // Preload the new image to prevent flickering
                  const img = new window.Image();
                  img.src = newImageUrl;
                  img.onload = async () => {
                    // Update the local state to display the new image
                    setCurrentImage(newImageUrl);

                    // Update the NextAuth session to reflect the change across the app
                    await updateSession({
                      ...session,
                      user: { ...session?.user, image: newImageUrl },
                    });

                    toast.success("Profile image updated successfully!");
                    setIsProcessing(false);
                  };
                  img.onerror = () => {
                    toast.error(
                      "Failed to upload the image. Please try again."
                    );
                    setIsProcessing(false);
                  };
                } else {
                  toast.error(
                    response.message ||
                      "Failed to update image. Please try again."
                  );
                  setIsProcessing(false);
                  return;
                }
              }}
              onUploadError={handleUploadError}
              //   appearance={{
              //     // Style the button to be completely invisible
              //     button: "h-full w-full ut-hidden",
              //     container: "h-full w-full",
              //     allowedContent: "ut-hidden",
              //   }}
              className="w-full h-full rounded-full"
            />
          </div>
        </div>

        {/* Loading Spinner Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-60 rounded-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* User Name */}
      <h2 className="text-text-title">{patientData.name}</h2>
      <div className="ml-auto">
        {appointmentId && (
          <Button
            variant="outline"
            size="sm"
            className="text-text-body hover:bg-accent"
            onClick={handleReturnToBooking}
          >
            Return to Booking
          </Button>
        )}
      </div>
    </div>
  );
}
