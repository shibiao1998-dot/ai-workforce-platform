import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import https from "node:https";
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

  let lastResult: { ok: boolean; error?: string } = { ok: false, error: "Unknown error" };

  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const url = new URL(endpoint);
      const body = JSON.stringify({
        model: "gpt-image-2",
        prompt,
        n: 1,
        size: "2560x1440",
        quality: "high",
      });

      const req = https.request(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(body),
          Connection: "close",
        },
        timeout: 600_000,
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", async () => {
          try {
            const json = JSON.parse(Buffer.concat(chunks).toString()) as {
              data?: Array<{ b64_json?: string }>;
              error?: { message: string };
            };
            if (json.error) {
              resolve({ ok: false, error: json.error.message });
              return;
            }
            const b64 = json.data?.[0]?.b64_json;
            if (!b64) {
              resolve({ ok: false, error: "No image data in response" });
              return;
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

            resolve({ ok: true });
          } catch (e) {
            resolve({ ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        });
      });

      req.on("error", (e: Error) => resolve({ ok: false, error: e.message }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, error: "Request timed out after 600s" });
      });
      req.write(body);
      req.end();
    });

    if (result.ok) {
      return { ok: true };
    }

    lastResult = result;

    if (attempt < 3) {
      console.log(`  Retry ${attempt}/3 for ${name}...`);
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }

  return lastResult;
}
