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
  "Create a professional 2D digital illustration portrait of a Chinese professional in LANDSCAPE orientation (wider than tall, 16:9 aspect ratio). " +
  "Clean modern style with soft shading. Frame the person from chest up, centered in the image with generous space around them. " +
  "Solid light gradient background, soft studio lighting. " +
  "The character should look approachable and competent. Do NOT crop tightly — leave breathing room above the head and on both sides.";

// ---------------------------------------------------------------------------
// Generate a default appearance description based on team
// ---------------------------------------------------------------------------
export function generateAvatarDescription(title: string, team: string): string {
  switch (team) {
    case "management":
      return `Professional in a ${title} role, mature confident expression, business formal attire, neat appearance`;
    case "design":
      return `Creative professional in a ${title} role, artistic expressive look, smart casual attire, modern style`;
    case "production":
      return `Focused professional in a ${title} role, detail-oriented expression, business casual attire, clean appearance`;
    default:
      return `Professional in a ${title} role, competent approachable expression, business casual attire`;
  }
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
