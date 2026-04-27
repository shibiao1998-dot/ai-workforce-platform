"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleManager } from "./role-manager";
import { UserRoleManager } from "./user-role-manager";
import { AuditLogViewer } from "./audit-log-viewer";

export function PermissionManager() {
  return (
    <Tabs defaultValue="roles">
      <TabsList>
        <TabsTrigger value="roles">角色管理</TabsTrigger>
        <TabsTrigger value="users">用户授权</TabsTrigger>
        <TabsTrigger value="audit">操作日志</TabsTrigger>
      </TabsList>
      <TabsContent value="roles" className="mt-4">
        <RoleManager />
      </TabsContent>
      <TabsContent value="users" className="mt-4">
        <UserRoleManager />
      </TabsContent>
      <TabsContent value="audit" className="mt-4">
        <AuditLogViewer />
      </TabsContent>
    </Tabs>
  );
}
