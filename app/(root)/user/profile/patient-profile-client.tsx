"use client";
import { PatientProfile, Appointment } from "@/types";
import { useEffect, useState, useTransition } from "react";
import { toast } from "react-hot-toast";
import ProfileHeader from "@/components/organisms/user-profile/profile-header";
import PersonalInformation from "@/components/organisms/user-profile/personal-information";
import EditProfileModal from "@/components/molecules/user-profile/edit-patient-profile-modal";
import AppointmentsSection from "@/components/organisms/user-profile/appointments-sections";
import CancellationDialogs from "@/components/molecules/user-profile/cancellation-dialogs";
import { cancelCashAppointment } from "@/lib/actions/shared.actions";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ReviewFormValues } from "@/types";
import { submitPatientReview } from "@/lib/actions/review.actions";
import ReviewDialog from "@/components/molecules/user-profile/review-dialog";

export default function PatientProfileClient({
  patientData,
  appointments,
  appointmentId,
  totalPages,
  currentPage,
  appointmentsError,
}: {
  patientData: PatientProfile;
  appointments: Appointment[];
  appointmentId?: string;
  totalPages: number;
  currentPage: number;
  appointmentsError?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  //https://examples.com/dashboard/users?page=1
  //pathname = /dashboard/users

  const searchParams = useSearchParams();
  //https://examples.com/dashboard/users?page=1
  //searchParams = page=1

  const [isPending, startTransition] = useTransition();

  // State variables for Modals / Dialogs
  const [isEditProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [isCancelInfoDialogOpen, setIsCancelInfoDialogOpen] = useState(false);
  const [isConfirmCancelCashDialogOpen, setIsConfirmCancelCashDialogOpen] =
    useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  //State for selected items
  const [appointToCacel, setAppointmentToCancel] = useState<Appointment | null>(
    null
  );
  const [selectedAppointmentForReview, setSelectedAppointmentForReview] =
    useState<Appointment | null>(null);

  useEffect(() => {
    if (appointmentsError) {
      toast.error("Appointments could not be loaded. Please again later");
      console.log("Appointments Error:", appointmentsError);
    }
  }, [appointmentsError]);

  // const onEdit = () => {
  //   alert("Edit clicked");
  // };

  const handlePageChange = (page: number) => {
    const currentParams = new URLSearchParams(
      Array.from(searchParams.entries())
    );
    //https://example.com/products?sort=price&category=electronics
    // ['sort','price'], ['category','electronics']
    currentParams.set("page", page.toString());
    const newUrl = `${pathname}?${currentParams.toString()}`;
    router.push(newUrl, { scroll: false });
  };

  const handleConfirmCancelCash = () => {
    if (!appointToCacel) {
      return;
    }
    const idToCancel = appointToCacel.id;
    setIsConfirmCancelCashDialogOpen(false);
    startTransition(async () => {
      const result = await cancelCashAppointment(idToCancel);
      if (result.success) {
        toast.success(result.message || "Appointment cancelled successfully.");
        router.refresh();
      } else {
        toast.error(result.message || "Failed to cancel appointment.");
      }
      setAppointmentToCancel(null);
    });
  };

  const handleReviewSubmit = (formData: ReviewFormValues) => {
    if (!selectedAppointmentForReview) {
      toast.error("No appointment selected for review");
      return;
    }
    startTransition(async () => {
      const result = await submitPatientReview({
        appointmentId: selectedAppointmentForReview.id,
        doctorId: selectedAppointmentForReview.doctorId,
        rating: formData.rating,
        reviewText: formData.reviewText,
      });
      if (result.success) {
        toast.success(result.message || "Review submitted successfully");
        setIsReviewDialogOpen(false);
        router.refresh();
      } else {
        const message = result.fieldErrors
          ? "Please check errors on the form "
          : result.message || "Failed to submit review";
        toast.error(message);
      }
    });
  };

  return (
    <div className="min-h-screen bg-background-1 max-w-[1440px] mx-auto p-6 md:p-8">
      <ProfileHeader patientData={patientData} appointmentId={appointmentId} />
      <PersonalInformation
        patientData={patientData}
        onEdit={() => setEditProfileModalOpen(true)}
      />
      <AppointmentsSection
        appointments={appointments}
        totalPages={totalPages}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onCancelInfo={() => setIsCancelInfoDialogOpen(true)}
        onConfirmCancelCash={(appointment) => {
          setAppointmentToCancel(appointment);
          setIsConfirmCancelCashDialogOpen(true);
        }}
        onReview={(appointment) => {
          setSelectedAppointmentForReview(appointment);
          setIsReviewDialogOpen(true);
        }}
        isPending={isPending}
      />

      {/* Models*/}
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        patientData={patientData}
      />
      <CancellationDialogs
        isInfoOpen={isCancelInfoDialogOpen}
        onInfoOpenChange={setIsCancelInfoDialogOpen}
        isConfirmOpen={isConfirmCancelCashDialogOpen}
        onConfirmOpenChange={setIsConfirmCancelCashDialogOpen}
        onConfirmCancel={handleConfirmCancelCash}
        isPending={isPending}
      />
      {selectedAppointmentForReview && (
        <ReviewDialog
          isOpen={isReviewDialogOpen}
          onOpenChange={setIsReviewDialogOpen}
          appointment={selectedAppointmentForReview}
          onSubmit={handleReviewSubmit}
          isSubmitting={isPending}
        />
      )}
    </div>
  );
}
