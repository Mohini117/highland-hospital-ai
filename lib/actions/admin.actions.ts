import { DateRange } from "react-day-picker";
import {
  ServerActionResponse,
  AdminDashboardData,
  AdminTransaction,
} from "@/types";
import { requireAdmin } from "@/lib/auth-guard";
import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/db/prisma";
import { TransactionStatus, AppointmentStatus } from "@/lib/generated/prisma";

const getDateFilter = (dateRange?: DateRange): { gte?: Date; lte?: Date } => {
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (dateRange?.from) {
    // dateRange.from is already a Date object here
    dateFilter.gte = startOfDay(dateRange.from);
  }
  if (dateRange?.to) {
    // dateRange.to is already a Date object here
    dateFilter.lte = endOfDay(dateRange.to);
  }
  return dateFilter;
};

export async function getAdminDashboardData(
  dateRange?: DateRange
): Promise<ServerActionResponse<AdminDashboardData>> {
  try {
    // 1. Authenticate and authorize the user as an admin
    await requireAdmin();

    // 2. Set up date filters for queries based on the provided range
    const transactionDateFilter = getDateFilter(dateRange);
    const appointmentDateFilter = getDateFilter(dateRange);

    // --- METRIC 1: Calculate Total Revenue ---
    const revenueResult = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: TransactionStatus.COMPLETED, //means appointment is BOOKING_CONFIRMED or COMPLETED
        transactionDate: transactionDateFilter,
      },
    });
    const totalRevenue = revenueResult._sum.amount || 0;

    // --- METRIC 2: Calculate Total Appointments ---
    const totalAppointments = await prisma.appointment.count({
      where: {
        status: {
          in: [
            AppointmentStatus.BOOKING_CONFIRMED,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CASH,
          ],
        },
        appointmentStartUTC: appointmentDateFilter,
      },
    });

    // --- CHART 1: Revenue Analytics (Monthly) ---
    const { gte: startDate, lte: endDate } = transactionDateFilter;
    // We use a raw query here because Prisma's groupBy doesn't easily support grouping by month.
    // This is the most reliable way to perform this aggregation.
    const monthlyRevenueRaw: { month: Date; Revenue: number }[] =
      await prisma.$queryRaw`
  SELECT
    DATE_TRUNC('month', "transactionDate")::date as month,
    SUM("amount")::float as "Revenue"
  FROM
    "transactions"
  WHERE
    "status" = 'COMPLETED' AND "transactionDate" >= ${startDate} AND "transactionDate" <= ${endDate}
  GROUP BY
    month
  ORDER BY
    month ASC;
`;

    // Map the raw query result to the format expected by the chart
    const revenueAnalyticsData = monthlyRevenueRaw.map((item) => ({
      name: new Date(item.month).toLocaleString("default", { month: "short" }),
      Revenue: item.Revenue || 0,
    }));

    // --- CHART 2: Department Revenue Distribution ---
    // First, group revenue by the doctor who handled the transaction
    const departmentRevenue = await prisma.transaction.groupBy({
      by: ["doctorId"],
      _sum: {
        amount: true,
      },
      where: {
        status: TransactionStatus.COMPLETED,
        transactionDate: transactionDateFilter,
      },
    });

    // Then, find the specialty for each of those doctors
    const doctorIds = departmentRevenue.map((item) => item.doctorId);
    const doctorsWithSpecialties = await prisma.user.findMany({
      where: { id: { in: doctorIds } },
      select: {
        id: true,
        doctorProfile: { select: { specialty: true } },
      },
    });

    // Create a quick lookup map for doctorId -> specialty
    // Example -
    // {
    //   'doctor-id-123' => 'Cardiology',
    //   'doctor-id-456' => 'Neurology'
    // }
    const specialtyMap = new Map<string, string>();
    doctorsWithSpecialties.forEach((doc) => {
      if (doc.doctorProfile?.specialty) {
        specialtyMap.set(doc.id, doc.doctorProfile.specialty);
      }
    });

    // Aggregate the revenue by specialty
    //Example -
    // const revenueBySpecialty = {
    //   "Cardiology": 12500,
    //   "Neurology": 4200,
    //   "Pediatrics": 8800
    // };

    const revenueBySpecialty: Record<string, number> = {};
    departmentRevenue.forEach((item) => {
      const specialty = specialtyMap.get(item.doctorId) || "Other";
      revenueBySpecialty[specialty] =
        (revenueBySpecialty[specialty] || 0) + (item._sum.amount || 0);
    });

    // Format the data for the pie chart, assigning colors
    const colors = ["#4A90E2", "#E57373", "#81D4FA", "#81C784", "#FFD54F"];
    let colorIndex = 0;
    // Object.entries(revenueBySpecialty): This is a standard JavaScript method that takes
    // your revenueBySpecialty object and converts it into an array of [key, value] pairs.

    // Example -
    // [
    //   { name: "Cardiology", value: 12500, color: "#4A90E2" },
    //   { name: "Neurology",  value: 4200,  color: "#E57373" },
    //   { name: "Pediatrics", value: 8800,  color: "#81D4FA" },
    //   // and so on...
    // ]
    const departmentRevenueData = Object.entries(revenueBySpecialty).map(
      ([name, value]) => ({
        name,
        value,
        color: colors[colorIndex++ % colors.length],
      })
    );

    const recentTransactions = await prisma.transaction.findMany({
      where: {
        status: TransactionStatus.COMPLETED,
        transactionDate: transactionDateFilter,
      },
      take: 10,
      orderBy: { transactionDate: "desc" },
      select: {
        id: true,
        transactionDate: true,
        amount: true,
        appointment: {
          select: {
            status: true,
            appointmentStartUTC: true,
            patientName: true,
            doctor: {
              select: {
                name: true,
                doctorProfile: {
                  select: {
                    specialty: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const transactions = recentTransactions as AdminTransaction[];

    // --- FINAL RESPONSE: Combine all data and return ---
    return {
      success: true,
      data: {
        totalRevenue,
        totalAppointments,
        revenueAnalyticsData,
        departmentRevenueData,
        transactions,
      },
    };
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    const message =
      error instanceof Error ? error.message : "Unknown server error.";
    return {
      success: false,
      message: "Failed to load dashboard data. Please try again later.",
      error: message,
      errorType: "serverError",
    };
  }
}
