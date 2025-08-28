"use server";
import { ServerActionResponse, DepartmentData, BannerImageData } from "@/types";
import { prisma } from "@/db/prisma";

import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

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

export async function addBanner(data: {
  name: string;
  imageUrl: string;
  fileKey: string;
}): Promise<ServerActionResponse> {
  await requireAdmin();

  const { name, imageUrl, fileKey } = data;

  // Simplified server-side validation for the data we expect.
  if (!name || !imageUrl || !fileKey) {
    return {
      success: false,
      message: "Validation failed. Name and image details are required.",
      errorType: "VALIDATION_ERROR",
    };
  }

  try {
    // Check if a banner already exists.
    const count = await prisma.bannerImage.count();
    if (count >= 1) {
      return {
        success: false,
        message: "A banner has already been uploaded. Please delete it first.",
        errorType: "CONFLICT_ERROR",
      };
    }

    // The upload to UploadThing is already done. We just save the data.
    await prisma.bannerImage.create({
      data: {
        name,
        imageUrl,
        fileKey,
        order: 1, // Always set order to 1 since there's only one banner
      },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/");

    return { success: true, message: "Banner added successfully." };
  } catch (error) {
    console.error("Error adding banner:", error);
    const technicalError =
      error instanceof Error ? error.message : "Unknown error adding banner";

    return {
      success: false,
      message: "Failed to add banner due to a server issue.",
      error: technicalError,
      errorType: "SERVER_ERROR",
    };
  }
}

export async function deleteBanner(
  bannerId: string
): Promise<ServerActionResponse> {
  await requireAdmin();

  if (!bannerId) {
    return {
      success: false,
      message: "Banner ID is required for deletion.",
      error: "deleteBanner: Banner ID was not provided.",
      errorType: "BAD_REQUEST",
    };
  }

  try {
    const banner = await prisma.bannerImage.findUnique({
      where: { id: bannerId },
      select: { fileKey: true },
    });

    if (!banner) {
      return {
        success: false,
        message: "Banner not found. It might have already been deleted.",
        error: `deleteBanner: Banner with ID ${bannerId} not found.`,
        errorType: "NOT_FOUND",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.bannerImage.delete({
        where: { id: bannerId },
      });

      try {
        console.log(
          `[deleteBanner] Attempting to delete file key: ${banner.fileKey}`
        );
        const deleteResult = await utapi.deleteFiles(banner.fileKey);
        if (!deleteResult.success) {
          console.warn(
            `[deleteBanner] Failed to delete file ${banner.fileKey} from UploadThing, but DB record deleted.`
          );
        } else {
          console.log(
            `[deleteBanner] Successfully deleted file ${banner.fileKey} from UploadThing.`
          );
        }
      } catch (uploadthingError) {
        console.error(
          `[deleteBanner] Error deleting file ${banner.fileKey} from UploadThing:`,
          uploadthingError
        );
      }
    });

    revalidatePath("/admin/settings");
    revalidatePath("/");

    return { success: true, message: "Banner deleted successfully." };
  } catch (error) {
    console.error(`Error deleting banner ${bannerId}:`, error);
    const technicalError =
      error instanceof Error ? error.message : "Unknown error deleting banner";
    return {
      success: false,
      message: "Failed to delete banner.",
      error: technicalError,
      errorType: "SERVER_ERROR",
    };
  }
}

export async function updateBannerName(
  bannerId: string,
  newName: string
): Promise<ServerActionResponse> {
  await requireAdmin();
  if (!bannerId || !newName) {
    return {
      success: false,
      message: "Banner ID and new name are required.",
      error: "updateBannerName: Banner ID or new name was not provided.",
      errorType: "BAD_REQUEST",
    };
  }
  try {
    await prisma.bannerImage.update({
      where: { id: bannerId },
      data: { name: newName },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/");
    return { success: true, message: "Banner name updated successfully." };
  } catch (error) {
    console.error("Error updating banner name:", error);
    const technicalError =
      error instanceof Error
        ? error.message
        : "Unknown error updating banner name";
    return {
      success: false,
      message: "Failed to update banner name.",
      error: technicalError,
      errorType: "SERVER_ERROR",
    };
  }
}
