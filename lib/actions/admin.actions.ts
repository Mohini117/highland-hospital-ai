"use server";
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
import { revalidatePath } from "next/cache";

import { AdminAppointmentsData, AdminAppointment } from "@/types";
import { getAppTimeZone } from "@/lib/config";
import { Prisma } from "@/lib/generated/prisma";
import { formatBookingId } from "@/lib/utils";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";

import { AdminUserData } from "@/types";
import { Role } from "@/lib/generated/prisma";

import { addAdminFormSchema } from "@/lib/validators";
import { hashSync } from "bcrypt-ts-edge";

import { auth } from "@/auth";
import { editAdminFormSchema } from "@/lib/validators";

import { addDoctorFormSchema } from "@/lib/validators";
import { editDoctorFormSchema } from "@/lib/validators";
import { UTApi } from "uploadthing/server";
import { extractFileKeyFromUrl } from "../uploadthing-helper";

import { AdminDoctorData } from "@/types";

import { getDoctorAppointmentsForDateInternal } from "./shared.actions";
import { AppointmentDetailForLeave } from "@/types";
import { LeaveType } from "@/lib/generated/prisma";

import { AdminDoctorDataSimple } from "@/types";

import { InitialLeave } from "@/types";

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

export async function markAdminAppointmentNoShow(
  appointmentId: string
): Promise<ServerActionResponse> {
  await requireAdmin();

  if (!appointmentId) {
    return {
      success: false,
      message: "Appointment ID is required to mark as no-show.",
      error: "markAdminAppointmentNoShow: Appointment ID was not provided.",
      errorType: "BAD_REQUEST",
    };
  }

  try {
    // Find the appointment first to ensure it exists and is in a valid state
    const appointment = await prisma.appointment.findUnique({
      where: { appointmentId },
      select: { status: true },
    });

    if (!appointment) {
      return {
        success: false,
        message: "Appointment not found.",
        error: `Appointment ${appointmentId} not found during mark as no-show attempt.`,
        errorType: "notFound",
      };
    }

    // Allow marking as No Show from BOOKING_CONFIRMED or CASH statuses
    if (
      appointment.status !== AppointmentStatus.BOOKING_CONFIRMED &&
      appointment.status !== AppointmentStatus.CASH
    ) {
      return {
        success: false,
        message: `Cannot mark as No Show. Status is ${appointment.status}.`,
        error: `Attempted to mark appointment ${appointmentId} as no-show, but status was ${appointment.status}.`,
        errorType: "statusConflict",
      };
    }

    // Update the appointment status
    await prisma.appointment.update({
      where: { appointmentId: appointmentId },
      data: {
        status: AppointmentStatus.NO_SHOW,
        reservationExpiresAt: null, // Clear reservation if it existed
      },
    });

    // Revalidate paths
    revalidatePath("/admin/appointments");
    revalidatePath(`/user/profile`); // Revalidate patient's profile too

    return { success: true, message: "Appointment marked as No Show." };
  } catch (error) {
    console.error("Error marking appointment as No Show:", error);
    const techError =
      error instanceof Error
        ? error.message
        : "Unknown error marking as no-show";
    return {
      success: false,
      message: "Failed to mark appointment as No Show.",
      error: techError,
      errorType: "serverError",
    };
  }
}

export async function markAdminAppointmentCompleted(
  appointmentId: string
): Promise<ServerActionResponse> {
  await requireAdmin(); // Ensure user is an admin

  if (!appointmentId) {
    return {
      success: false,
      message: "Appointment ID is required to mark as completed.", // User-friendly
      error: "markAdminAppointmentCompleted: Appointment ID was not provided.", // Technical
      errorType: "BAD_REQUEST",
    };
  }

  try {
    // Find the appointment first to ensure it exists and is in a valid state
    const appointment = await prisma.appointment.findUnique({
      where: { appointmentId },
      select: { status: true },
    });

    if (!appointment) {
      return {
        success: false,
        message: "Appointment not found.",
        error: `Appointment ${appointmentId} not found during mark as completed attempt.`,
        errorType: "notFound",
      };
    }

    // Only allow completion from BOOKING_CONFIRMED status
    if (appointment.status !== AppointmentStatus.BOOKING_CONFIRMED) {
      return {
        success: false,
        message: `Cannot mark as Completed. Status is ${appointment.status}.`,
        error: `Attempted to mark appointment ${appointmentId} as completed, but status was ${appointment.status}.`,
        errorType: "statusConflict",
      };
    }

    // Update the appointment status
    await prisma.appointment.update({
      where: { appointmentId: appointmentId },
      data: {
        status: AppointmentStatus.COMPLETED,
        reservationExpiresAt: null, // Clear reservation if it existed
      },
    });

    // Revalidate paths
    revalidatePath("/admin/appointments");
    revalidatePath(`/user/profile`); // Revalidate patient's profile too

    return { success: true, message: "Appointment marked as Completed." };
  } catch (error) {
    console.error("Error marking appointment as Completed:", error);
    const techError =
      error instanceof Error
        ? error.message
        : "Unknown error marking as completed";
    return {
      success: false,
      message: "Failed to mark appointment as Completed.",
      error: techError,
      errorType: "serverError",
    };
  }
}

