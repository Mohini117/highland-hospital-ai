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
