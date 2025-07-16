"use server";
import {
  ServerActionResponse,
  PatientProfile,
  Appointment,
  ProfileUpdateInput,
} from "@/types";
import {
  signInFormSchema,
  signUpFormSchema,
  patientProfileUpdateSchema,
} from "@/lib/validators";
import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { prisma } from "@/db/prisma";
import { hashSync } from "bcrypt-ts-edge";
import { auth } from "@/auth";
import { AppointmentStatus } from "@/lib/generated/prisma";
import { getAppTimeZone } from "@/lib/config";
import { toZonedTime, format } from "date-fns-tz";
import { PAGE_SIZE } from "@/lib/constants";
import { extractFileKeyFromUrl } from "@/lib/uploadthing-helper";
import { UTApi } from "uploadthing/server";
import { revalidatePath } from "next/cache";

const utapi = new UTApi();

export async function signInWithCredentials(
  prevState: unknown,
  formData: FormData
): Promise<ServerActionResponse> {
  // 1. Extract and validate form data using Zod
  const rawFormData = Object.fromEntries(formData.entries());
  const validationResult = signInFormSchema.safeParse(rawFormData);

  // If validation fails, return an error response
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0];
    return {
      success: false,
      message: firstError.message,
      error: "Validation Error",
      errorType: "Validation",
      fieldErrors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validationResult.data;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";

  try {
    // 2. Attempt to sign in using NextAuth.js
    // On success, NextAuth.js will handle the redirect by throwing a special error,
    // which is caught and handled by the Next.js middleware.
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl, // Redirect to the callback URL or home page
    });

    // This part is generally not reached on success because signIn throws a redirect error.
    // It's here as a fallback.
    return {
      success: true,
      message: "Sign-in successful.",
    };
  } catch (error) {
    // 3. Handle different types of errors
    if (error instanceof AuthError) {
      // Handle specific authentication errors from NextAuth.js
      switch (error.type) {
        case "CredentialsSignin":
          return {
            success: false,
            message: "Invalid email or password. Please try again.",
            error: "Invalid Credentials",
            errorType: "Authentication",
          };
        default:
          return {
            success: false,
            message: "An authentication error occurred. Please try again.",
            error: "Authentication Error",
            errorType: "Authentication",
          };
      }
    }

    // For any other error, including the redirect error thrown by NextAuth.js on success,
    // we re-throw it to let Next.js handle it.
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut({ redirectTo: "/", redirect: true });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    throw new Error("Sign out failed on the server");
  }
}

export async function signUp(
  prevState: unknown,
  formData: FormData
): Promise<ServerActionResponse> {
  // Extract data from formData by converting it to an object
  const formValues = Object.fromEntries(formData.entries());

  // Validate the form data using the new schema
  const validationResult = signUpFormSchema.safeParse(formValues);

  if (!validationResult.success) {
    return {
      success: false,
      message: "Validation failed.",
      fieldErrors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = validationResult.data;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";

  try {
    // Check if a user with the given email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        message:
          "Please use another email as a User with this email already exists",
        error: "A user with this email already exists.",
        errorType: "Conflict",
      };
    }

    // Hash the password before saving it to the database
    //const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user in the database
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashSync(password, 10),
      },
    });

    // Sign in the user automatically after successful registration
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });

    // This part might not be reached if signIn redirects successfully
    return {
      success: true,
      message: "Sign up successful! Redirecting...",
    };
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error;

    // //Another way to handle Zod errors
    // if (error instanceof ZodError) {
    //   return {
    //     success: false,
    //     error: "An unexpected error occurred. Please try again.",
    //     message: "Sign up did not suceed. Please try again.",
    //     errorType: "InternalServerError",
    //     fieldErrors: error.flatten().fieldErrors,
    //   };
    // }

    //Another way to identify email already used
    // if (
    //   error instanceof Prisma.PrismaClientKnownRequestError &&
    //   error.code == "P2002"
    // ) {
    //   return {
    //     success: false,
    //     error: "An unexpected error occurred. Please try again.",
    //     message: "email already used",
    //     errorType: "InternalServerError",
    //   };
    // }

    const errorMessage =
      error instanceof Error ? error.message : "Unkown error type caught.";

    return {
      success: false,
      error: errorMessage,
      message: "Sign up did not suceed. Please try again.",
      errorType: "SERVER_ERROR",
    };
  }
}

