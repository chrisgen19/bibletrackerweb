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
import { type SignInValues, signInSchema } from "../schemas";
import { GoogleButton } from "./google-button";
import { TextField } from "./text-field";

interface SignInFormProps {
  /** Where to go once signed in; already checked by `safeNextPath`. */
  next: string;
  googleEnabled: boolean;
}

export function SignInForm({ next, googleEnabled }: SignInFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await catchNetworkFailure(() =>
      authClient.signIn.email(values),
    );
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    router.replace(next);
    router.refresh();
  });

  const signUpHref = authHref("/sign-up", next);

  return (
    <div className="grid gap-6">
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
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
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
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
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      {googleEnabled ? <GoogleButton next={next} /> : null}

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href={signUpHref}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
