import { z } from "zod";
import { parse, isValid } from "date-fns";

import * as LucideIcons from "lucide-react";

export const signInFormSchema = z.object({
  // Validation for the email field
  email: z
    .string()
    .min(4, { message: "Email must be at least 4 characters." })
    .email({ message: "Invalid email address." }),

  // Validation for the password field
  password: z
    .string()
    .min(3, { message: "Password must be at least 3 characters." }),
});

export const signUpFormSchema = z
  .object({
    // Validation for the name field
    name: z.string().min(3, { message: "Name must be at least 3 characters." }),
    // Validation for the email field
    email: z
      .string()
      .min(4, { message: "Email must be at least 4 characters." })
      .email({ message: "Invalid email address." }),
    // Validation for the password field
    password: z
      .string()
      .min(3, { message: "Password must be at least 3 characters." }),
    // Validation for the password field
    confirmPassword: z
      .string()
      .min(3, { message: "Password must be at least 3 characters." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// const maxDate = new Date();
// // The minimum date is 120 years ago from today.
// const minDate = new Date();
// minDate.setFullYear(maxDate.getFullYear() - 120);

export const patientProfileUpdateSchema = z.object({
  name: z
    .string({
      required_error: "Name is required.",
    })
    .min(3, { message: "Name must be at least 3 characters long." }),

  phoneNumber: z
    .string()
    .min(7, { message: "Phone number must be at least 7 characters long." })
    .max(20, { message: "Phone number cannot be longer than 20 characters." })
    .regex(/^[0-9+-]+$/, {
      message: "Phone number can only contain numbers, '+', or '-'.",
    })
    .optional(),

  address: z.string().optional(),

  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal("")) // Allow empty string for optional field
    .refine(
      (date) => {
        if (!date) return true;
        return new Date(date) <= new Date();
      },
      { message: "Date of Birth cannot be in the future" }
    )
    .refine(
      (date) => {
        if (!date) return true;
        const minDate = new Date();
        minDate.setFullYear(new Date().getFullYear() - 120);
        return new Date(date) >= minDate;
      },
      { message: "You must be younger than 120 years old to register" }
    ),
});

//is for validating the complete data payload in the server action ( includes ids)
export const fullReviewDataSchema = z.object({
  appointmentId: z.string().uuid({
    message: "A valid appointment ID is required.",
  }),

  doctorId: z.string().uuid({
    message: "A valid doctor ID is required.",
  }),

  patientId: z.string().uuid({
    message: "A valid patient ID is required.",
  }),

  rating: z
    .number({
      required_error: "A rating is required.",
      invalid_type_error: "Rating must be a number.",
    })
    .int({ message: "Rating must be a whole number (e.g., 1, 2, 3, 4, or 5)." })
    .min(1, { message: "Rating must be at least 1." })
    .max(5, { message: "Rating cannot be greater than 5." }),

  reviewText: z
    .string()
    .min(10, { message: "Review must be at least 10 characters long." })
    .max(100, { message: "Review must be no more than 100 characters long." }),
});

//schema only for the user experince - client side
export const reviewFormSchema = z.object({
  rating: z
    .number({
      required_error: "A rating is required.",
      invalid_type_error: "Rating must be a number.",
    })
    .int({ message: "Rating must be a whole number (e.g., 1, 2, 3, 4, or 5)." })
    .min(1, { message: "Rating must be at least 1." })
    .max(5, { message: "Rating cannot be greater than 5." }),

  reviewText: z
    .string()
    .min(10, { message: "Review must be at least 10 characters long." })
    .max(100, { message: "Review must be no more than 100 characters long." }),
});

export const validDateString = z
  .string({ required_error: "Date of birth is required." })
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Date must be in DD/MM/YYYY format.")
  .refine(
    (dateStr) => {
      // Use date-fns to parse the string and check if it's a valid date
      const parsedDate = parse(dateStr, "dd/MM/yyyy", new Date());
      return isValid(parsedDate);
    },
    {
      message: "Please enter a valid date.",
    }
  );

/**
 * Reusable schema to validate a phone number string.
 */
export const phoneValidationSchema = z
  .string()
  .min(7, "Phone number must be at least 7 digits.")
  .max(20, "Phone number cannot exceed 20 characters.")
  .regex(/^[0-9+-]+$/, "Phone number can only contain numbers, +, or -.");

const baseSchema = z.object({
  email: z.string().email("Please enter a valid email address.").readonly(),
  reason: z.string().min(1, "Reason for visit is required."),
  notes: z.string().optional(),
  useAlternatePhone: z.boolean().optional(),
  phone: z.string().optional(),
});

const myselfSchema = baseSchema.extend({
  patientType: z.literal("MYSELF"),
  fullName: z.string().min(1, "Full name is required."),
  dateOfBirth: z.string().optional(), // Not required for "MYSELF"
  relationship: z.string().optional(), // Not required for "MYSELF"
});

/**
 * Schema for when the patient is someone other than the user.
 */
const someoneElseSchema = baseSchema.extend({
  patientType: z.literal("SOMEONE_ELSE"),
  fullName: z.string().min(1, "Patient’s full name is required."),
  relationship: z.string().min(1, "Relationship to patient is required."),
  dateOfBirth: validDateString, // Required and must be a valid date string
});

export const PatientDetailsFormSchema = z
  .discriminatedUnion("patientType", [myselfSchema, someoneElseSchema])
  .superRefine((data, ctx) => {
    // If 'useAlternatePhone' is checked, the 'phone' field becomes required and must be valid.
    if (data.useAlternatePhone) {
      const phoneValidationResult = phoneValidationSchema.safeParse(data.phone);
      if (!phoneValidationResult.success) {
        // Manually add the validation issues from phoneValidationSchema to the 'phone' path
        phoneValidationResult.error.issues.forEach((issue) => {
          ctx.addIssue({
            ...issue,
            path: ["phone"], // Ensure the error is associated with the correct field
          });
        });
      }
    }
  });

export const addAdminFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z
    .string()
    .email("Invalid email address")
    .min(3, "Email must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  // Role is assigned on the server, not submitted via form
});

export const editAdminFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
});

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const addBannerSchema = z.object({
  name: z.string().min(1, "Banner name is required."),
  bannerImageFile: z
    .instanceof(File, { message: "Banner image is required." })
    .refine((file) => file.size <= MAX_FILE_SIZE, `Max image size is 4MB.`)
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png, .gif and .webp formats are supported."
    ),
});

