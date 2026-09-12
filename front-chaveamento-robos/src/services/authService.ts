import { api } from "./api";
import type { LoginRequest, TokenResponse } from "@/types/auth";

export const authService = {
  async login(payload: LoginRequest): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>("/auth/login", payload);
    return data;
  },
};
