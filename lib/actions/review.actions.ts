"use server";
import { ServerActionResponse, DoctorReview } from "@/types";
import { getAppTimeZone } from "@/lib/config";
import { prisma } from "@/db/prisma";
import { format, toZonedTime } from "date-fns-tz";

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
