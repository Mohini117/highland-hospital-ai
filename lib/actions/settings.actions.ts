"use server";
import { ServerActionResponse, DepartmentData, BannerImageData } from "@/types";
import { prisma } from "@/db/prisma";

import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { UTApi } from "uploadthing/server";

import { Prisma } from "@/lib/generated/prisma";
import { FieldErrors } from "@/types";
import { addDepartmentSchema } from "@/lib/validators";
import { editDepartmentSchema } from "@/lib/validators";

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

export async function addDepartment(
  prevState: unknown,
  formData: FormData
): Promise<ServerActionResponse> {
  await requireAdmin();

  try {
    const validatedData = addDepartmentSchema.safeParse({
      name: formData.get("name"),
      iconName: formData.get("iconName"),
    });

    if (!validatedData.success) {
      return {
        success: false,
        message: "Validation failed. Please check the department details.",
        fieldErrors: validatedData.error.flatten().fieldErrors as FieldErrors,
        error: "Zod validation failed for addDepartment.",
        errorType: "VALIDATION_ERROR",
      };
    }

    const { name, iconName } = validatedData.data;

    const existingDepartment = await prisma.department.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (existingDepartment) {
      return {
        success: false,
        message: "A department with this name already exists.",
        fieldErrors: { name: ["Department name must be unique."] },
        error: `Department name conflict for: ${name}`,
        errorType: "CONFLICT_ERROR",
      };
    }

    await prisma.department.create({
      data: {
        name,
        iconName,
      },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/");

    return { success: true, message: "Department added successfully." };
  } catch (error) {
    console.error("Error adding department:", error);
    const technicalError =
      error instanceof Error
        ? error.message
        : "Unknown error adding department";
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "A department with this name already exists.",
        fieldErrors: {
          name: ["Department name must be unique (database check)."],
        },
        error: technicalError,
        errorType: "CONFLICT_ERROR",
      };
    }
    return {
      success: false,
      message: "Failed to add department due to a server error.",
      error: technicalError,
      errorType: "SERVER_ERROR",
    };
  }
}

export async function deleteDepartment(
  departmentId: string
): Promise<ServerActionResponse> {
  await requireAdmin();

  if (!departmentId) {
    return {
      success: false,
      message: "Department ID is required for deletion.",
      error: "deleteDepartment: Department ID was not provided.",
      errorType: "BAD_REQUEST",
    };
  }

  try {
    const departmentName = (
      await prisma.department.findUniqueOrThrow({
        where: { id: departmentId },
        select: { name: true },
      })
    ).name;

    const linkedDoctorsCount = await prisma.doctorProfile.count({
      where: {
        specialty: {
          equals: departmentName,
          mode: "insensitive",
        },
        isActive: true,
      },
    });

    if (linkedDoctorsCount > 0) {
      return {
        success: false,
        message: `Cannot delete department. ${linkedDoctorsCount} active doctor(s) have this specialty listed. Please update their profiles first.`,
        error: `Deletion of department '${departmentName}' prevented due to ${linkedDoctorsCount} linked active doctor(s).`,
        errorType: "CONFLICT_ERROR",
      };
    }

    await prisma.department.delete({
      where: { id: departmentId },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/");

    return { success: true, message: "Department deleted successfully." };
  } catch (error) {
    console.error(`Error deleting department ${departmentId}:`, error);
    const technicalError =
      error instanceof Error
        ? error.message
        : "Unknown error deleting department";
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return {
        success: false,
        message: "Department not found. It might have already been deleted.",
        error: technicalError, // Prisma error message
        errorType: "NOT_FOUND",
      };
    }
    // generic error response
    return {
      success: false,
      message: "Failed to delete department.",
      error: technicalError,
      errorType: "SERVER_ERROR",
    };
  }
}

export async function updateDepartment(
  prevState: unknown,
  formData: FormData
): Promise<ServerActionResponse> {
  await requireAdmin();

  const departmentId = formData.get("departmentId") as string;

  if (!departmentId) {
    return {
      success: false,
      message: "Department ID is missing. Cannot update.",
      error: "updateDepartment: Department ID was not provided.",
      errorType: "BAD_REQUEST",
    };
  }

  try {
    const validatedData = editDepartmentSchema.safeParse({
      name: formData.get("name"),
      iconName: formData.get("iconName"),
    });

    if (!validatedData.success) {
      return {
        success: false,
        message: "Validation failed. Please check the department details.",
        fieldErrors: validatedData.error.flatten().fieldErrors as FieldErrors,
        error: "Zod validation failed for updateDepartment.",
        errorType: "VALIDATION_ERROR",
      };
    }

    const { name, iconName } = validatedData.data;

    const existingDepartment = await prisma.department.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        id: { not: departmentId },
      },
    });

    if (existingDepartment) {
      return {
        success: false,
        message: "Another department with this name already exists.",
        fieldErrors: { name: ["Department name must be unique."] },
        error: `Department name conflict for: ${name} (while updating ID ${departmentId})`,
        errorType: "CONFLICT_ERROR",
      };
    }

    await prisma.department.update({
      where: { id: departmentId },
      data: {
        name,
        iconName,
      },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/");

    return { success: true, message: "Department updated successfully." };
  } catch (error) {
    console.error("Error updating department:", error);
    const technicalError =
      error instanceof Error
        ? error.message
        : "Unknown error updating department";
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message:
          "Another department with this name already exists (database check).",
        fieldErrors: { name: ["Department name must be unique."] },
        error: technicalError,
        errorType: "CONFLICT_ERROR",
      };
    }
    // generic error response
    return {
      success: false,
      message: "Failed to update department due to a server error.",
      error: technicalError,
      errorType: "SERVER_ERROR",
    };
  }
}