export async function markCashAppointmentAsPaid(
  appointmentId: string
): Promise<ServerActionResponse> {
  await requireAdmin(); // Ensure user is an admin

  if (!appointmentId) {
    return {
      success: false,
      message: "Appointment ID is required to mark as paid.", // User-friendly
      error: "markCashAppointmentAsPaid: Appointment ID was not provided.", // Technical
      errorType: "BAD_REQUEST",
    };
  }

  try {
    // Use transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch the appointment to check its status and get details
      const appointment = await tx.appointment.findUnique({
        where: { appointmentId },
        select: {
          status: true,
          doctorId: true,
        },
      });

      if (!appointment) {
        return {
          success: false,
          message: "Appointment not found.",
          error: `Appointment ${appointmentId} not found during mark as paid attempt.`,
          errorType: "notFound",
        };
      }

      // 2. Ensure the appointment status is CASH
      if (appointment.status !== AppointmentStatus.CASH) {
        return {
          success: false,
          message: `Cannot mark as paid. Status is ${appointment.status}.`,
          error: `Attempted to mark appointment ${appointmentId} as paid, but status was ${appointment.status}.`,
          errorType: "statusConflict",
        };
      }

      // 3. Update the appointment status to BOOKING_CONFIRMED
      await tx.appointment.update({
        where: { appointmentId: appointmentId },
        data: {
          status: AppointmentStatus.BOOKING_CONFIRMED,
          paidAt: new Date(), // Set the paid timestamp
          // paymentMethod remains 'CASH'
        },
      });

      const fee = 150.0; // as discussed hard coding the fee for now
      const gatewayTransactionId = `CASH-${appointmentId.substring(
        0,
        8
      )}-${Date.now()}`; // Generate a unique-ish ID

      await tx.transaction.create({
        data: {
          appointmentId: appointmentId,
          doctorId: appointment.doctorId,
          paymentGateway: "CASH",
          gatewayTransactionId: gatewayTransactionId,
          amount: fee,
          currency: "USD",
          status: TransactionStatus.COMPLETED,
          transactionDate: new Date(),
          notes: "Paid at counter",
        },
      });

      // 5. Revalidate the path
      revalidatePath("/admin/appointments");
      revalidatePath("/admin/dashboard");

      return {
        success: true,
        message: "Appointment marked as paid successfully.",
      };
    });
  } catch (error) {
    console.error("Error marking cash appointment as paid:", error);
    const techError =
      error instanceof Error ? error.message : "Unknown error marking as paid";
    return {
      success: false,
      message: "Failed to mark appointment as paid.",
      error: techError,
      errorType: "SERVER_ERROR",
    };
  }
}

export async function cancelAdminAppointment(
  appointmentId: string
): Promise<ServerActionResponse> {
  await requireAdmin(); // Ensure user is an admin

  if (!appointmentId) {
    return {
      success: false,
      message: "Appointment ID is required to cancel.", // User-friendly
      error: "cancelAdminAppointment: Appointment ID was not provided.", // Technical
      errorType: "BAD_REQUEST",
    };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { appointmentId },
        select: { status: true },
      });

      if (!appointment) {
        return {
          success: false,
          message: "Appointment not found.", // User-friendly
          error: `Appointment with ID ${appointmentId} not found.`, // Technical
          errorType: "notFound",
        };
      }

      // Check if appointment is cancellable
      if (
        appointment.status === AppointmentStatus.COMPLETED ||
        appointment.status === AppointmentStatus.CANCELLED || // Already cancelled
        appointment.status === AppointmentStatus.NO_SHOW
      ) {
        return {
          success: false,
          message: `Cannot cancel an appointment with status: ${appointment.status}`, // User-friendly
          error: `Attempted to cancel appointment ${appointmentId} with invalid status ${appointment.status}`, // Technical
          errorType: "statusConflict",
        };
      }

      // Find the associated Transaction

      const transactionToUpdate = await tx.transaction.findFirst({
        where: {
          appointmentId: appointmentId,
          status: TransactionStatus.COMPLETED,
        },
      });

      // Update Appointment Status
      await tx.appointment.update({
        where: { appointmentId: appointmentId },
        data: {
          status: AppointmentStatus.CANCELLED,
          reservationExpiresAt: null,
        },
      });

      // Update Transaction Status (if found and paid)
      if (transactionToUpdate) {
        await tx.transaction.update({
          where: { id: transactionToUpdate.id },
          data: {
            status: TransactionStatus.CANCELLED,
          },
        });
      }

      // Revalidate Paths
      revalidatePath("/admin/appointments");
      revalidatePath(`/user/profile`);

      return { success: true, message: "Appointment cancelled successfully." };
    });
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    const techError =
      error instanceof Error
        ? error.message
        : "Unknown error cancelling appointment";
    return {
      success: false,
      message: "Failed to cancel appointment.", // User-friendly
      error: techError, // Technical detail
      errorType: "serverError",
    };
  }
}

interface GetAdminAppointmentsParams {
  query?: string;
  page?: number;
  limit?: number;
  dateRange?: DateRange;
  statuses?: AppointmentStatus[];
}

export async function getAdminAppointments({
  query = "",
  page = 1,
  limit = 3,
  dateRange,
  statuses,
}: GetAdminAppointmentsParams): Promise<
  ServerActionResponse<AdminAppointmentsData>
