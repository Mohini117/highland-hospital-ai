import {
  getUserDetails,
  getUserAppointments,
} from "@/lib/actions/user.actions";
import PatientProfileClient from "./patient-profile-client";
import { PatientProfile, Appointment } from "@/types";
import { PAGE_SIZE } from "@/lib/constants";
import { redirect, notFound } from "next/navigation";
import { redirectToErrorPage } from "@/lib/config";

interface SearchParams {
  page?: string;
  appointmentId?: string;
}

export default async function PatientProfilePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Get the current page number from the URL, defaulting to 1
  const { appointmentId, page } = await searchParams;

  const currentPage = Number(page) || 1;

  let patientData: PatientProfile | null = null;
  let appointments: Appointment[] = [];
  let totalPages = 1;
  let appointmentsError: string | null = null;

  // Fetch the user's profile details by calling the server action
  const userDetailsResponse = await getUserDetails();

  // Handle the response from the server action
  if (!userDetailsResponse.success) {
    // If the action was not successful, handle the error based on its type
    switch (userDetailsResponse.errorType) {
      case "AUTHENTICATION":
        redirect("/sign-in");
        break;
      case "notFound":
        notFound(); // 404 not found error
        break;
      default:
        // For any other type of error, redirect to the home page with an error message
        redirectToErrorPage(
          userDetailsResponse.errorType || "PROFILE_LOAD_FAILED",
          userDetailsResponse.message || "Failed to retrieve your profile."
        );
        break;
    }
  }

  // If we successfully got the user details, assign them
  patientData = userDetailsResponse.data || null;

  // If patient data was fetched successfully, proceed to get appointments
  if (patientData) {
    const appointmentsResponse = await getUserAppointments({
      page: currentPage,
      limit: PAGE_SIZE, // Use 'limit' as expected by the server action
    });

    if (appointmentsResponse.success && appointmentsResponse.data) {
      // If fetching appointments is successful, populate the data
      appointments = appointmentsResponse.data.appointments;
      totalPages = appointmentsResponse.data.totalPages;
    } else {
      // If fetching appointments fails, set an error message to be displayed in the client
      appointmentsError =
        appointmentsResponse.message ||
        "We couldn't retrieve your appointments at this time. Please try again later.";
    }
  } else {
    redirectToErrorPage("fetch-user-error", "Failed to retrieve your profile.");
    return;
  }

  return (
    <div>
      <PatientProfileClient
        patientData={patientData}
        appointments={appointments}
        appointmentId={appointmentId}
        totalPages={totalPages || 1}
        currentPage={currentPage || 1}
        appointmentsError={appointmentsError}
      />
    </div>
  );
}
