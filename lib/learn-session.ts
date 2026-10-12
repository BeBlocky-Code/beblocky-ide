export type AccountPayload = {
  user_id?: string;
  name?: string;
  email?: string;
  image_url?: string;
  roles?: string[];
};

export type LearnSession = {
  valid: true;
  token: string;
  user: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
    roles: string[];
  };
};

/** Map auth-service `GET /account` into the session the IDE already understands. */
export function sessionFromAccount(
  token: string,
  account: AccountPayload,
): LearnSession | null {
  const userId = account.user_id?.trim();
  if (!token || !userId) return null;
  return {
    valid: true,
    token,
    user: {
      id: userId,
      name: account.name,
      email: account.email,
      image: account.image_url,
      roles: account.roles ?? [],
    },
  };
}