> {
  await requireAdmin();
  const TIMEZONE = getAppTimeZone();

  const currentPage = Math.max(1, page);
  const skip = (currentPage - 1) * limit;

  const includedStatuses = statuses ?? [
    AppointmentStatus.BOOKING_CONFIRMED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
    AppointmentStatus.CASH,
  ]; // If statuses are provided, use them, otherwise use default

  const searchFilter: Prisma.AppointmentWhereInput = query
    ? {
        OR: [
          { patientName: { contains: query, mode: "insensitive" } },
          { doctor: { name: { contains: query, mode: "insensitive" } } },
          { user: { name: { contains: query, mode: "insensitive" } } },
        ],
      }
    : {};

  const appointmentDateFilter = getDateFilter(dateRange);

  const whereClause: Prisma.AppointmentWhereInput = {
    AND: [
      searchFilter,
      { status: { in: includedStatuses } },
      { appointmentStartUTC: appointmentDateFilter },
    ],
  };

  try {
    const totalAppointments = await prisma.appointment.count({
      where: whereClause,
    });

    const appointmentsData = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        doctor: { select: { name: true } },
        user: { select: { name: true, email: true, phoneNumber: true } },
      },
      orderBy: {
        appointmentStartUTC: "desc",
      },
      skip: skip,
      take: limit,
    });

    const formattedAppointments: AdminAppointment[] = appointmentsData.map(
      (apt) => {
        const localStartTime = toZonedTime(apt.appointmentStartUTC, TIMEZONE);
        return {
          id: apt.appointmentId,
          formattedId: formatBookingId(apt.appointmentId), // Use the helper function
          doctorId: apt.doctorId,
          doctorName: apt.doctor.name || "N/A",
          patientName: apt.patientName || "N/A",
          phoneNumber: apt.phoneNumber, // This is the alternate phone from the Appointment table
          userPhoneNumber: apt.user?.phoneNumber, // This is the primary phone from the User table
          bookedByName:
            apt.user?.name || (apt.guestIdentifier ? "Guest" : "N/A"),
          bookedByEmail: apt.user?.email || null,
          appointmentDate: format(localStartTime, "MMMM d, yyyy"),
          appointmentTime: format(localStartTime, "hh:mm a"),
          status: apt.status,
        };
      }
    );

    const totalPages = Math.ceil(totalAppointments / limit);

    return {
      success: true,
      data: {
        // <-- Wrap in data
        appointments: formattedAppointments,
        totalAppointments,
        totalPages,
        currentPage,
      },
    };
  } catch (error) {
    console.error("Error fetching admin appointments:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error fetching appointments";
    return {
      success: false,
      message: "Failed to fetch appointments.", // User-friendly
      error: message, // Technical detail
      errorType: "serverError",
    };
  }
}

interface AdminUsersData {
  users: AdminUserData[];
}

export async function getAdminUsers(): Promise<
  ServerActionResponse<AdminUsersData>
> {
  await requireAdmin();

  try {
    const users = await prisma.user.findMany({
      where: {
        role: Role.ADMIN,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isRootAdmin: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: {
        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isRootAdmin: user.isRootAdmin,
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching admin users:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error fetching admin users";
    return {
      success: false,
      message: "Failed to fetch admin users.",
      error: message,
      errorType: "SERVER_ERROR",
    };
  }
}

export async function addAdminUser(
  prevState: unknown, // prevState for useActionState
  formData: FormData
): Promise<ServerActionResponse> {
  try {
    await requireAdmin(); // Ensure only admins can call this

    // Validate form data
    const validatedData = addAdminFormSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!validatedData.success) {
      console.error(
        "Add Admin Validation Errors:",
        validatedData.error.flatten()
      );
      return {
        success: false,
        message: "Validation failed. Please check the information provided.", // User-friendly
        fieldErrors: validatedData.error.flatten().fieldErrors, // Use fieldErrors
        error: "Zod validation failed for addAdminUser.", // Technical
        errorType: "VALIDATION_ERROR",
      };
    }

    const { name, email, password } = validatedData.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        message: "This email address is already registered.", // User-friendly
        fieldErrors: { email: ["This email address is already registered."] },
        error: `Email conflict for: ${email}`, // Technical
        errorType: "CONFLICT_ERROR",
      };
    }

    // Hash the password
    const hashedPassword = hashSync(password, 10);

    // Create the new admin user
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Role.ADMIN,
        isRootAdmin: false, // Explicitly set to false
        emailVerified: new Date(), // Optionally mark as verified immediately
      },
    });

    revalidatePath("/admin/settings"); // Revalidate the settings page

    return { success: true, message: "Admin user created successfully." };
  } catch (error) {
    console.error("Error adding admin user:", error);
    let errorMessage = "An unexpected error occurred.";
    // Handle potential Prisma unique constraint errors specifically
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002" && error.meta?.target === "user_email_idx") {
        // Unique constraint violation on email
        return {
          success: false,
          message: "This email address is already registered.", // User-friendly
          fieldErrors: { email: ["This email address is already registered."] },
          error:
            "Prisma unique constraint violation on email for addAdminUser.", // Technical
          errorType: "CONFLICT_ERROR",
        };
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      success: false,
      message: "Failed to add admin user due to a server issue.", // User-friendly
      error: `addAdminUser: ${errorMessage}`, // Technical
      errorType: "SERVER_ERROR",
    };
  }
}

