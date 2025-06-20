"use server";
import { ServerActionResponse, DepartmentData, BannerImageData } from "@/types";
import { prisma } from "@/db/prisma";

interface GetDepartmentData {
  departments: DepartmentData[];
}

export async function getDepartments(): Promise<
  ServerActionResponse<GetDepartmentData>
> {
  try {
    // Attempt to retrieve all departments from the database
    // The results are ordered by the 'createdAt' field in ascending order
    const departments = await prisma.department.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    // If the query is successful, return a success response with the data
    return {
      success: true,
      data: { departments },
      message: "Departments fetched successfully.",
    };
  } catch (error) {
    // Log the error to the console for debugging purposes
    console.error("Error fetching departments:", error);

    // If an error occurs, return a failure response
    return {
      success: false,
      message: "failed to fetch departments",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error fetching departments",
      errorType: "SERVER_ERROR",
    };
  }
}

interface BannerResponse {
  banners: BannerImageData[];
}

export async function getBanners(): Promise<
  ServerActionResponse<BannerResponse>
> {
  try {
    // Fetch all records from the BannerImage table.
    // The 'orderBy' clause ensures that the banners are returned in the sequence
    // specified by the 'order' field, from lowest to highest.
    const banners = await prisma.bannerImage.findMany({
      orderBy: {
        order: "asc",
      },
    });

    // Return a standardized success response object containing the fetched data.
    return {
      success: true,
      data: { banners },
      message: "Banner images fetched successfully.",
    };
  } catch (error) {
    // Log the actual error to the server console for debugging purposes.
    console.error("Error fetching banners:", error);

    // Determine the error message to return to the client.
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    // Return a standardized error response object.
    return {
      success: false,
      message: "Could not fetch banner images. Please try again later.",
      error: errorMessage,
      errorType: "SERVER_ERROR",
    };
  }
}
