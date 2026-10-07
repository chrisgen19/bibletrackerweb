"use client";

import { createContext, type ReactNode, useContext } from "react";

/** Who is signed in, as the account menu shows it. */
export interface Account {
  readonly name: string;
  readonly email: string;
}

const AccountContext = createContext<Account | null>(null);

/** Given once by the app layout from the server's session, so no screen fetches it. */
export function AccountProvider({
  account,
  children,
}: {
  account: Account;
  children: ReactNode;
}) {
  return (
    <AccountContext.Provider value={account}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): Account {
  const account = useContext(AccountContext);
  if (account === null) {
    throw new Error("useAccount must be used inside an AccountProvider.");
  }
  return account;
}
