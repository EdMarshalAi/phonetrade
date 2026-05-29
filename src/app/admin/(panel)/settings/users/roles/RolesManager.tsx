"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/admin/ui";
import { Field, TextInput, Switch, Checkbox, AdminButton } from "@/components/admin/form";
import { NAV_PERMISSION_ITEMS } from "@/lib/admin/nav";
import { saveRoles, deleteRole, type RoleInput } from "./actions";

let counter = 0;
function rid() {
  counter += 1;
  return `role-${Date.now().toString(36)}${counter}`;
}

// Разделы, сгруппированные для чекбоксов прав.
const GROUPS = Array.from(new Set(NAV_PERMISSION_ITEMS.map((i) => i.group)));

export function RolesManager({ initial }: { initial: RoleInput[] }) {
  const router = useRouter();
  const [roles, setRoles] = React.useState<RoleInput[]>(initial);
  const [saving, setSaving] = React.useState(false);

  const patch = (i: number, p: Partial<RoleInput>) =>
    setRoles((arr) => arr.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  const togglePerm = (i: number, href: string, on: boolean) =>
    setRoles((arr) =>
      arr.map((r, idx) => {
        if (idx !== i) return r;
        const set = new Set(r.permissions);
        if (on) set.add(href);
        else set.delete(href);
        return { ...r, permissions: [...set] };
      })
    );

  const save = async () => {
    setSaving(true);
    const res = await saveRoles(roles);
    setSaving(false);
    if (res.error) return toast.error(res.error);
    toast.success("Роли сохранены");
    router.refresh();
  };

  const remove = async (i: number) => {
    const r = roles[i];
    if (r.is_system) return toast.error("Системную роль удалить нельзя");
    // если роль ещё не в БД (новая) — просто убираем из списка
    const res = await deleteRole(r.key);
    if (res.error) return toast.error(res.error);
    setRoles((arr) => arr.filter((_, idx) => idx !== i));
    toast.success("Роль удалена");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {roles.map((r, i) => (
        <Panel key={r.key} className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {r.is_system ? <ShieldCheck className="h-4 w-4 text-ink-subtle" strokeWidth={1.75} /> : null}
              <span className="text-[14px] font-semibold text-ink">{r.label || r.key}</span>
              {r.is_system ? <span className="text-[11px] text-ink-subtle">системная</span> : null}
            </div>
            {!r.is_system ? (
              <button
                type="button"
                onClick={() => remove(i)}
                className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-sale/30 bg-white px-2.5 text-[13px] text-sale hover:bg-sale/5"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} /> Удалить
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Название роли">
              <TextInput value={r.label} onChange={(e) => patch(i, { label: e.target.value })} />
            </Field>
            <div className="flex items-end pb-1">
              <Switch checked={r.full_access} onChange={(v) => patch(i, { full_access: v })} label="Полный доступ ко всему" />
            </div>
          </div>

          {!r.full_access ? (
            <div className="rounded-md border border-border/60 bg-surface/30 p-4">
              <p className="mb-2 text-[13px] font-medium text-ink">Доступные разделы сайдбара</p>
              <div className="space-y-3">
                {GROUPS.map((g) => (
                  <div key={g}>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">{g}</p>
                    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {NAV_PERMISSION_ITEMS.filter((it) => it.group === g).map((it) => (
                        <Checkbox
                          key={it.href}
                          checked={r.permissions.includes(it.href)}
                          onChange={(on) => togglePerm(i, it.href, on)}
                          label={it.label}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-ink-muted">Видит все разделы админки.</p>
          )}
        </Panel>
      ))}

      <AdminButton
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          setRoles((arr) => [...arr, { key: rid(), label: "Новая роль", full_access: false, permissions: [], is_system: false, sort: arr.length }])
        }
      >
        <Plus className="h-4 w-4" strokeWidth={2} /> Добавить роль
      </AdminButton>

      <div className="sticky bottom-0 -mx-1 flex items-center gap-2 border-t border-border/60 bg-bg/85 py-3 backdrop-blur-sm">
        <AdminButton type="button" onClick={save} loading={saving}>Сохранить</AdminButton>
        <span className="text-[12px] text-ink-subtle">Права применяются к сайдбару и доступу к разделам.</span>
      </div>
    </div>
  );
}
