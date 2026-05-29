"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, Switch } from "@/components/admin/form";
import { setUserRole, setUserActive } from "./actions";

export function RoleSelect({
  id,
  role,
  roles,
}: {
  id: string;
  role: string;
  roles: { key: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <Select
      value={role}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        start(async () => {
          const res = await setUserRole(id, next);
          if (res.error) toast.error(res.error);
          else { toast.success("Роль обновлена"); router.refresh(); }
        });
      }}
      className="w-44"
    >
      {roles.map((r) => (
        <option key={r.key} value={r.key}>
          {r.label}
        </option>
      ))}
    </Select>
  );
}

export function ActiveToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [val, setVal] = React.useState(active);
  return (
    <Switch
      checked={val}
      disabled={pending}
      onChange={(next) =>
        start(async () => {
          const res = await setUserActive(id, next);
          if (res.error) { toast.error(res.error); return; }
          setVal(next);
          toast.success(next ? "Активирован" : "Деактивирован");
          router.refresh();
        })
      }
    />
  );
}
