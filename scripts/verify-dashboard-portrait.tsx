import { renderToStaticMarkup } from "react-dom/server";
import { NdScenePortrait } from "@/components/netdragon/nd-scene-portrait";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const avatar = "/avatars/AI产品经理.png";
const html = renderToStaticMarkup(
  <NdScenePortrait
    assetId="scene-ai-product-manager"
    employeeId="emp-product-manager"
    team="design"
    avatar={avatar}
    name="AI产品经理"
    title="设计团队"
    meta="123 XP · Lv.2"
  />
);

assert(
  html.includes(`src="${avatar}"`),
  `驾驶舱明星员工应使用员工头像 ${avatar}，实际渲染片段：${html.slice(0, 240)}`
);
assert(
  !html.includes("/netdragon/scene/scene-ai-product-manager-card.webp"),
  "驾驶舱明星员工不应在有员工头像时退回固定 scene 素材"
);

console.log("dashboard portrait uses roster avatar source");
