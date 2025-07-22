"use client";
import { Appointment, ReviewFormValues } from "@/types";
import { reviewFormSchema } from "@/lib/validators";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  appointment: Appointment;
  onSubmit: (data: ReviewFormValues) => void;
  isSubmitting: boolean;
}

export default function ReviewDialog({
  isOpen,
  onOpenChange,
  appointment,
  onSubmit,
  isSubmitting,
}: ReviewDialogProps) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const {
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
    register,
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 0,
      reviewText: "",
    },
  });

  const currentRating = watch("rating");

  const handleFormSubmit = (data: ReviewFormValues) => {
    onSubmit(data);
  };

  // Reset form when dialog is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[512px] bg-background rounded-lg p-4 md:p-6 border-none">
        <DialogHeader>
          <DialogTitle className="text-text-title text-base md:text-lg font-semibold">
            Review Appointment with {appointment.doctorName}
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm text-text-body font-normal">
            {appointment.date} • {appointment.time}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="space-y-6 pt-2"
        >
          {/* Star Rating Field */}
          <div className="space-y-2">
            <Label>Rating</Label>
            <Controller
              control={control}
              name="rating"
              render={({ field }) => (
                <div
                  className="flex items-center space-x-1"
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((starValue) => (
                    <Star
                      key={starValue}
                      className={cn(
                        "h-8 w-8 cursor-pointer transition-colors",
                        hoveredRating >= starValue || currentRating >= starValue
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                      )}
                      onMouseEnter={() => setHoveredRating(starValue)}
                      onClick={() => field.onChange(starValue)}
                    />
                  ))}
                </div>
              )}
            />
            {errors.rating && (
              <p className="text-sm font-medium text-destructive">
                {errors.rating.message}
              </p>
            )}
          </div>

          {/* Review Text Field */}
          <div className="space-y-2">
            <Label htmlFor="reviewText">Your Review</Label>
            <Textarea
              id="reviewText"
              placeholder="Share your experience..."
              className="resize-none"
              rows={4}
              {...register("reviewText")}
            />
            {errors.reviewText && (
              <p className="text-sm font-medium text-destructive">
                {errors.reviewText.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                className="border border-border"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
