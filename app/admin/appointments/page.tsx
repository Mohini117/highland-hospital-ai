import React from "react";
import { Card, CardContent } from "@/components/ui/card";

import AppointmentsTable from "./appointments-table";
import { getAdminAppointments } from "@/lib/actions/admin.actions";
import { AppointmentStatus } from "@/lib/generated/prisma";

import { AdminAppointment } from "@/types";

import { DateRange } from "react-day-picker";
import { parseISO, isValid, format, startOfMonth, endOfMonth } from "date-fns";
import { redirect } from "next/navigation";
import { AdminSearchInput } from "@/components/molecules/admin/admin-search-input";
import { PAGE_SIZE } from "@/lib/constants";

interface SearchParams {
  search?: string;
  page?: string;
  from?: string;
  to?: string;
}

const defaultDateRange: DateRange = {
  from: startOfMonth(new Date()),
  to: endOfMonth(new Date()),
};

export default async function AdminAppointmentsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await searchParamsPromise;
  const fromParam = searchParams?.from;
  const toParam = searchParams?.to;

  // --- Extract date range from searchParams ---
  let dateRange: DateRange | undefined = undefined;
  let paramsAreValid = false;
  const dateParseError = false;

  // --- Check if params are valid ---
  if (fromParam && toParam) {
    try {
      const parsedFrom = parseISO(fromParam);
      const parsedTo = parseISO(toParam);
      if (isValid(parsedFrom) && isValid(parsedTo)) {
        dateRange = { from: parsedFrom, to: parsedTo };
        paramsAreValid = true;
      }
    } catch {
      /* Ignore parsing errors */
    }
  }

  // --- Redirect if params are missing or invalid ---
  if (!paramsAreValid) {
    console.log(
      "AdminAppointmentsPage: Redirecting to set default date params."
    );
    const paramsToSet = new URLSearchParams(
      Array.from(Object.entries(searchParams || {}))
    ); // Preserve other params
    if (defaultDateRange.from)
      paramsToSet.set("from", format(defaultDateRange.from, "yyyy-MM-dd"));
    if (defaultDateRange.to)
      paramsToSet.set("to", format(defaultDateRange.to, "yyyy-MM-dd"));
    redirect(`/admin/appointments?${paramsToSet.toString()}`); // Redirect preserves path
  }

  const searchQuery = searchParams?.search || "";
  const currentPage = Number(searchParams?.page || 1);
  const itemsPerPage = PAGE_SIZE;

  let appointments: AdminAppointment[] = [];
  let totalAppointments = 0;
  let totalPages = 1;
  let fetchError: string | null = null;

  try {
    // Call action and store the full response ---
    const result = await getAdminAppointments({
      query: searchQuery,
      page: currentPage,
      limit: itemsPerPage,
      dateRange: dateRange, // Pass the date range object
      statuses: [
        // Keep the specific statuses for this page
        AppointmentStatus.BOOKING_CONFIRMED,
        AppointmentStatus.CASH,
      ],
    });

    // Check success and assign data or error ---
    if (result.success && result.data) {
      appointments = result.data.appointments;
      totalAppointments = result.data.totalAppointments;
      totalPages = result.data.totalPages;
      // currentPage is already known
    } else {
      fetchError = result.message || "Failed to load appointments.";
      console.error("Fetch manage appointments error:", result.error);
    }
  } catch (err) {
    // Catch errors during the action call itself
    console.error("Exception fetching manage appointments:", err);
    fetchError = "An unexpected error occurred while loading appointments.";
  }

  return (
    <div className="p-8">
      {/* ---Display fetchError if it occurred --- */}
      {fetchError && (
        <div className="mb-4 p-3 text-center text-sm text-red-500 bg-red-100 border border-red-200 rounded-md">
          {fetchError}
        </div>
      )}

      {/* Date parse error display  */}
      {dateParseError && (
        <div className="mb-4 p-3 text-center text-sm text-orange-700 bg-orange-100 border border-orange-200 rounded-md">
          Invalid date range in URL ignored. Displaying all dates.
        </div>
      )}

      <div className="flex justify-between items-center mb-8 ">
        <h2 className="text-text-title">Manage Appointments</h2>
        <AdminSearchInput
          initialQuery={searchQuery}
          placeholder="Search Patient, Doctor"
        />
      </div>

      <Card className="p-0 rounded-lg border-0">
        <CardContent className="p-0 rounded-lg">
          <AppointmentsTable
            appointments={appointments}
            totalPages={totalPages}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalAppointments={totalAppointments}
            searchQuery={searchQuery}
          />
        </CardContent>
      </Card>
    </div>
  );
}
