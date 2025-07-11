"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

// --- UI Components ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- Server Action & Types ---
import { signInWithCredentials } from "@/lib/actions/user.actions"; // Adjust this import path
import { ServerActionResponse } from "@/types";
import { signInDefaultValues } from "@/lib/constants";

const initialState: ServerActionResponse = {
  success: false,
  message: "",
  fieldErrors: {},
};

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(
    signInWithCredentials,
    initialState
  );
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // Determine if there is a general error to show below the button
  const hasGeneralError =
    !state.success &&
    state.message &&
    !state.fieldErrors?.email &&
    !state.fieldErrors?.password;

  const [inputs, setInputs] = useState({
    email: signInDefaultValues.email,
    password: signInDefaultValues.password,
  });

  return (
    <form action={formAction} className="space-y-4">
      {/* Hidden callbackUrl input */}
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-xs md:text-sm font-bold">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          disabled={isPending}
          required
          value={inputs.email}
          onChange={(e) => setInputs({ ...inputs, email: e.target.value })}
          className="placeholder:text-text-body-subtle placeholder:font-normal placeholder:text-xs md:placeholder:text-sm"
        />
        {state.fieldErrors?.email && (
          <p className="text-sm font-medium text-red-500">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs md:text-sm font-bold">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          disabled={isPending}
          required
          value={inputs.password}
          onChange={(e) => setInputs({ ...inputs, password: e.target.value })}
          className="placeholder:text-text-body-subtle placeholder:font-normal placeholder:text-xs md:placeholder:text-sm"
        />
        {state.fieldErrors?.password && (
          <p className="text-sm font-medium text-red-500">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full text-text-caption-2"
        disabled={isPending}
        variant="brand"
      >
        {isPending ? "Signing In..." : "Sign In with credentials"}
      </Button>

      {/* General Error Message */}
      {hasGeneralError && (
        <div className="text-sm font-medium text-red-500 text-center pt-2">
          {state.message}
        </div>
      )}
    </form>
  );
}