const validIconNames = Object.keys(LucideIcons).filter(
  (key) =>
    typeof LucideIcons[key as keyof typeof LucideIcons] === "object" &&
    key !== "createReactComponent" &&
    key !== "icons" &&
    key !== "LucideIcon" &&
    key !== "LucideProps" &&
    !key.includes("Logo") &&
    [
      "Heart",
      "Brain",
      "Eye",
      "Stethoscope",
      "Thermometer",
      "Activity",
      "Scissors",
      "Bone",
      "Baby",
      "Pill",
      "Syringe",
      "Bandage",
      "Microscope",
      "ClipboardList",
      "Users",
      "FlaskConical",
      "Dna",
      "Ear",
      "PersonStanding",
    ].includes(key)
) as (keyof typeof LucideIcons)[];

export const addDepartmentSchema = z.object({
  name: z
    .string()
    .min(3, "Department name must be at least 3 characters")
    .max(50, "Department name cannot exceed 50 characters"),
  iconName: z
    .string()
    .min(1, "Icon selection is required.")
    .refine(
      (name) => validIconNames.includes(name as keyof typeof LucideIcons),
      {
        message: "Invalid icon selected.",
      }
    ),
});

export const editDepartmentSchema = z.object({
  name: z
    .string()
    .min(3, "Department name must be at least 3 characters")
    .max(50, "Department name cannot exceed 50 characters"),
  iconName: z
    .string()
    .min(1, "Icon selection is required.")
    .refine(
      (name) => validIconNames.includes(name as keyof typeof LucideIcons),
      {
        message: "Invalid icon selected.",
      }
    ),
});

export const addDoctorFormSchema = z.object({
  name: z.string().min(3, "Doctor name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  credentials: z.string().min(1, "Credentials are required"),
  specialty: z.string().min(1, "Department/Specialty is required"),
  languages: z.string().min(1, "Languages are required"), // Expecting comma-separated string
  specializations: z.string().min(1, "Specializations are required"), // Expecting comma-separated string
  brief: z.string().min(10, "About Doctor must be at least 10 characters"),
  imageUrl: z.string().url("Invalid image URL").optional(),
});

export const editDoctorFormSchema = z.object({
  name: z.string().min(3, "Doctor name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  credentials: z.string().min(1, "Credentials are required"),
  specialty: z.string().min(1, "Department/Specialty is required"),
  languages: z.string().min(1, "Languages are required"),
  specializations: z.string().min(1, "Specializations are required"),
  brief: z.string().min(10, "About Doctor must be at least 10 characters"),
  imageUrl: z.string().url("Invalid image URL").optional().nullable(),
});