export async function deleteAdminUser(
  userId: string
): Promise<ServerActionResponse> {
  await requireAdmin(); // Ensure caller is an admin
  const session = await auth(); // Get current admin session

  if (!userId) {
    return {
      success: false,
      message: "User ID is required for deletion.", // User-friendly
      error: "deleteAdminUser: User ID was not provided.", // Technical
      errorType: "BAD_REQUEST",
    };
  }

  // Optional: Prevent admin from deleting themselves
  if (session?.user?.id === userId) {
    return {
      success: false,
      message: "You cannot delete your own account.",
      error: "Attempted self-deletion.",
      errorType: "forbidden", // Or "badRequest"
    };
  }

  try {
    // Check if the user being deleted is a root admin
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { isRootAdmin: true, role: true }, // Select role too for extra check
    });

    if (!userToDelete) {
      return {
        success: false,
        message: "User not found. Cannot delete.", // User-friendly
        error: `deleteAdminUser: User with ID ${userId} not found.`, // Technical
        errorType: "NOT_FOUND",
      };
    }

    if (userToDelete.role !== Role.ADMIN) {
      return {
        success: false,
        message: "This operation is only for deleting admin users.", // User-friendly
        error: `deleteAdminUser: Attempted to delete non-admin user ${userId}.`, // Technical
        errorType: "FORBIDDEN", // Or "BAD_REQUEST"
      };
    }

    // ---- Prevent deletion of root admin ----
    if (userToDelete.isRootAdmin) {
      return {
        success: false,
        message: "Root admins cannot be deleted.",
        error: `Attempted deletion of root admin ${userId}.`,
        errorType: "forbidden",
      };
    }

    // Proceed with deletion
    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/admin/settings");
    return { success: true, message: "Admin user deleted successfully." };
  } catch (error) {
    console.error(`Error deleting admin user ${userId}:`, error);
    const techError =
      error instanceof Error ? error.message : "Unknown error deleting user";
    return {
      success: false,
      message: "Failed to delete admin user.",
      error: techError,
      errorType: "serverError",
    };
  }
}

export async function updateAdminUser(
  prevState: unknown,
  formData: FormData
): Promise<ServerActionResponse> {
  await requireAdmin();

  const userId = formData.get("userId") as string;
  const name = formData.get("name");

  if (!userId) {
    return {
      success: false,
      message: "User ID is missing. Cannot update user.", // User-friendly
      error: "updateAdminUser: User ID was not provided.", // Technical
      errorType: "BAD_REQUEST",
    };
  }

  try {
    // Validate form data
    const validatedData = editAdminFormSchema.safeParse({ name });

    if (!validatedData.success) {
      console.error(
        "[updateAdminUser Action] Validation Errors:",
        validatedData.error.flatten()
      );
      return {
        success: false,
        message: "Validation failed. Please check the name field.", // User-friendly
        fieldErrors: validatedData.error.flatten().fieldErrors,
        error: "Zod validation failed for updateAdminUser.", // Technical
        errorType: "VALIDATION_ERROR",
      };
    }

    const { name: validatedName } = validatedData.data;

    // Check if user exists (and is an admin, though role shouldn't change here)
    const userToUpdate = await prisma.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
      select: { id: true }, // Select minimal data needed
    });

    if (!userToUpdate) {
      console.warn(`[updateAdminUser Action] Admin user not found: ${userId}`);
      return {
        success: false,
        message: "Admin user not found. Unable to update.", // User-friendly
        error: `updateAdminUser: Admin user with ID ${userId} not found.`, // Technical
        errorType: "NOT_FOUND",
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: validatedName,
      },
    });

    // Revalidate the path to refresh the user list
    revalidatePath("/admin/settings");

    return { success: true, message: "Admin user updated successfully." };
  } catch (error) {
    console.error(
      `[updateAdminUser Action] Error updating user ${userId}:`,
      error
    );

    const message =
      error instanceof Error ? error.message : "Failed to update admin user.";

    return {
      success: false,
      message: message, // User-friendly
      error: `updateAdminUser: ${message}`, // Technical
      errorType: "SERVER_ERROR",
    };
  }
}

