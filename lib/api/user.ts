import { IUser } from "@/types/user";
import { decryptEmail } from "@/lib/utils";
import { apiCall } from "./utils";

export const userApi = {
  getById: (id: string) => apiCall<IUser>(`/users/${id}`),
  getByEmail: (email: string) => {
    const decryptedEmail = decryptEmail(email);
    return apiCall<IUser>(`/users/email/${encodeURIComponent(decryptedEmail)}`);
  },
};
