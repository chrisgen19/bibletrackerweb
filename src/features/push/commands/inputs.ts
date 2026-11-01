import { z } from "zod";

/**
 * What the browser may send to the push Server Actions.
 *
 * Shared by both sides: the client builds these, and the server parses them again,
 * because a Server Action is a public endpoint whatever the TypeScript types say.
 */

/** A push service endpoint: https only, since the server will POST to it. */
const endpointSchema = z
  .url()
  .max(2048)
  .refine((value) => URL.parse(value)?.protocol === "https:", {
    message: "endpoint must be https",
  });

const keySchema = z.string().min(1).max(512);

export const pushSubscriptionInput = z.object({
  endpoint: endpointSchema,
  keys: z.object({ p256dh: keySchema, auth: keySchema }),
});

export const endpointInput = z.object({ endpoint: endpointSchema });

export type PushSubscriptionActionInput = z.input<typeof pushSubscriptionInput>;
export type EndpointInput = z.input<typeof endpointInput>;