export async function addDoctor(
  prevState: unknown, // prevState for useActionState
  formData: FormData
): Promise<ServerActionResponse> {
  console.log("[addDoctor Action] Received request.");
  await requireAdmin(); // Ensure only admins can perform this action

  try {
    // --- Extract imageUrl from FormData ---
    const imageUrl = formData.get("imageUrl") as string | null;

    const validatedData = addDoctorFormSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      credentials: formData.get("credentials"),
      specialty: formData.get("specialty"),
      languages: formData.get("languages"),
      specializations: formData.get("specializations"),
      brief: formData.get("brief"),
      imageUrl: imageUrl,
    });

    if (!validatedData.success) {
      console.error(
        "Add Doctor Validation Errors:",
        validatedData.error.flatten()
      );
      return {
        success: false,
        message: "Validation failed. Please check the doctor's details.", // User-friendly
        fieldErrors: validatedData.error.flatten().fieldErrors,
        error: "Zod validation failed for addDoctor.", // Technical
        errorType: "VALIDATION_ERROR",
      };
    }

    // Destructure including the validated imageUrl
    const {
      name,
      email,
      credentials,
      specialty,
      languages,
      specializations,
      brief,
      imageUrl: validatedImageUrl, // rename
    } = validatedData.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        message: "This email address is already registered.", // User-friendly
        fieldErrors: { email: ["This email address is already registered."] },
        error: `Email conflict for: ${email}`, // Technical
        errorType: "CONFLICT_ERROR",
      };
    }

    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: null, // Set password to null for Doctor users as we are not providing them any login
          role: Role.DOCTOR,
          emailVerified: new Date(), //
          image: validatedImageUrl || null,
        },
      });

      await tx.doctorProfile.create({
        data: {
          userId: newUser.id,
          specialty,
          brief,
          credentials: credentials,
          languages: languages.split(",").map((lang) => lang.trim()),
          specializations: specializations
            .split(",")
            .map((spec) => spec.trim()),
          isActive: true,
        },
      });
    });

    revalidatePath("/admin/doctors");

    return { success: true, message: "Doctor added successfully." };
  } catch (error) {
    console.error("Error adding doctor:", error);
    let errorMessage = "An unexpected error occurred while adding the doctor.";
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          message: "This email address is already registered.", // User-friendly
          fieldErrors: { email: ["This email address is already registered."] },
          error: "Prisma unique constraint violation on email for addDoctor.", // Technical
          errorType: "CONFLICT_ERROR",
        };
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      success: false,
      message: "Failed to add doctor due to a server issue.", // User-friendly
      error: `addDoctor: ${errorMessage}`, // Technical
      errorType: "SERVER_ERROR",
    };
  }
}

export async function updateDoctor(
  prevState: unknown, // prevState for useActionState
  formData: FormData
): Promise<ServerActionResponse> {
  await requireAdmin(); // Ensure only admins can perform this action
  const utapi = new UTApi();
  const doctorId = formData.get("doctorId") as string;
  if (!doctorId) {
    return {
      success: false,
      message: "Doctor ID is missing. Cannot update profile.", // User-friendly
      error: "updateDoctor: Doctor ID was not provided.", // Technical
      errorType: "BAD_REQUEST",
    };
  }

  try {
    const imageUrl = formData.get("imageUrl") as string | null;

    const validatedData = editDoctorFormSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      credentials: formData.get("credentials"),
      specialty: formData.get("specialty"),
      languages: formData.get("languages"),
      specializations: formData.get("specializations"),
      brief: formData.get("brief"),
      imageUrl: imageUrl,
    });

    if (!validatedData.success) {
      console.error(
        "Update Doctor Validation Errors:",
        validatedData.error.flatten()
      );
      return {
        success: false,
        message: "Validation failed. Please check the doctor's details.", // User-friendly
        fieldErrors: validatedData.error.flatten().fieldErrors,
        error: "Zod validation failed for updateDoctor.", // Technical
        errorType: "VALIDATION_ERROR",
      };
    }

    const {
      name,
      email: newEmail,
      credentials,
      specialty,
      languages,
      specializations,
      brief,
      imageUrl: newImageUrl,
    } = validatedData.data;

    // Fetch the current doctor data including the current email
    const currentDoctor = await prisma.user.findUnique({
      where: { id: doctorId },
      select: { image: true, email: true },
    });

    if (!currentDoctor) {
      return {
        success: false,
        message: "Doctor profile not found. Unable to update.", // User-friendly
        error: `updateDoctor: Doctor with ID ${doctorId} not found.`, // Technical
        errorType: "NOT_FOUND",
      };
    }

    const oldImageUrl = currentDoctor.image;
    const oldEmail = currentDoctor.email;
    const imageNeedsUpdate = newImageUrl !== oldImageUrl;
    const emailNeedsUpdate = newEmail !== oldEmail;

    // --- Check Email Uniqueness if Changed ---
    if (emailNeedsUpdate) {
      const existingUserWithNewEmail = await prisma.user.findUnique({
        where: { email: newEmail },
        select: { id: true }, // Only need ID to check existence
      });
      // Check if the email exists AND belongs to a DIFFERENT user
      if (
        existingUserWithNewEmail &&
        existingUserWithNewEmail.id !== doctorId
      ) {
        return {
          success: false,
          message: "This email address is already registered to another user.", // User-friendly
          fieldErrors: {
            email: [
              "This email address is already registered to another user.",
            ],
          },
          error: `Email conflict during update for doctor ${doctorId}, new email: ${newEmail}`, // Technical
          errorType: "CONFLICT_ERROR",
        };
      }
    }
    // --- End Email Uniqueness Check ---

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: doctorId },
        data: {
          name,
          ...(imageNeedsUpdate && { image: newImageUrl || null }),
          ...(emailNeedsUpdate && { email: newEmail }), // <--- Update email if changed
        },
      });

      // Update DoctorProfile table
      await tx.doctorProfile.update({
        where: { userId: doctorId },
        data: {
          specialty,
          brief,
          credentials,
          languages: languages.split(",").map((lang) => lang.trim()),
          specializations: specializations
            .split(",")
            .map((spec) => spec.trim()),
        },
      });
    });

    // Delete old image from UploadThing if a new one was provided and it's different
    if (imageNeedsUpdate && oldImageUrl) {
      const oldFileKey = extractFileKeyFromUrl(oldImageUrl);
      if (oldFileKey) {
        try {
          console.log(
            `[updateDoctor] Deleting old image with key: ${oldFileKey}`
          );
          await utapi.deleteFiles(oldFileKey);
        } catch (deleteError) {
          console.error(
            `[updateDoctor] Failed to delete old image ${oldFileKey}:`,
            deleteError
          );
        }
      }
    }

    revalidatePath("/admin/doctors");

    return { success: true, message: "Doctor updated successfully." };
  } catch (error) {
    console.error(`[updateDoctor] Error updating doctor ${doctorId}:`, error);
    let errorMessage = "Failed to update doctor.";
    // Specific check for Prisma unique constraint error on email during update
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002" && error.meta?.target === "user_email_idx") {
        return {
          success: false,
          message: "This email address is already registered to another user.", // User-friendly
          fieldErrors: {
            email: [
              "This email address is already registered to another user.",
            ],
          },
          error:
            "Prisma unique constraint violation on email for updateDoctor.", // Technical
          errorType: "CONFLICT_ERROR",
        };
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      success: false,
      message: "Failed to update doctor profile due to a server issue.", // User-friendly
      error: `updateDoctor: ${errorMessage}`, // Technical
      errorType: "SERVER_ERROR",
    };
  }
}

