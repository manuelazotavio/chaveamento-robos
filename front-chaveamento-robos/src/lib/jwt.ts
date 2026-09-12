// decodifica o payload de um JWT no cliente só pra ler claims (email/role) —
// a validade do token é sempre garantida pelo backend, aqui é só exibição
export function decodeJwtPayload<T>(token: string): T | null {
  const partes = token.split(".");
  if (partes.length !== 3) return null;

  try {
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload<{ exp?: number }>(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
}
