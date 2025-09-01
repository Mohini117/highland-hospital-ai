import React from "react";
import {
  getAdminDoctorById,
  getDoctorLeaves,
} from "@/lib/actions/admin.actions";
import ManageLeaveClient from "./manage-leave-client";
import { notFound } from "next/navigation";

import { InitialLeave } from "@/types";

export default async function ManageDoctorLeavePage({
  params,
}: {
  params: Promise<{ doctorId: string }>;
}) {
  //In Next.js, the params prop in a page component is automatically populated with the dynamic segments from the URL.
  const { doctorId } = await params;

  // 1. Fetch Doctor Details
  const doctorResult = await getAdminDoctorById(doctorId);

  if (!doctorResult.success || !doctorResult.data) {
    console.error(
      `Failed to fetch doctor ${doctorId}: ${
        doctorResult.error || "No data returned"
      }`
    );
    notFound(); // Show 404 if doctor not found or fetch failed
  }
  const doctor = doctorResult.data;

  // 2. Fetch Existing Leave Data
  const initialLeavesResult = await getDoctorLeaves(doctorId);
  let initialLeaves: InitialLeave[] = [];
  if (!initialLeavesResult.success) {
    console.error(
      `Failed to fetch leaves for doctor ${doctorId}: ${initialLeavesResult.error}`
    );
  } else if (initialLeavesResult.data?.leaves) {
    initialLeaves = initialLeavesResult.data.leaves;
  }

  return (
    <ManageLeaveClient
      doctor={doctor}
      initialLeaves={initialLeaves} // Pass initial leave data
    />
  );
}