export async function getUserDetails(): Promise<
  ServerActionResponse<PatientProfile>
> {
  try {
    // 1. Get the current user session
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        message: "User not authenticated",
        error: "Unauthorized: No user session found.",
        errorType: "AUTHENTICATION",
      };
    }

    const userId = session.user.id;

    // 2. Fetch the user from the database
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return {
        success: false,
        message: "User Profile not found",
        error: `User not found.: ${session.user.id}`,
        errorType: "notFound",
      };
    }

    // 3. Map the database user model to the PatientProfile type
    const patientProfile: PatientProfile = {
      id: user.id,
      name: user.name || "",
      email: user.email,
      phoneNumber: user.phoneNumber ?? undefined,
      address: user.address ?? undefined,
      // Convert DateTime to ISO string, or return undefined if null
      dateOfBirth: user.dateofbirth?.toISOString().split("T")[0] ?? undefined,
      image: user.image ?? undefined,
    };

    // 4. Return a successful response with the user data
    return {
      success: true,
      message: "User details fetched successfully.",
      data: patientProfile,
    };
  } catch (error) {
    // 5. Handle unexpected errors
    console.error("Error in getUserDetails server action:", error);
    return {
      success: false,
      message: "Failed to load profile due to erver error",
      error: error instanceof Error ? error.message : "unkown error",
      errorType: "SERVER_ERROR",
    };
  }
}

interface UserAppointmentsData {
  appointments: Appointment[];
  totalAppointments: number;
  totalPages: number;
  currentPage: number;
}

const mapAppointmentStatus = (
  status: AppointmentStatus
): Appointment["status"] | null => {
  switch (status) {
    case AppointmentStatus.BOOKING_CONFIRMED:
      return "upcoming";
    case AppointmentStatus.COMPLETED:
      return "completed";
    case AppointmentStatus.CANCELLED:
      return "cancelled";
    case AppointmentStatus.NO_SHOW:
      return "no show";
    case AppointmentStatus.CASH:
      return "cash payment";
    default:
      // Return null for statuses we don't want to display, like PAYMENT_PENDING
      return null;
  }
};

export async function getUserAppointments(params?: {
  page?: number;
  limit?: number;
}): Promise<ServerActionResponse<UserAppointmentsData>> {
  try {
    // 1. Authenticate the user
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        message: "User not authenticated",
        error: "Unauthorized: No user session found.",
        errorType: "AUTHENTICATION",
      };
    }
    const userId = session.user.id;

    // 2. Set up pagination parameters
    const page = params?.page || 1;
    const limit = params?.limit || PAGE_SIZE;
    const skip = (page - 1) * limit;

    // 3. Define the common where clause to exclude pending payments
    const whereClause = {
      userId: userId,
      status: {
        not: AppointmentStatus.PAYMENT_PENDING,
      },
    };

    // 4. Get the total count of appointments for the user
    const totalAppointments = await prisma.appointment.count({
      where: whereClause,
    });

    if (totalAppointments === 0) {
      return {
        success: true,
        data: {
          appointments: [],
          totalAppointments: 0,
          totalPages: 0,
          currentPage: 1,
        },
      };
    }

    // 5. Fetch the paginated appointments from the database
    const appointmentsFromDb = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        doctor: {
          select: {
            name: true,
            id: true,
            doctorProfile: {
              select: {
                specialty: true,
              },
            },
          },
        },
        testimonial: {
          select: {
            testimonialId: true,
          },
        },
      },
      orderBy: {
        appointmentStartUTC: "desc", // Show most recent first
      },
      skip: skip,
      take: limit,
    });

    // 6. Get the application timezone
    const timeZone = getAppTimeZone();

    // 7. Map database results to the required 'Appointment' interface
    const formattedAppointments: Appointment[] = appointmentsFromDb.map(
      (appt) => {
        const mappedStatus = mapAppointmentStatus(appt.status);
        if (!mappedStatus) {
          // This should ideally not happen due to the where clause, but it's a good safeguard.
          throw new Error(`Unhandled appointment status: ${appt.status}`);
        }

        // Convert UTC date to the application's timezone
        const zonedTime = toZonedTime(appt.appointmentStartUTC, timeZone);

        return {
          id: appt.appointmentId,
          doctorName: appt.doctor.name,
          doctorId: appt.doctorId,
          specialty: appt.doctor.doctorProfile?.specialty ?? "General",
          date: format(zonedTime, "MMMM d, yyyy", { timeZone }),
          time: format(zonedTime, "hh:mm a", { timeZone }),
          status: mappedStatus,
          reasonForVisit: appt.reasonForVisit ?? undefined,
          isReviewed: !!appt.testimonial, // Check if a testimonial exists
        };
      }
    );

    // 8. Calculate total pages and return the successful response
    const totalPages = Math.ceil(totalAppointments / limit);

    return {
      success: true,
      data: {
        appointments: formattedAppointments,
        totalAppointments,
        totalPages,
        currentPage: page,
      },
    };
  } catch (error) {
    console.error("Error in getUserAppointments server action:", error);
    return {
      success: false,
      message:
        "Failed to fetch appointments due to a server error. Pls try again later",
      error: error instanceof Error ? error.message : "unkown databse error",
      errorType: "SERVER_ERROR",
    };
  }
}

