import { z } from "zod";

import { isPushServiceUrl } from "@/features/push/domain/push-hosts";

/**
 * What the browser may send to the push Server Actions.
 *
 * Shared by both sides: the client builds these, and the server parses them again,
 * because a Server Action is a public endpoint whatever the TypeScript types say.
 */

/** A browser push service endpoint only, since the server will POST to it. */
const endpointSchema = z.url().max(2048).refine(isPushServiceUrl, {
  message: "endpoint must be a browser push service",
});

const keySchema = z.string().min(1).max(512);

export const pushSubscriptionInput = z.object({
  endpoint: endpointSchema,
  keys: z.object({ p256dh: keySchema, auth: keySchema }),
});

export const endpointInput = z.object({ endpoint: endpointSchema });

export type PushSubscriptionActionInput = z.input<typeof pushSubscriptionInput>;
export type EndpointInput = z.input<typeof endpointInput>;
