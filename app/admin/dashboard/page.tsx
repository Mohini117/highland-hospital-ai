import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import {
  format as formatDateFnsOriginal,
  parseISO,
  isValid,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";

import { DateRange } from "react-day-picker";
import { toZonedTime } from "date-fns-tz";
import { getAppTimeZone } from "@/lib/config";

import { getAdminDashboardData } from "@/lib/actions/admin.actions";
import DashboardCharts from "./dashboard-charts";
import AppointmentStatusBadge from "@/components/molecules/admin/appointment-status-badge";
import { redirect } from "next/navigation";
import { AdminDashboardData } from "@/types";

// --- Define SearchParams interface ---
interface SearchParams {
  from?: string;
  to?: string;
}

// --- Define Default Date Range (Consistent with Header) ---
const defaultDateRange: DateRange = {
  from: startOfMonth(new Date()),
  to: endOfMonth(new Date()),
};

// --- Helper Functions
const formatCurrency = (value: number) => {
  if (typeof value !== "number") return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateInput: Date | string | null | undefined): string => {
  // Handle null/undefined input first
  if (dateInput === null || dateInput === undefined) {
    return "N/A";
  }

  try {
    // Parse ISO string or use existing Date object
    const date =
      typeof dateInput === "string" ? parseISO(dateInput) : dateInput;

    // Validate the parsed/provided date
    if (!isValid(date)) {
      console.warn("formatDate received an invalid date object:", dateInput);
      return "Invalid Date";
    }

    // --- Convert to App Timezone before formatting ---
    const TIMEZONE = getAppTimeZone();
    const zonedDate = toZonedTime(date, TIMEZONE);
    // --- Format using the zoned date ---
    return formatDateFnsOriginal(zonedDate, "MMM dd, yyyy");
  } catch (error) {
    console.error("Error during date formatting:", dateInput, error);
    return "Formatting Error";
  }
};

export default async function AdminDashboardPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Await and parse searchParams
  const searchParams = await searchParamsPromise;
  const fromParam = searchParams?.from;
  const toParam = searchParams?.to;

  let dateRange: DateRange | undefined = undefined;
  let paramsAreValid = false;

  // --- Check if params are valid ---
  if (fromParam && toParam) {
    try {
      const parsedFrom = parseISO(fromParam);
      const parsedTo = parseISO(toParam);
      if (isValid(parsedFrom) && isValid(parsedTo)) {
        dateRange = { from: parsedFrom, to: parsedTo };
        paramsAreValid = true;
      } else {
        console.warn("AdminDashboardPage: Invalid date params received.");
        // paramsAreValid remains false
      }
    } catch {
      console.warn("AdminDashboardPage: Error parsing date params.");
      // paramsAreValid remains false
    }
  }

  // --- Redirect if params are missing or invalid ---
  if (!paramsAreValid) {
    console.log("AdminDashboardPage: Redirecting to set default date params.");
    const paramsToSet = new URLSearchParams(
      Array.from(Object.entries(searchParams || {}))
    ); // Preserve other params
    if (defaultDateRange.from)
      paramsToSet.set("from", format(defaultDateRange.from, "yyyy-MM-dd"));
    if (defaultDateRange.to)
      paramsToSet.set("to", format(defaultDateRange.to, "yyyy-MM-dd"));
    // Redirect to the current page but with default date params added/corrected
    redirect(`/admin/dashboard?${paramsToSet.toString()}`);
  }

  let dashboardData: AdminDashboardData | null = null;
  let fetchError: string | null = null;

  try {
    const result = await getAdminDashboardData(dateRange);
    if (result.success && result.data) {
      dashboardData = result.data;
    } else {
      fetchError = result.message || "Failed to load dashboard data.";
      console.error("Dashboard fetch error:", result.error);
      // dashboardData remains null
    }
  } catch (err) {
    console.error("Failed to fetch dashboard data:", err);
    fetchError = "An unexpected error occurred while loading dashboard data.";
  }

  return (
    <div className="p-6 space-y-6">
      {/* --- Conditionally display error message --- */}
      {fetchError && !dashboardData && (
        <div className="text-center p-10 text-red-500 bg-red-50 border border-red-200 rounded-md">
          {fetchError}
        </div>
      )}

      {/* ---Conditionally render dashboard content --- */}
      {dashboardData && (
        <>
          {/* Top Row: Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 flex flex-col gap-6 rounded-lg border-border-2">
              <CardHeader className="p-0">
                <CardTitle className="body-small-bold text-text-body-subtle">
                  Total Revenue (payments in the period)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <h1>{formatCurrency(dashboardData.totalRevenue)}</h1>
              </CardContent>
            </Card>
            <Card className="p-6 flex flex-col gap-6 rounded-lg border-border-2">
              <CardHeader className="p-0">
                <CardTitle className="body-small-bold text-text-body-subtle">
                  Total Appointments (scheduled in the period)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <h1>{dashboardData.totalAppointments.toLocaleString()}</h1>
              </CardContent>
            </Card>
          </div>

          {/* Middle Row: Charts (Render the Client Component) */}
          <DashboardCharts
            revenueAnalyticsData={dashboardData.revenueAnalyticsData}
            departmentRevenueData={dashboardData.departmentRevenueData}
          />

          {/* Bottom Row: Transactions Table */}
          <div className="mt-0">
            <Card className="p-6 rounded-lg border-border-2">
              <CardHeader>
                <CardTitle className="body-semibold">
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData.transactions.length > 0 ? (
                  <div className="relative overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-background-2 border-border-2">
                          <TableHead className="px-6 py-3 text-left body-small-bold tracking-wider">
                            Transaction Date
                          </TableHead>
                          <TableHead className="px-6 py-3 text-left body-small-bold tracking-wider">
                            Appointment Date
                          </TableHead>
                          <TableHead className="px-6 py-3 text-left body-small-bold tracking-wider">
                            Doctor Name
                          </TableHead>
                          <TableHead className="px-6 py-3 text-left body-small-bold tracking-wider">
                            Speciality
                          </TableHead>
                          <TableHead className="px-6 py-3 text-left body-small-bold tracking-wider">
                            Patient Name
                          </TableHead>
                          <TableHead className="px-6 py-3 text-right body-small-bold tracking-wider">
                            Amount
                          </TableHead>
                          <TableHead className="px-6 py-3 text-left body-small-bold tracking-wider">
                            Appointment Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboardData.transactions.map((transaction) => (
                          <TableRow
                            key={transaction.id}
                            className="bg-background border-b border-border-2 hover:bg-gray-50"
                          >
                            {/* ... Table Cells using transaction data ... */}
                            <TableCell className="px-6 py-4 whitespace-nowrap body-small">
                              {formatDate(transaction.transactionDate)}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap body-small">
                              {formatDate(
                                transaction.appointment.appointmentStartUTC
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap body-small">
                              {transaction.appointment.doctor.name || "N/A"}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap body-small">
                              {transaction.appointment.doctor.doctorProfile
                                ?.specialty || "N/A"}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap body-small">
                              {transaction.appointment.patientName || "N/A"}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap body-small text-right">
                              {formatCurrency(transaction.amount)}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap body-small">
                              <AppointmentStatusBadge
                                status={transaction.appointment.status}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No recent transactions found for this period.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
