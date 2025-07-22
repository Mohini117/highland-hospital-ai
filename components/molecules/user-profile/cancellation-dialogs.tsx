"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CancellationDialogsProps {
  isInfoOpen: boolean;
  onInfoOpenChange: (isOpen: boolean) => void;
  isConfirmOpen: boolean;
  onConfirmOpenChange: (isOpen: boolean) => void;
  onConfirmCancel: () => void;
  isPending: boolean;
}

export default function CancellationDialogs({
  isInfoOpen,
  onInfoOpenChange,
  isConfirmOpen,
  onConfirmOpenChange,
  onConfirmCancel,
  isPending,
}: CancellationDialogsProps) {
  return (
    <>
      {/* Dialog 1: Information about how to cancel */}
      <Dialog open={isInfoOpen} onOpenChange={onInfoOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Cancel Appointment
            </DialogTitle>
            <DialogDescription className="pt-4 text-base text-gray-600 dark:text-gray-300">
              Please call the Admin on number (555) 123-4567 to cancel the
              appointment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                OK
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Confirmation before cancelling a cash appointment */}
      <Dialog open={isConfirmOpen} onOpenChange={onConfirmOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Cancel Appointment
            </DialogTitle>
            <DialogDescription className="pt-4 text-base text-gray-600 dark:text-gray-300">
              Are you sure you want to cancel this appointment?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 sm:justify-end space-x-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="brand"
                disabled={isPending}
                className="text-text-caption-2"
              >
                No
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="outline"
              onClick={onConfirmCancel}
              disabled={isPending}
              className="border border-border"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