interface AdminDoctorsData {
  doctors: AdminDoctorData[];
}

export async function getAdminDoctors(): Promise<
  ServerActionResponse<AdminDoctorsData>
> {
  await requireAdmin(); // Ensure only admins can call this

  const whereClause: Prisma.UserWhereInput = {
    role: Role.DOCTOR,
    doctorProfile: {
      isActive: true,
    },
  };

  try {
    // Fetch ALL doctors matching the criteria
    const doctors = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        doctorProfile: {
          select: {
            specialty: true,
            isActive: true,
            languages: true,
            specializations: true,
            brief: true,
            credentials: true,
          },
        },
      },
      orderBy: {
        name: "asc", // Order by name
      },
    });

    // Format the data
    const formattedDoctors: AdminDoctorData[] = doctors.map((doc) => ({
      id: doc.id,
      name: doc.name,
      credentials: doc.doctorProfile?.credentials ?? null,
      email: doc.email,
      image: doc.image,
      specialty: doc.doctorProfile?.specialty ?? null,
      isActive: doc.doctorProfile?.isActive ?? null,
      languages: doc.doctorProfile?.languages ?? null,
      specializations: doc.doctorProfile?.specializations ?? null,
      brief: doc.doctorProfile?.brief ?? null,
    }));

    // RETURN only the doctors array
    return {
      success: true,
      data: { doctors: formattedDoctors }, // Wrap in data
    };
  } catch (error) {
    console.error("Error fetching admin doctors:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error fetching doctors";
    return {
      success: false,
      message: "Failed to fetch doctors.",
      error: message,
      errorType: "serverError",
    };
  }
}

export async function deleteDoctor(
  doctorId: string
): Promise<ServerActionResponse> {
  await requireAdmin();
  const utapi = new UTApi();

  if (!doctorId) {
    return {
      success: false,
      message: "Doctor ID is required.",
      error: "Doctor ID is required.",
    };
  }

  try {
    const now = new Date();
    const futureAppointmentCount = await prisma.appointment.count({
      where: {
        doctorId: doctorId,
        appointmentStartUTC: { gte: now },
        status: {
          in: [AppointmentStatus.BOOKING_CONFIRMED, AppointmentStatus.CASH],
        },
      },
    });

    if (futureAppointmentCount > 0) {
      return {
        success: false,
        message:
          "Cannot deactivate doctor. They have future appointments that must be cancelled first.",
        errorType: "CONFLICT_ERROR",
      };
    }

    // Find the doctor to get their image URL
    const doctorToDeactivate = await prisma.user.findUnique({
      where: { id: doctorId, role: Role.DOCTOR },
      select: { image: true },
    });

    if (!doctorToDeactivate) {
      return {
        success: false,
        message: "Doctor not found.",
        errorType: "NOT_FOUND",
      };
    }

    await prisma.$transaction(async (tx) => {
      // Set the User record to inactive
      await tx.user.update({
        where: { id: doctorId },
        data: { isActive: false },
      });
      // Also set their profile to inactive
      await tx.doctorProfile.update({
        where: { userId: doctorId },
        data: { isActive: false },
      });
    });

    // delete the doctor image from uploadthing
    const imageUrlToDelete = doctorToDeactivate.image;
    if (imageUrlToDelete) {
      const fileKey = extractFileKeyFromUrl(imageUrlToDelete);
      if (fileKey) {
        await utapi.deleteFiles(fileKey).catch((err) => {
          console.error("Failed to delete image from UploadThing", err);
        });
      }
    }

    revalidatePath("/admin/doctors");
    return { success: true, message: "Doctor deactivated successfully." };
  } catch (error) {
    const techError =
      error instanceof Error ? error.message : "Unknown error deleting doctor";
    return {
      success: false,
      message: "Failed to delete doctor.",
      error: techError,
      errorType: "SERVER_ERROR",
    };
  }
}

