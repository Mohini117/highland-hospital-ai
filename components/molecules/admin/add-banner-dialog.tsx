"use client";

import React, { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Camera, Loader2 } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";

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
import { addBanner } from "@/lib/actions/settings.actions";

interface AddBannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddBannerDialog({
  open,
  onOpenChange,
}: AddBannerDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [uploadedImage, setUploadedImage] = useState<{
    url: string;
    key: string;
  } | null>(null);

  // A single state to manage all async operations
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isLoading = isProcessing || isPending;

  // Effect to reset state when the dialog is closed
  useEffect(() => {
    if (!open) {
      setName("");
      setUploadedImage(null);
      setIsProcessing(false);
    }
  }, [open]);

  const handleSaveBanner = () => {
    if (!name || !uploadedImage) {
      toast.error("Please enter a name and upload an image first.");
      return;
    }

    const toastId = toast.loading("Saving banner...");

    startTransition(async () => {
      const result = await addBanner({
        name,
        imageUrl: uploadedImage.url,
        fileKey: uploadedImage.key,
      });

      if (result.success) {
        toast.success(result.message || "Banner added!", { id: toastId });
        onOpenChange(false); // Close the dialog
        router.refresh();
      } else {
        toast.error(result.message || "Failed to save banner.", {
          id: toastId,
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Upload New Banner</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            {/* Show preview if image is uploaded, otherwise show UploadButton */}
            {uploadedImage ? (
              <div className="relative h-20 w-20 rounded border overflow-hidden">
                <Image
                  src={uploadedImage.url}
                  alt="Banner preview"
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="relative h-20 w-20 rounded border border-dashed flex items-center justify-center text-muted-foreground bg-muted/50 overflow-hidden">
                {isProcessing ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-8 w-8" />
                    <div className="absolute inset-0 opacity-0">
                      <UploadButton
                        endpoint="imageUploader" // Use UploadThing endpoint
                        onUploadBegin={() => setIsProcessing(true)}
                        onClientUploadComplete={(res) => {
                          if (res && res.length > 0) {
                            setUploadedImage({
                              url: res[0].ufsUrl,
                              key: res[0].key,
                            });
                            toast.success("Image uploaded!");
                          }
                          setIsProcessing(false);
                        }}
                        onUploadError={(error: Error) => {
                          toast.error(`Upload error: ${error.message}`);
                          setIsProcessing(false);
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
            <div>
              <Label>Banner Image</Label>
              <p className="text-xs text-muted-foreground">
                First, upload an image (Max 4MB).
              </p>
            </div>
          </div>
          <div>
            <Label htmlFor="name">Banner Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Banner"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSaveBanner}
            // Button is disabled until both name and image are present
            disabled={!name || !uploadedImage || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isProcessing ? "Uploading..." : "Saving..."}
              </>
            ) : (
              "Add Banner"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
