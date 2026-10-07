"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { authClient, catchNetworkFailure } from "@/lib/auth-client";

import { authErrorMessage } from "../auth-error-message";
import { authHref } from "../safe-next-path";
import {
  fullName,
  PASSWORD_MIN,
  type SignUpValues,
  signUpSchema,
} from "../schemas";
import { GoogleButton } from "./google-button";
import { TextField } from "./text-field";

interface SignUpFormProps {
  /** Where to go once the account exists; already checked by `safeNextPath`. */
  next: string;
  googleEnabled: boolean;
}

export function SignUpForm({ next, googleEnabled }: SignUpFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    // Signing up also signs in, so the reader goes straight on. Only what Better Auth
    // stores is sent: one name, and never the confirmation.
    const { error } = await catchNetworkFailure(() =>
      authClient.signUp.email({
        name: fullName(values),
        email: values.email,
        password: values.password,
      }),
    );
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    router.replace(next);
    router.refresh();
  });

  const signInHref = authHref("/sign-in", next);

  return (
    <div className="grid gap-6">
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <TextField
            id="firstName"
            label="First name"
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <TextField
            id="lastName"
            label="Last name"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          id="password"
          label={`Password (at least ${PASSWORD_MIN} characters)`}
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <TextField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        {formError === null ? null : (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="h-10"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      {googleEnabled ? <GoogleButton next={next} /> : null}

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={signInHref}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
