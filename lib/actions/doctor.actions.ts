"use server";
import { ServerActionResponse, DoctorSummary, DoctorDetails } from "@/types";
import { prisma } from "@/db/prisma";
import { Role } from "@/lib/generated/prisma";

export async function getOurDoctors(): Promise<
  ServerActionResponse<DoctorSummary[]>
> {
  try {
    // Fetch users who have the DOCTOR role and an active profile.
    // We use `select` to efficiently query only the necessary fields.
    const doctors = await prisma.user.findMany({
      where: {
        role: Role.DOCTOR,
        doctorProfile: {
          isActive: true,
        },
      },
      select: {
        id: true,
        name: true,
        image: true, // This will be mapped to imageUrl
        doctorProfile: {
          select: {
            specialty: true,
            rating: true,
            reviewCount: true,
          },
        },
      },
      orderBy: {
        // Optional: you can order the results, e.g., by rating or name
        doctorProfile: {
          rating: "desc",
        },
      },
    });

    // The `where` clause ensures `doctorProfile` is not null, but it's good practice to handle it safely.
    if (!doctors) {
      return {
        success: true,
        data: [], // Return empty array if no doctors found
      };
    }

    // Map the fetched data to the DoctorSummary structure.
    const formattedDoctors: DoctorSummary[] = doctors.map((doc) => ({
      id: doc.id,
      name: doc.name,
      imageUrl: doc.image,
      specialty: doc.doctorProfile?.specialty ?? "N/A",
      rating: doc.doctorProfile?.rating ?? 0,
      reviewCount: doc.doctorProfile?.reviewCount ?? 0,
    }));

    // Return a success response with the formatted doctor data.
    return {
      success: true,
      data: formattedDoctors,
    };
  } catch (error) {
    // Log the detailed error for server-side debugging.
    console.error("Error fetching our doctors:", error);

    // Return a generic error response to the client.
    return {
      success: false,
      message:
        "An unexpected error occurred while fetching doctor information.",
      error: error instanceof Error ? error.message : String(error),
      errorType: "SERVER_ERROR",
    };
  }
}

export async function getDoctorDetails(
  doctorId: string
): Promise<ServerActionResponse<DoctorDetails>> {
  // Validate input to ensure doctorId is provided.
  if (!doctorId) {
    return {
      success: false,
      message: "Doctor ID is required.",
    };
  }

  try {
    // Query the database to find the user with the specified ID and DOCTOR role.
    // We select specific fields from the User and the related DoctorProfile models.
    const doctor = await prisma.user.findUnique({
      where: {
        id: doctorId,
        role: "DOCTOR",
      },
      select: {
        id: true,
        name: true,
        image: true,
        doctorProfile: {
          select: {
            credentials: true,
            specialty: true,
            rating: true,
            reviewCount: true,
            languages: true,
            specializations: true,
            brief: true,
          },
        },
      },
    });

    // If no doctor is found or the doctor does not have a profile,
    // return a "not found" response.
    if (!doctor || !doctor.doctorProfile) {
      return {
        success: false,
        message: "Doctor not found or profile is incomplete.",
        errorType: "NOT_FOUND",
      };
    }

    // Map the fetched data to the DoctorDetails interface.
    // Note the mapping from `specialty` (from schema) to `speciality` (in type).
    const doctorDetails: DoctorDetails = {
      id: doctor.id,
      name: doctor.name,
      image: doctor.image,
      credentials: doctor.doctorProfile.credentials,
      speciality: doctor.doctorProfile.specialty,
      rating: doctor.doctorProfile.rating,
      reviewCount: doctor.doctorProfile.reviewCount,
      languages: doctor.doctorProfile.languages,
      specializations: doctor.doctorProfile.specializations,
      brief: doctor.doctorProfile.brief,
    };

    // Return a successful response with the doctor's details.
    return {
      success: true,
      message: "Doctor details fetched successfully.",
      data: doctorDetails,
    };
  } catch (error) {
    // In case of any database or unexpected errors, log the error
    // and return a generic error response.
    console.error("Error in getDoctorDetails server action:", error);
    return {
      success: false,
      message: "An unexpected error occurred while fetching doctor details.",
      error: error instanceof Error ? error.message : "Unknown error",
      errorType: "SERVER_ERROR",
    };
  }
}
