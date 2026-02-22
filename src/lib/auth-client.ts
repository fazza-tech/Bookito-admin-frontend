import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || (typeof window !== "undefined" ? window.location.origin : ""),
  fetchOptions: {
    credentials: "include",
  },
});
