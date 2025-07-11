import { z } from "zod";

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
