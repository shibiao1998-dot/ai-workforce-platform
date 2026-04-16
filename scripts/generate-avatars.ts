import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, join } from "path";

// ---------------------------------------------------------------------------
// Load .env.local manually — no dotenv dependency
// ---------------------------------------------------------------------------
function loadEnvLocal(): void {
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

loadEnvLocal();

// ---------------------------------------------------------------------------
// Employee list
// ---------------------------------------------------------------------------
interface Employee {
  name: string;
  description: string;
}

const EMPLOYEES: Employee[] = [
  { name: "AI审计官", description: "Mature male, mid-40s, dark navy suit with tie, silver-rimmed glasses, serious confident expression, short neat hair" },
  { name: "AI项目绩效评估员", description: "Male, mid-30s, charcoal business suit, holding a tablet, analytical focused gaze, neat side-parted hair" },
  { name: "AI周版本管理员", description: "Female, late-20s, smart casual blazer over white shirt, energetic determined expression, shoulder-length hair" },
  { name: "AI生产线管理员", description: "Male, mid-30s, dark polo shirt with ID badge, commanding presence, short crew cut" },
  { name: "AI业务分析师", description: "Female, early-30s, light gray suit jacket, data-savvy look, glasses, hair in a low bun" },
  { name: "AI业务顾问", description: "Male, late-40s, premium dark suit, distinguished silver-streaked hair, wise calm expression" },
  { name: "AI人力专员", description: "Female, late-20s, soft pink blouse under navy cardigan, warm empathetic expression, long straight hair" },
  { name: "AI正向激励专员", description: "Female, early-30s, bright teal blazer, cheerful inspiring smile, wavy medium-length hair" },
  { name: "AI立项专员", description: "Male, late-20s, business casual shirt rolled sleeves, eager forward-leaning posture, young energetic look" },
  { name: "AI审核员", description: "Male, mid-30s, formal white shirt with dark vest, meticulous careful expression, glasses, neat hair" },
  { name: "AI战略规划师", description: "Male, mid-40s, dark turtleneck sweater, visionary thoughtful gaze, salt-and-pepper short hair" },
  { name: "AI产品经理", description: "Female, early-30s, white blouse with subtle pattern, confident articulate expression, bob haircut" },
  { name: "AI软件设计师", description: "Male, late-20s, casual hoodie with headphones around neck, creative focused look, slightly messy hair" },
  { name: "AI游戏设计师", description: "Male, mid-20s, graphic tee under open flannel shirt, playful creative smile, stylish undercut hair" },
  { name: "AI需求分析员", description: "Female, early-30s, structured navy blazer, attentive listening expression, hair pulled back" },
  { name: "AI生产评审员", description: "Male, mid-30s, crisp white shirt with sleeves rolled, evaluative sharp gaze, close-cropped hair" },
  { name: "AI质检员", description: "Female, late-20s, lab-style white coat over casual top, detail-oriented precise look, glasses, ponytail" },
  { name: "AI入库员", description: "Male, late-20s, utility vest over t-shirt, organized efficient demeanor, short practical hair" },
  { name: "AI生产监控员", description: "Male, early-30s, dark technical jacket, alert watchful expression, short buzz cut" },
  { name: "AI编剧", description: "Female, late-20s, cozy knit sweater, warm creative dreamy smile, loose wavy hair" },
  { name: "AI角色设计师", description: "Female, mid-20s, artistic scarf and denim jacket, imaginative bright expression, colorful hair accessory" },
  { name: "AI美术师", description: "Male, early-30s, paint-splattered apron over black tee, artistic passionate gaze, medium textured hair" },
  { name: "AI音效师", description: "Male, late-20s, professional headphones around neck, dark turtleneck, calm focused expression, neat medium hair" },
  { name: "AI字幕员", description: "Female, mid-20s, modern minimalist blouse, precise detail-oriented look, clean short bob" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STYLE_PREFIX =
  "Create a professional 2D digital illustration portrait of a Chinese professional. " +
  "Clean modern style with soft shading, head and shoulders composition, solid light gradient background, " +
  "soft studio lighting. The character should look approachable and competent.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface GenerateResult {
  ok: boolean;
  sizeKB?: number;
  error?: string;
}

async function generateAvatar(emp: Employee, outputDir: string): Promise<GenerateResult> {
  const gatewayUrl = process.env.GEMINI_GATEWAY_URL;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!gatewayUrl || !apiKey) {
    return { ok: false, error: "Missing GEMINI_GATEWAY_URL or GEMINI_API_KEY" };
  }

  const prompt = `${STYLE_PREFIX} ${emp.description}.`;
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
    const outPath = join(outputDir, `${emp.name}.png`);
    writeFileSync(outPath, imgBuffer);

    return { ok: true, sizeKB: Math.round(imgBuffer.length / 1024) };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Request timed out after 90s" };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const outputDir = resolve(process.cwd(), "public/avatars");
  mkdirSync(outputDir, { recursive: true });

  const total = EMPLOYEES.length;
  let succeeded = 0;
  let skipped = 0;
  let failed = 0;
  const failures: string[] = [];

  console.log(`Avatar generation starting — ${total} employees, output: ${outputDir}`);
  console.log();

  for (let i = 0; i < EMPLOYEES.length; i++) {
    const emp = EMPLOYEES[i];
    const outPath = join(outputDir, `${emp.name}.png`);

    if (existsSync(outPath)) {
      console.log(`[${i + 1}/${total}] SKIP  ${emp.name} (already exists)`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${total}] GEN   ${emp.name} …`);
    const result = await generateAvatar(emp, outputDir);

    if (result.ok) {
      console.log(`[${i + 1}/${total}] OK    ${emp.name} (${result.sizeKB} KB)`);
      succeeded++;
    } else {
      console.error(`[${i + 1}/${total}] FAIL  ${emp.name}: ${result.error}`);
      failed++;
      failures.push(`${emp.name}: ${result.error}`);
    }

    // Delay between requests (skip after the last employee)
    if (i < EMPLOYEES.length - 1) {
      await sleep(3_000);
    }
  }

  console.log();
  console.log("─".repeat(50));
  console.log(`Summary: ${succeeded} succeeded, ${skipped} skipped, ${failed} failed`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  • ${f}`);
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
