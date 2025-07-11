"use server";
import { ServerActionResponse } from "@/types";
import { signInFormSchema, signUpFormSchema } from "@/lib/validators";
import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { prisma } from "@/db/prisma";
import { hashSync } from "bcrypt-ts-edge";

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
