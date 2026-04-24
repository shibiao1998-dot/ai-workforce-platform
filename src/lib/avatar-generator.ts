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
  "Professional commercial portrait photograph of a young Chinese professional. " +
  "Shot on Canon EOS R5 with 85mm f/1.4 lens. Shallow depth of field, natural lighting with soft fill light. " +
  "Photorealistic, high-end corporate magazine editorial style. " +
  "Frame from chest up, centered with breathing room. Real fabric textures, real accessories, real hair. " +
  "LANDSCAPE orientation (16:9, 2560x1440). No illustration, no anime, no CGI, no AI-generated artifacts. " +
  "The person must look like a real Chinese individual with natural skin texture, natural facial features, and natural expression.";

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
  return `Young Chinese professional in a ${title} role, age mid-20s, smart business casual attire, confident and approachable expression, modern office environment with ${accent} ambient lighting`;
}

// ---------------------------------------------------------------------------
// Generate a single avatar via gpt-image-2 API and persist to DB
// ---------------------------------------------------------------------------
export async function generateSingleAvatar(
  employeeId: string,
  name: string,
  description: string
): Promise<{ ok: boolean; error?: string }> {
  loadEnvLocal();

  const gatewayUrl = process.env.IMAGE_API_GATEWAY_URL;
  const apiKey = process.env.IMAGE_API_KEY;

  if (!gatewayUrl || !apiKey) {
    return { ok: false, error: "Missing IMAGE_API_GATEWAY_URL or IMAGE_API_KEY" };
  }

  const prompt = `${STYLE_PREFIX} ${description}.`;
  const endpoint = `${gatewayUrl}/v1/images/generations`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt,
        n: 1,
        size: "2560x1440",
        quality: "high",
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
      return { ok: false, error: "Request timed out after 300s" };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
