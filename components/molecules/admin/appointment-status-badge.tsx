"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { type VariantProps } from "class-variance-authority";
import { AppointmentStatus } from "@/lib/generated/prisma";
import { badgeVariants } from "@/components/ui/badge";

// Props definition for the component
interface AppointmentStatusBadgeProps {
  status?: AppointmentStatus | null;
}

export default function AppointmentStatusBadge({
  status,
}: AppointmentStatusBadgeProps) {
  //fallback
  if (!status) {
    return <Badge variant="secondary">Unknown</Badge>;
  }

  let statusText: string;
  let badgeVariant: VariantProps<typeof badgeVariants>["variant"] = "secondary";

  // Determine the badge variant based on the status
  switch (status) {
    case AppointmentStatus.BOOKING_CONFIRMED:
      badgeVariant = "warning";
      statusText = "Upcoming";
      break;
    case AppointmentStatus.COMPLETED:
      badgeVariant = "success";
      statusText = "Completed";
      break;
    case AppointmentStatus.CANCELLED:
      badgeVariant = "destructive";
      statusText = "Cancelled";
      break;
    case AppointmentStatus.NO_SHOW:
      badgeVariant = "destructive";
      statusText = "No Show";
      break;
    case AppointmentStatus.PAYMENT_PENDING:
      badgeVariant = "warning";
      statusText = "Pending Payment";
      break;
    case AppointmentStatus.CASH:
      badgeVariant = "secondary";
      statusText = "Pay at Counter";
      break;
    default:
      // This default case will handle any unexpected status values gracefully
      badgeVariant = "secondary";
      statusText = "Undefined";
      break;
  }

  // Render the Shadcn Badge component with the determined variant and text
  return <Badge variant={badgeVariant}>{statusText}</Badge>;
}
