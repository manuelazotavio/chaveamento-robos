export type Role = "ADMIN" | "USER";

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface TokenResponse {
  token: string;
}

export interface AuthUser {
  email: string;
  role: Role;
}
