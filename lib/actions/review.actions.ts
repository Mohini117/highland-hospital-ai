"use server";
import { ServerActionResponse, DoctorReview } from "@/types";
import { getAppTimeZone } from "@/lib/config";
import { prisma } from "@/db/prisma";
import { format, toZonedTime } from "date-fns-tz";
import { auth } from "@/auth";
import { fullReviewDataSchema } from "@/lib/validators";
import { AppointmentStatus } from "@/lib/generated/prisma";
import { revalidatePath } from "next/cache";

export async function getDoctorTestimonials(): Promise<
  ServerActionResponse<DoctorReview[]>
> {
  try {
    // Retrieve the application's default timezone.
    const timeZone = getAppTimeZone();

    // Fetch all testimonials from the database, including related patient info.
    // The testimonials are ordered by creation date to show the most recent first.
    const testimonials = await prisma.doctorTestimonial.findMany({
      orderBy: [
        { rating: "desc" },
        {
          createdAt: "desc",
        },
      ],
      take: 3,
      include: {
        // Include the patient model to access the patient's name and image.
        patient: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    });

    // Map the raw testimonial data to the DoctorReview format.
    const formattedTestimonials: DoctorReview[] = testimonials.map(
      (testimonial) => {
        // The 'createdAt' date is stored in UTC in the database.
        const utcDate = testimonial.createdAt;

        // Convert the UTC date to the application's configured timezone.
        const zonedDate = toZonedTime(utcDate, timeZone);

        // Format the zoned date into a readable string (e.g., "25 Dec 2023").
        const formattedDate = format(zonedDate, "MMMM d, yyyy 'at' hh:mm a");

        return {
          id: testimonial.testimonialId,
          rating: testimonial.rating,
          reviewDate: formattedDate,
          // Note: Mapping to 'texstimonialText' as per the provided DoctorReview type.
          testimonialText: testimonial.testimonialText,
          patientName: testimonial.patient.name,
          patientImage: testimonial.patient.image || null,
        };
      }
    );

    // Return a successful response with the formatted data.
    return {
      success: true,
      data: formattedTestimonials,
      message: "Top Testimonials fetched successfully",
    };
  } catch (error) {
    // Log the error for debugging purposes on the server.
    console.error("Error fetching doctor testimonials:", error);

    // Determine the error message to return.
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    // Return a structured error response.
    return {
      success: false,
      message: "Failed to fetch testimonials. Please try again later.",
      error: errorMessage,
      errorType: "SERVER_ERROR",
    };
  }
}

interface DoctorReviewsPaginatedData {
  reviews: DoctorReview[];
  totalReviews: number;
  totalPages: number;
  currentPage: number;
}

export async function getDoctorReviewsPaginated(
  doctorId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<ServerActionResponse<DoctorReviewsPaginatedData>> {
  const timeZone = getAppTimeZone(); // datetime is stored in UTC in the
  // database and we want to show it in the local timezoen in the FE

  try {
    // --- 1. Validation ---
    // Ensure the page number is a positive integer.
    const pageNumber = Math.max(1, page);
    const offset = (pageNumber - 1) * pageSize;
    //100 reviews , pageSize=10 , current = 2  , offset = (2-1)*10 = 10

    // --- 2. Database Queries (executed in parallel) ---
    const [totalReviews, testimonials] = await prisma.$transaction([
      // Query 1: Get the total count of testimonials for the doctor
      prisma.doctorTestimonial.count({
        where: { doctorId },
      }),
      // Query 2: Get the paginated list of testimonials
      prisma.doctorTestimonial.findMany({
        where: { doctorId },
        // Include related patient data to get name and image
        include: {
          patient: {
            select: {
              name: true,
              image: true,
            },
          },
        },
        // Order by the most recent testimonials first
        orderBy: {
          createdAt: "desc",
        },
        // Apply pagination
        skip: offset,
        take: pageSize,
      }),
    ]);

    // --- 3. Handle No Reviews Case ---
    if (totalReviews === 0) {
      return {
        success: true,
        data: {
          reviews: [],
          totalReviews: 0,
          totalPages: 0,
          currentPage: 1,
        },
      };
    }

    // --- 4. Data Transformation ---
    // Map the Prisma model to the DoctorReview interface
    const reviews: DoctorReview[] = testimonials.map((testimonial) => {
      // Convert the UTC date from the database to the specified timezone
      const zonedDate = toZonedTime(testimonial.createdAt, timeZone);
      // Format the zoned date into a readable string
      const formattedDate = format(zonedDate, "MMMM d, yyyy", { timeZone });

      return {
        id: testimonial.testimonialId,
        rating: testimonial.rating,
        reviewDate: formattedDate,
        testimonialText: testimonial.testimonialText,
        patientName: testimonial.patient.name,
        patientImage: testimonial.patient.image,
      };
    });

    // --- 5. Calculate Pagination Details ---
    const totalPages = Math.ceil(totalReviews / pageSize);
    //reviews = 100 , page size = 9 , 100/9 = 11 pages = 99 reviews , 1 page with 1 review

    // --- 6. Return Success Response ---
    return {
      success: true,
      data: {
        reviews,
        totalReviews,
        totalPages,
        currentPage: pageNumber,
      },
    };
  } catch (error) {
    // --- 7. Error Handling ---
    console.error("Error in getDoctorReviewsPaginated:", error);
    return {
      success: false,
      message: "failed to fetch doctor reviews",
      error:
        error instanceof Error ? error.message : "An unknown error occurred.",
      errorType: "SERVER_ERROR",
    };
  }
}

export async function submitPatientReview(clientData: {
  appointmentId: string;
  doctorId: string;
  rating: number;
  reviewText: string;
}): Promise<ServerActionResponse> {
  // 1. Check user authentication
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      message: "Authentication required. Please log in to submit a review.",
      errorType: "Unauthorized",
    };
  }
  const patientId = session.user.id;

  // 2. Validate the input data against the Zod schema
  const fullData = { ...clientData, patientId };
  const validationResult = fullReviewDataSchema.safeParse(fullData);

  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid data provided. Please check your input.",
      fieldErrors: validationResult.error.flatten().fieldErrors,
      errorType: "Validation Error",
    };
  }

  const { appointmentId, doctorId, rating, reviewText } = validationResult.data;

  try {
    // 3. Use a transaction to ensure all database operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      // 3a. Find the appointment and verify its status and ownership
      const appointment = await tx.appointment.findUnique({
        where: { appointmentId },
        include: { testimonial: true }, // Check if a testimonial already exists
      });

      if (!appointment) {
        throw new Error("Appointment not found.");
      }
      if (appointment.status !== AppointmentStatus.COMPLETED) {
        throw new Error(
          "Reviews can only be submitted for completed appointments."
        );
      }
      if (appointment.userId !== patientId) {
        throw new Error("You are not authorized to review this appointment.");
      }
      if (appointment.testimonial) {
        throw new Error(
          "A review has already been submitted for this appointment."
        );
      }

      // 3b. Create the new testimonial
      await tx.doctorTestimonial.create({
        data: {
          appointmentId,
          doctorId,
          patientId,
          rating,
          testimonialText: reviewText,
        },
      });

      // 3c. Calculate the new average rating and review count for the doctor
      const stats = await tx.doctorTestimonial.aggregate({
        where: { doctorId },
        _avg: {
          rating: true,
        },
        _count: {
          testimonialId: true,
        },
      });

      const reviewCount = stats._count.testimonialId;
      const averageRating = stats._avg.rating || 0;

      // 3d. Update the doctor's profile with the new stats
      await tx.doctorProfile.update({
        where: { userId: doctorId },
        data: {
          reviewCount,
          rating: parseFloat(averageRating.toFixed(1)), // Store with 1 decimal places
        },
      });

      //return testimonial;
    });

    // 4. Revalidate paths to update the UI
    revalidatePath(`/user/profile`); // Revalidate

    // 5. Return a success response
    return {
      success: true,
      message: "Your review has been submitted successfully!",
      //data: newTestimonial,
    };
  } catch (error) {
    // 6. Handle any errors that occurred during the process
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    console.error("Error submitting patient review:", error);
    return {
      success: false,
      message: errorMessage,
      error: errorMessage,
      errorType: "SERVER_ERROR",
    };
  }
}
