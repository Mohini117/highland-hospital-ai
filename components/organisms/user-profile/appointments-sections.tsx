import { Appointment } from "@/types";
import AppointmentCard from "@/components/molecules/user-profile/appointment-card";
import PaginationControls from "@/components/molecules/pagination-controls";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AppointmentsSectionProps {
  appointments: Appointment[];
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onCancelInfo: () => void;
  onConfirmCancelCash: (appointment: Appointment) => void;
  onReview: (appointment: Appointment) => void;
  isPending: boolean;
}

export default function AppointmentsSection({
  appointments,
  totalPages,
  currentPage,
  onPageChange,
  onCancelInfo,
  onConfirmCancelCash,
  onReview,
  isPending,
}: AppointmentsSectionProps) {
  return (
    <div>
      <h3 className="text-text-title mb-6">Appointments</h3>
      {appointments.length === 0 ? (
        <div className="p-6 text-center bg-background rounded-lg shadow-sm border border-border-2">
          <p className="text-text-body-subtle">No appointments found.</p>
          <Button asChild variant="brand" className="text-text-caption-2 mt-4">
            <Link href="/#our-doctors">Book an Appointment</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCancelInfo={onCancelInfo}
                onConfirmCancelCash={onConfirmCancelCash}
                onReview={onReview}
                isPending={isPending}
              />
            ))}
          </div>
          {
            /* Pagination controls can be added here if needed */
            totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                />
              </div>
            )
          }
        </>
      )}
    </div>
  );
}