interface ActiveAppointmentDetail {
  id: string;
  date: string;
  time: string;
  patientName: string | null;
  patientPhone: string | null;
  patientEmail: string | null;
  status: AppointmentStatus; // Include status for clarity
}

interface CheckAppointmentsData {
  hasActiveAppointments: boolean;
  appointments: ActiveAppointmentDetail[] | null;
}

export async function checkDoctorAppointments(
  prevState: unknown,
  doctorId: string
): Promise<ServerActionResponse<CheckAppointmentsData>> {
  await requireAdmin(); // Ensure caller is an admin
  const TIMEZONE = getAppTimeZone();
  if (!doctorId) {
    return {
      success: false,
      message: "Doctor ID is required.",
      error: "Doctor ID missing in checkDoctorAppointments.",
      errorType: "badRequest",
    };
  }

  try {
    // Find appointments with the specified statuses
    const activeAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorId,
        status: {
          in: [
            AppointmentStatus.BOOKING_CONFIRMED,
            AppointmentStatus.CASH,
            // DO NOT include CANCELLED, COMPLETED, NO_SHOW here
          ],
        },
      },
      select: {
        appointmentId: true,
        appointmentStartUTC: true,
        patientName: true,
        phoneNumber: true,
        status: true, // Select status to potentially display if needed
        user: {
          select: {
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: {
        appointmentStartUTC: "asc", // Keep ordering by date
      },
    });

    const hasActiveAppointments = activeAppointments.length > 0;

    if (!hasActiveAppointments) {
      // Return early if no active appointments found
      return {
        success: true,
        data: { hasActiveAppointments: false, appointments: null },
      };
    }

    // Format the appointments for display
    const formattedAppointments: ActiveAppointmentDetail[] =
      activeAppointments.map((apt) => {
        const localStartTime = toZonedTime(apt.appointmentStartUTC, TIMEZONE);
        return {
          id: apt.appointmentId,
          date: format(localStartTime, "MMM dd, yyyy"),
          time: format(localStartTime, "hh:mm a"),
          patientName: apt.patientName,
          patientPhone: apt.phoneNumber || apt.user?.phoneNumber || null,
          patientEmail: apt.user?.email || null,
          status: apt.status, // Include status in formatted data
        };
      });

    // Return the result with the list of active appointments
    return {
      success: true,
      data: {
        hasActiveAppointments: true,
        appointments: formattedAppointments,
      },
    };
  } catch (error) {
    const techError =
      error instanceof Error
        ? error.message
        : "Unknown error checking appointments";
    return {
      success: false,
      message: "Failed to check for doctor appointments.",
      error: techError,
      errorType: "serverError",
    };
  }
}

interface DoctorAppointmentsData {
  appointments: AppointmentDetailForLeave[];
}

export async function getDoctorAppointmentsForDate(
  doctorId: string,
  dateStr: string
): Promise<ServerActionResponse<DoctorAppointmentsData>> {
  await requireAdmin();
  const TIMEZONE = getAppTimeZone();
  if (!doctorId || !dateStr) {
    return {
      success: false,
      message: "Doctor ID and date are required to fetch appointments.", // User-friendly
      error: "getDoctorAppointmentsForDate: Missing doctorId or dateStr.", // Technical
      errorType: "BAD_REQUEST",
    };
  }

  try {
    const appointments = await getDoctorAppointmentsForDateInternal(
      doctorId,
      dateStr
    );

    // Format for client consumption
    const formattedAppointments = appointments.map((apt) => {
      const localStartTime = toZonedTime(apt.appointmentStartUTC, TIMEZONE);
      return {
        id: apt.appointmentId,
        time: format(localStartTime, "hh:mm a"),
        patientName: apt.patientName,
        bookedByName: apt.user?.name,
        phoneNumber: (apt.phoneNumber || apt.user?.phoneNumber) ?? null, // Get phone from appointment or user profile
        email: apt.user?.email ?? null, // Get email from related user
        status: apt.status,
      };
    });

    return {
      success: true,
      data: { appointments: formattedAppointments }, // <-- Wrap in data
    };
  } catch (error) {
    console.error(
      `Error fetching appointments for doctor ${doctorId} on ${dateStr}:`,
      error
    );
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error fetching appointments";
    return {
      success: false,
      message: "Failed to fetch appointments.",
      error: message,
      errorType: "serverError",
    };
  }
}

