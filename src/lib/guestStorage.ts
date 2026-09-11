const PREFIX = 'op-cris-guest:';

export const GUEST_USER_ID = 'guest';

export function guestGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function guestSet<T>(key: string, value: T): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function guestId(): string {
  return crypto.randomUUID();
}

export function guestNow(): string {
  return new Date().toISOString();
}

export type AuthActor =
  | { mode: 'user'; id: string }
  | { mode: 'guest'; id: typeof GUEST_USER_ID };

export async function getAuthActor(
  getUser: () => Promise<{ id: string } | null>
): Promise<AuthActor> {
  const user = await getUser();
  if (user?.id) return { mode: 'user', id: user.id };
  return { mode: 'guest', id: GUEST_USER_ID };
}

export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
