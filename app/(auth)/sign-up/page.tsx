import { SignUpForm } from "./sign-up-form";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { APP_NAME } from "@/lib/constants";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

const SignUpPage = async (props: {
  searchParams: Promise<{ callbackUrl: string }>;
}) => {
  const searchParamsObject = await props.searchParams;
  const callbackUrl = searchParamsObject.callbackUrl;

  const session = await auth();

  if (session) {
    return redirect(callbackUrl || "/");
  }

  return (
    <main className="w-full max-w-md mx-auto">
      <Card className="rounded-xl bg-background border border-border shadow-medium gap-0">
        <CardHeader className="gap-0">
          <Link href="/" className="flex justify-center items-center mb-4">
            <Image
              priority={true}
              src="/images/Logo.svg"
              width={48}
              height={48}
              alt={`${APP_NAME}logo`}
            />
          </Link>
          <CardTitle>
            <h2 className="text-center mb-2">Create Account</h2>
          </CardTitle>
          <CardDescription className="body-small text-center mb-10">
            Enter your information below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
          <div className="text-center text-sm mt-10">
            Already have an account?{" "}
            <Link
              target="_self"
              href={
                callbackUrl
                  ? `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`
                  : "/sign-in"
              }
              className="text-text-primary body-small-bold"
            >
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default SignUpPage;
