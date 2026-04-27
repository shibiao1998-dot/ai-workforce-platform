"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MODULES,
  ACTIONS,
  MODULE_LABELS,
  ACTION_LABELS,
  type Module,
  type Action,
} from "@/lib/authz-constants";

export type PermissionSet = Array<{ module: Module; action: Action }>;

export function RolePermissionMatrix({
  value,
  onChange,
  disabled,
}: {
  value: PermissionSet;
  onChange: (v: PermissionSet) => void;
  disabled?: boolean;
}) {
  const has = (m: Module, a: Action) =>
    value.some((p) => p.module === m && p.action === a);

  const toggle = (m: Module, a: Action) => {
    if (disabled) return;
    const exists = has(m, a);
    if (exists) {
      onChange(value.filter((p) => !(p.module === m && p.action === a)));
    } else {
      onChange([...value, { module: m, action: a }]);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>模块</TableHead>
          {ACTIONS.map((a) => (
            <TableHead key={a} className="text-center">
              {ACTION_LABELS[a]}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {MODULES.map((m) => (
          <TableRow key={m}>
            <TableCell className="font-medium">{MODULE_LABELS[m]}</TableCell>
            {ACTIONS.map((a) => (
              <TableCell key={a} className="text-center">
                <Checkbox
                  checked={has(m, a)}
                  onCheckedChange={() => toggle(m, a)}
                  disabled={disabled}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
