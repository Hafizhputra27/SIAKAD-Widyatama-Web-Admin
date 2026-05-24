export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: "super_admin" | "akademik" | "keuangan";
}

export function setSessionCookie(token: string) {
  document.cookie = `session=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearSessionCookie() {
  document.cookie = "session=; path=/; max-age=0";
}

export function getSessionCookie(): string | null {
  const match = document.cookie.match(/(?:^|; )session=([^;]*)/);
  return match ? match[1] : null;
}
