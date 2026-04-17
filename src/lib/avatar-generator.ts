import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Load .env.local manually — no dotenv dependency
// ---------------------------------------------------------------------------
export function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    console.warn("Warning: .env.local not found, relying on existing env vars");
    return;
  }
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

// ---------------------------------------------------------------------------
// Style prefix (shared with batch script)
// ---------------------------------------------------------------------------
const STYLE_PREFIX =
  "Create a stylish 2D digital illustration portrait of a young Chinese professional in LANDSCAPE orientation (16:9, 1376x768). " +
  "Trendy modern illustration style with bold confident lines, vibrant colors, and dynamic lighting. " +
  "The character should look young (early-to-late 20s), energetic, fashionable, and highly competent — like a top talent at a cutting-edge tech startup. " +
  "Frame from chest up, centered with breathing room. Include a detailed background scene specific to their work environment. " +
  "The overall mood should be cool, professional, and aspirational.";

const TEAM_ACCENT: Record<string, string> = {
  management: "purple and violet",
  design: "blue and cyan",
  production: "green and emerald",
};

// ---------------------------------------------------------------------------
// Generate a default appearance description based on team
// ---------------------------------------------------------------------------
export function generateAvatarDescription(title: string, team: string): string {
  const accent = TEAM_ACCENT[team] || "neutral";
  return `Young professional in a ${title} role, age mid-20s, trendy streetwear style, confident energetic expression, modern tech workspace background with ${accent} ambient lighting`;
}

// ---------------------------------------------------------------------------
// Generate a single avatar via Gemini API and persist to DB
// ---------------------------------------------------------------------------
export async function generateSingleAvatar(
  employeeId: string,
  name: string,
  description: string
): Promise<{ ok: boolean; error?: string }> {
  loadEnvLocal();

  const gatewayUrl = process.env.GEMINI_GATEWAY_URL;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!gatewayUrl || !apiKey) {
    return { ok: false, error: "Missing GEMINI_GATEWAY_URL or GEMINI_API_KEY" };
  }

  const prompt = `${STYLE_PREFIX} ${description}.`;
  const endpoint = `${gatewayUrl}/v1/chat/completions`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["text", "image"],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = (await response.json()) as {
      data?: Array<{ b64_json?: string }>;
      error?: { message: string };
    };

    if (json.error) {
      return { ok: false, error: json.error.message };
    }

    const b64 = json.data?.[0]?.b64_json;
    if (!b64) {
      return { ok: false, error: "No image data in response" };
    }

    const imgBuffer = Buffer.from(b64, "base64");
    const outputDir = join(process.cwd(), "public", "avatars");
    const outPath = join(outputDir, `${name}.png`);
    writeFileSync(outPath, imgBuffer);

    const avatarPath = `/avatars/${name}.png`;
    await db
      .update(employees)
      .set({ avatar: avatarPath, updatedAt: new Date() })
      .where(eq(employees.id, employeeId));

    return { ok: true };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Request timed out after 90s" };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
