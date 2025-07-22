"use client";
import { Appointment } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dot, Star } from "lucide-react";

interface AppointmentCardProps {
  appointment: Appointment;
  onCancelInfo: () => void;
  onConfirmCancelCash: (appointment: Appointment) => void;
  onReview: (appointment: Appointment) => void;
  isPending: boolean;
}

const getStatusBadgeClasses = (status: Appointment["status"]) => {
  switch (status) {
    case "upcoming":
      return "bg-primary-subtle text-data-purple dark:bg-blue-900/50 dark:text-blue-300";
    case "completed":
      return "bg-positive-3 text-data-green dark:bg-green-900/50 dark:text-green-300";
    case "cancelled":
      return "bg-alert-3 text-data-red dark:bg-red-900/50 dark:text-red-300";
    case "no show":
      return "bg-notice-3 text-data-yellow dark:bg-yellow-900/50 dark:text-yellow-300";
    case "cash payment":
      return "bg-primary-subtle text-data-purple dark:bg-blue-900/50 dark:text-blue-300";
    default:
      return "bg-gray-200 text-gray-700";
  }
};

export default function AppointmentCard({
  appointment,
  onCancelInfo,
  onConfirmCancelCash,
  onReview,
  isPending,
}: AppointmentCardProps) {
  const { doctorName, date, time, status, isReviewed } = appointment;

  /**
   * Renders the action button(s) for the appointment card based on its status.
   */
  const renderActionButton = () => {
    switch (status) {
      case "upcoming":
        return (
          <Button
            variant="outline"
            size="default"
            onClick={onCancelInfo}
            className="text-alert-1 border-alert-2 hover:bg-red-50 hover:text-alert-1"
            disabled={isPending}
          >
            Cancel
          </Button>
        );
      case "cash payment":
        return (
          <Button
            variant="outline"
            size="default"
            onClick={() => onConfirmCancelCash(appointment)}
            className="text-alert-1 border-alert-2 hover:bg-red-50 hover:text-alert-1"
            disabled={isPending}
          >
            Cancel
          </Button>
        );
      case "completed":
        if (isReviewed) {
          return (
            <Button
              variant="outline"
              size="default"
              disabled
              className="text-grey-500 border-gray-300"
            >
              <Star className="mr-2 h-4 w-4 fill-[#FACC15] text-[#FACC15]" />
              Reviewed
            </Button>
          );
        }
        return (
          <Button
            variant="outline"
            size="default"
            onClick={() => onReview(appointment)}
            className="text-primary border-primary-hover hover:bg-primary/10 hover:text-primary"
            disabled={isPending}
          >
            <Star className="mr-2 h-4 w-4" />
            Leave Review
          </Button>
        );
      case "cancelled":
      case "no show":
      default:
        return null; // No button for these statuses
    }
  };

  return (
    <Card
      key={appointment.id}
      className="w-full bg-background border border-border-2 rounded-lg p-0"
    >
      <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
        <div className="flex flex-col flex-grow">
          <h4 className=" text-text-title">{doctorName}</h4>
          <div className="flex items-center body-regular text-text-title">
            <span>{date}</span>
            <Dot size={14} className="felx-shrink-0" />
            <span>{time}</span>
          </div>
        </div>
        <div className="flex gap-2 md:gap-4 items-center flex-shrink-0 w-full md:w-auto justify-start md:justify-end">
          <Badge
            variant="outline"
            className={`capitalize ${getStatusBadgeClasses(status)} border-0`}
          >
            {status}
          </Badge>
          {renderActionButton()}
        </div>
      </CardContent>
    </Card>
  );
}
