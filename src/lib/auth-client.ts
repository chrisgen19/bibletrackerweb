import { createAuthClient } from "better-auth/react";

/** Browser-side Better Auth client. Same origin, so no base URL is needed. */
export const authClient = createAuthClient();
