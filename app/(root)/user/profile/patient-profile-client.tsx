"use client";
import { PatientProfile, Appointment } from "@/types";
import { useEffect } from "react";
import { toast } from "react-hot-toast";
import ProfileHeader from "@/components/organisms/user-profile/profile-header";

export default function PatientProfileClient({
  patientData,
  // appointments,
  // appointmentId,
  // totalPages,
  // currentPage,
  appointmentsError,
}: {
  patientData: PatientProfile;
  appointments: Appointment[];
  appointmentId?: string;
  totalPages: number;
  currentPage: number;
  appointmentsError?: string | null;
}) {
  useEffect(() => {
    if (appointmentsError) {
      toast.error("Appointments could not be loaded. Please again later");
      console.log("Appointments Error:", appointmentsError);
    }
  }, [appointmentsError]);

  return (
    <div className="min-h-screen bg-background-1 max-w-[1440px] mx-auto p-6 md:p-8">
      <ProfileHeader patientData={patientData} />
    </div>
  );
}
