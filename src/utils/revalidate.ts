const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET || "";

export const revalidateFrontend = async (paths: string[] = ["/", "/shop"]): Promise<void> => {
  if (!REVALIDATION_SECRET) return;

  try {
    await fetch(`${FRONTEND_URL}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": REVALIDATION_SECRET,
      },
      body: JSON.stringify({ secret: REVALIDATION_SECRET, paths }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Silent fail - revalidation is best-effort
  }
};
