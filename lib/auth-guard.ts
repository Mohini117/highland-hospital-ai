import { auth } from "@/auth";
import { Role } from "@/lib/generated/prisma"; // Import Role enum
import { redirect } from "next/navigation";
import { redirectToErrorPage } from "./config";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  if (session.user.role !== Role.ADMIN) {
    redirectToErrorPage(
      "UNAUTHORIZED",
      "You are not authorized to access this page."
    );
  }
  return session;
}
