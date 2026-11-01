/** First word of the display name, or "@username" when the name is blank. */
export const firstName = (person: {
  readonly name: string;
  readonly username: string;
}): string => {
  const first = person.name.trim().split(/\s+/)[0];
  return first ? first : `@${person.username}`;
};

/**
 * Names for the "X, Y and others are cheering you on" copy: the first names of the
 * first two senders, and whether more senders exist beyond those.
 */
export const cheeringNames = (
  senders: readonly { name: string; username: string }[],
): { readonly names: readonly string[]; readonly others: boolean } => ({
  names: senders.slice(0, 2).map(firstName),
  others: senders.length > 2,
});
