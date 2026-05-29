"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, Switch } from "@/components/admin/form";
import { setUserRole, setUserActive } from "./actions";

export function RoleSelect({ id, role }: { id: string; role: string }) {
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
      className="h-8 w-40"
    >
      <option value="admin">Администратор</option>
      <option value="manager">Менеджер</option>
      <option value="content">Контент</option>
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
