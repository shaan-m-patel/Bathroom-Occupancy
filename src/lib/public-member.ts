/** Drops the login-code hash before a member row is sent to the browser. */
export function toPublicMember<T extends { loginCodeHash?: unknown }>(
  member: T,
): Omit<T, "loginCodeHash"> {
  const copy: Omit<T, "loginCodeHash"> & { loginCodeHash?: unknown } = {
    ...member,
  };
  delete copy.loginCodeHash;
  return copy;
}