export async function updateProfileImage(
  imageUrl: string
): Promise<ServerActionResponse> {
  // 1. Authenticate the user
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "User not authenticated",
      error: "Unauthorized: You must be logged in to update your profile.",
      errorType: "AUTHENTICATION",
    };
  }

  const { id: userId } = session.user;

  try {
    // Get the current user to find the old image URL
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    const oldImageUrl = currentUser?.image;

    // 2. Extract file key from the old image URL if it exists
    const oldFileKey = extractFileKeyFromUrl(oldImageUrl);

    // 3. Update just the image field in the database
    await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
    });

    // 4. Attempt to delete the old image if it exists
    if (oldFileKey) {
      try {
        // We don't want the entire action to fail if the old file deletion fails.
        // This could happen if the file was already deleted or if there's a temporary issue with the storage provider.
        // We'll proceed even if this step throws an error, but we'll log it.
        await utapi.deleteFiles(oldFileKey);
      } catch (deleteError) {
        console.log(
          `Failed to delete old profile image for user ${userId} with key ${oldFileKey}.`,
          deleteError
        );
        // Note: We are not returning an error response here because the primary action (updating the DB) was successful.
      }
    }

    // 5. Revalidate the user profile page to reflect changes immediately
    // Adjust the path as needed for your application structure.

    revalidatePath("/user/profile"); // Revalidate a public profile page if it exists

    return {
      success: true,
      message: "Profile image updated successfully.",
    };
  } catch (error) {
    console.error("Error updating profile image:", error);
    return {
      success: false,
      message: "Failed to update profile image. Please try again later.",
      error: error instanceof Error ? error.message : "Unknown error",
      errorType: "SERVER_ERROR",
    };
  }
}

export async function updateUserProfile(
  data: ProfileUpdateInput
): Promise<ServerActionResponse> {
  // 1. Authentication: Get the current user session
  // This is a placeholder for your actual authentication logic (e.g., from NextAuth.js)
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      message: "User not authenticated",
      error: "Unauthorized. You must be logged in to update your profile.",
      errorType: "authentication",
    };
  }
  const userId = session.user.id;

  // 2. Validation: Validate the incoming data against the schema
  const validatedFields = patientProfileUpdateSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed. Please check the fields.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
      errorType: "VALIDATION_ERROR",
    };
  }

  // 3. Database Operation: Update the user record in the database
  try {
    const { name, phoneNumber, address, dateOfBirth } = validatedFields.data;

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name,
        phoneNumber,
        address,
        // The prisma model uses 'dateofbirth' (lowercase o)
        dateofbirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
    });

    revalidatePath("/user/profile"); // Revalidate the user profile page to reflect changes immediately

    return {
      success: true,
      message: "Profile updated successfully.",
    };
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Failed to update user profile:", error);

    // Return a generic error response to the client
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to update profile. Please try again later.",
      errorType: "SERVER_ERROR",
    };
  }
}
