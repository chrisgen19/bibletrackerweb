const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CODE_LENGTH = 10;
/** Largest multiple of 62 that fits in a byte (4 x 62). Bytes at or above it are redrawn. */
const REJECT_FROM = 248;

const INVITE_CODE_PATTERN = /^[A-Za-z0-9]{10}$/;

/** A random 10 character code. Rejection sampling keeps every character equally likely. */
export const generateInviteCode = (): string => {
  let code = "";
  while (code.length < CODE_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
    for (const byte of bytes) {
      if (byte >= REJECT_FROM) continue;
      code += ALPHABET[byte % ALPHABET.length];
      if (code.length === CODE_LENGTH) break;
    }
  }
  return code;
};

/** Shape check only: lets a route reject junk before it touches the database. */
export const isInviteCode = (value: string): boolean =>
  INVITE_CODE_PATTERN.test(value);
