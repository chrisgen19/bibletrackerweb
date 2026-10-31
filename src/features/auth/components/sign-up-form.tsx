"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { setUsername } from "@/actions/friends";
import { Button } from "@/components/ui/button";
import {
  forgetMissedUsername,
  rememberMissedUsername,
} from "@/features/friends/missed-username";
import { authClient, catchNetworkFailure } from "@/lib/auth-client";

import { authErrorMessage } from "../auth-error-message";
import { authHref } from "../safe-next-path";
import {
  fullName,
  PASSWORD_MIN,
  type SignUpInput,
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

/**
 * Saves the username picked at sign-up. The account already exists by now, so a name that
 * was taken (or a failed request) must not block the reader: the Friends screen asks again,
 * and for a taken name it says why.
 */
async function claimUsername(userId: string, username: string): Promise<void> {
  try {
    const result = await setUsername({ username });
    if (result.ok) {
      forgetMissedUsername();
    } else if (
      result.error === "username-taken" ||
      result.error === "username-just-taken"
    ) {
      rememberMissedUsername({ userId, username });
    }
  } catch {
    // Picked later on Friends, without a note: nothing says the name was taken.
  }
}

export function SignUpForm({ next, googleEnabled }: SignUpFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput, unknown, SignUpValues>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    // Signing up also signs in, so the reader goes straight on. Only what Better Auth
    // stores is sent: one name, and never the confirmation.
    const { data, error } = await catchNetworkFailure(() =>
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
    if (values.username !== undefined && data) {
      await claimUsername(data.user.id, values.username);
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
        <div className="grid gap-2">
          <TextField
            id="username"
            label="Username (optional)"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            error={errors.username?.message}
            {...register("username")}
          />
          <p className="text-footnote text-muted-foreground">
            How friends find you. 3 to 20 letters, numbers or underscores. You
            can pick one later.
          </p>
        </div>
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