export async function updateDoctorLeave(
  doctorId: string,
  leaves: Record<string, LeaveType | "WORKING">
): Promise<ServerActionResponse> {
  await requireAdmin(); // Ensure admin access

  if (!doctorId || !leaves) {
    return {
      success: false,
      message: "Doctor ID and leave data are required.",
      error: "Missing required parameters for updateDoctorLeave.",
      errorType: "badRequest",
    };
  }

  try {
    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      console.log("[updateDoctorLeave] Starting transaction...");
      // --- Conflict Check ---
      for (const dateStr in leaves) {
        const leaveType = leaves[dateStr];
        console.log(
          `[updateDoctorLeave] Processing date: ${dateStr}, type: ${leaveType}`
        );

        // Only check conflicts if marking for leave (not 'WORKING')
        if (leaveType !== "WORKING") {
          console.log(
            `[updateDoctorLeave] Checking conflicts for ${dateStr}...`
          );
          // Fetch conflicting appointments based on leave type
          const conflictingAppointments =
            await getDoctorAppointmentsForDateInternal(
              doctorId,
              dateStr,
              leaveType // Pass leave type to filter relevant times
            );
          console.log(
            `[updateDoctorLeave] Found ${conflictingAppointments.length} conflicting appointments for ${dateStr}`
          );

          if (conflictingAppointments.length > 0) {
            // If conflicts found, throw an error to rollback the transaction
            throw new Error(
              `Cannot mark leave for ${dateStr}. Existing appointments found. Please cancel them first.`
            );
          }
        }
      }
      // --- End Conflict Check ---

      // If no conflicts found, proceed with updates/deletes
      console.log(
        "[updateDoctorLeave] No conflicts found. Proceeding with DB operations..."
      );
      for (const dateStr in leaves) {
        const leaveType = leaves[dateStr];
        // Create a Date object explicitly representing midnight UTC for the given date string
        // This avoids timezone ambiguities when interacting with Prisma/DB
        const leaveDateUtc = new Date(dateStr + "T00:00:00.000Z");

        if (leaveType === "WORKING") {
          console.log(
            `[updateDoctorLeave] Deleting leave record for ${dateStr}`
          );
          // Delete the leave record if it exists for this date
          await tx.doctorLeave.deleteMany({
            where: {
              doctorId: doctorId,
              leaveDate: leaveDateUtc,
            },
          });
        } else {
          console.log(
            `[updateDoctorLeave] Upserting leave record for ${dateStr} with type ${leaveType}`
          );
          // Upsert (create or update) the leave record
          await tx.doctorLeave.upsert({
            where: {
              // Need a unique constraint for upsert, e.g., doctorId + leaveDate
              doctorId_leaveDate: {
                doctorId: doctorId,
                leaveDate: leaveDateUtc,
              },
            },
            update: {
              leaveType: leaveType,
            },
            create: {
              doctorId: doctorId,
              leaveDate: leaveDateUtc,
              leaveType: leaveType,
            },
          });
        }
      }
      console.log("[updateDoctorLeave] Transaction completed successfully.");
    }); // End transaction

    // Revalidate relevant paths after successful transaction
    revalidatePath(`/admin/doctors/${doctorId}/manage`);
    revalidatePath(`/doctors/${doctorId}`);

    return { success: true, message: "Leave updated successfully." };
  } catch (error) {
    console.error(`Error updating leave for doctor ${doctorId}:`, error);

    return {
      success: false,
      message: "Failed to update leave due to a server issue.",
      error: error instanceof Error ? error.message : "Unknown  server error",
      errorType: "SERVER_ERROR",
    };
  }
}

export async function getAdminDoctorById(
  doctorId: string
): Promise<ServerActionResponse<AdminDoctorDataSimple>> {
  await requireAdmin(); // Ensure admin access

  if (!doctorId) {
    return {
      success: false,
      message: "Doctor not found.",
      error: `Doctor ${doctorId} not found.`,
      errorType: "notFound",
    };
  }

  try {
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId, role: Role.DOCTOR, isActive: true }, // Ensure it's a doctor
      select: {
        id: true,
        name: true,
      },
    });

    if (!doctor) {
      return { success: false, error: "Doctor not found." };
    }

    return {
      success: true,
      data: { id: doctor.id, name: doctor.name }, // <-- Wrap in data
    };
  } catch (error) {
    console.error(`Error fetching doctor details for ${doctorId}:`, error);
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error fetching doctor details";
    return {
      success: false,
      message: "Failed to fetch doctor details.",
      error: message,
      errorType: "serverError",
    };
  }
}

interface GetLeavesData {
  leaves: InitialLeave[];
}

export async function getDoctorLeaves(
  doctorId: string
): Promise<ServerActionResponse<GetLeavesData>> {
  if (!doctorId) {
    return {
      success: false,
      message: "Doctor ID is required.", // User-friendly message
      error: "Doctor ID missing for getDoctorLeaves.", // Technical detail
      errorType: "badRequest",
    };
  }

  try {
    const leaves = await prisma.doctorLeave.findMany({
      where: { doctorId },
      select: {
        leaveDate: true,
        leaveType: true,
      },
      orderBy: {
        leaveDate: "asc",
      },
    });

    // Format the leave dates to 'yyyy-MM-dd' strings
    const formattedLeaves = leaves.map((leave) => ({
      date: format(leave.leaveDate, "yyyy-MM-dd"), // Format Date object to string
      type: leave.leaveType,
    }));

    return {
      success: true,
      message: "Doctor leaves fetched successfully.",
      data: { leaves: formattedLeaves }, // Wrap data in 'data' field
    };
  } catch (error) {
    console.error(`Error fetching leaves for doctor ${doctorId}:`, error);
    const techError =
      error instanceof Error
        ? error.message
        : "Unknown database error fetching leaves.";
    return {
      success: false,
      message: "Failed to fetch doctor's leave records.", // User-friendly message
      error: techError, // Technical detail
      errorType: "serverError",
    };
  }
}
