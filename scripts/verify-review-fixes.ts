import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveVerifiedUcLogin } from "../src/lib/uc-login-core";
import { validatePermissionInputs } from "../src/lib/role-permission-validation";

async function main() {
  await assert.rejects(
    () =>
      resolveVerifiedUcLogin(
        { userId: "100", nickname: "伪造用户" },
        async () => ({ userId: "100" })
      ),
    /uckey/
  );

  const verified = await resolveVerifiedUcLogin(
    { userId: "100", nickname: "客户端昵称", avatar: "client.jpg", expiresIn: 3600, uckey: "valid-uckey" },
    async (uckey) => {
      assert.equal(uckey, "valid-uckey");
      return { userId: "100", nickname: "服务端昵称", avatar: "server.jpg", expiresIn: 7200 };
    }
  );
  assert.deepEqual(verified, {
    userId: "100",
    nickname: "服务端昵称",
    avatar: "server.jpg",
    expiresIn: 7200,
  });

  await assert.rejects(
    () =>
      resolveVerifiedUcLogin(
        { userId: "999", nickname: "伪造用户", uckey: "valid-uckey" },
        async () => ({ userId: "100", nickname: "真实用户" })
      ),
    /不匹配/
  );

  assert.deepEqual(validatePermissionInputs([{ module: "settings", action: "read" }]), [
    { module: "settings", action: "read" },
  ]);
  assert.throws(() => validatePermissionInputs([{ module: "settings", action: "admin" }]), /非法权限/);
  assert.throws(
    () =>
      validatePermissionInputs([
        { module: "settings", action: "read" },
        { module: "settings", action: "read" },
      ]),
    /重复权限/
  );

  const root = process.cwd();
  const dockerignore = readFileSync(resolve(root, ".dockerignore"), "utf-8");
  assert.match(dockerignore, /^\.env(\.local|\*)$/m);

  const migration = readFileSync(resolve(root, "drizzle/0000_public_stepford_cuckoos.sql"), "utf-8");
  assert.doesNotMatch(migration, /CREATE TABLE `employees`/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS `roles`/);

  const dashboardShell = readFileSync(resolve(root, "src/components/dashboard/dashboard-shell.tsx"), "utf-8");
  assert.doesNotMatch(dashboardShell, /operationalIndex \?\? 0\) \* 100/);

  const roleRoute = readFileSync(resolve(root, "src/app/api/permissions/roles/[id]/route.ts"), "utf-8");
  const validateIdx = roleRoute.indexOf("validatePermissionInputs(body.permissions)");
  const updateIdx = roleRoute.indexOf("db.update(roles)");
  assert.ok(validateIdx !== -1, "role update route must validate permissions");
  assert.ok(updateIdx !== -1, "role update route must update roles");
  assert.ok(validateIdx < updateIdx, "permission validation must happen before role update");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
