export async function postJson<T = unknown>(
  url: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || "Something went wrong",
    );
  }
  return data as T;
}

export const MEMBER_EMOJIS = ["🙂", "😎", "🦊", "🐼", "🦄", "🐸", "🐯", "🐰"];

export const MEMBER_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#ef4444",
];
