import React from "react";
import { getAdminDoctors } from "@/lib/actions/admin.actions";
import { AdminDoctorData } from "@/types";
import DoctorsManagementClient from "./doctors-management-client";
import { getDepartments } from "@/lib/actions/settings.actions";
import { DepartmentData } from "@/types";

export default async function AdminDoctorsPage() {
  let doctors: AdminDoctorData[] = [];
  let fetchErrorDoctors: string | null = null;

  try {
    const doctorsResult = await getAdminDoctors();
    if (doctorsResult.success && doctorsResult.data) {
      doctors = doctorsResult.data.doctors;
    } else {
      fetchErrorDoctors = doctorsResult.message || "Failed to load doctors.";
      console.error(
        "Failed to fetch doctors:",
        doctorsResult.message, // User-facing message
        "Technical Error:",
        doctorsResult.error, // Technical error detail
        "Type:",
        doctorsResult.errorType // Error type
      );
    }
  } catch (err) {
    console.error("Exception fetching doctors:", err);
    fetchErrorDoctors = "An unexpected error occurred loading doctors.";
  }

  // Fetch departments
  const departmentResult = await getDepartments();
  let departments: DepartmentData[] = [];

  // Check departmentResult.success before trying to access data
  if (!departmentResult.success) {
    console.error(
      "Failed to fetch departments for doctors page:",
      departmentResult.message, // User-facing message from ServerActionResponse
      "Technical Error:",
      departmentResult.error, // Technical error detail
      "Type:",
      departmentResult.errorType // Error type
    );
    // departments will remain an empty array if fetching fails
  } else if (departmentResult.data) {
    // Access departments
    departments = departmentResult.data.departments;
  }

  return (
    <DoctorsManagementClient
      doctors={doctors}
      availableDepartments={departments}
      doctorsFetchError={fetchErrorDoctors}
    />
  );
}
