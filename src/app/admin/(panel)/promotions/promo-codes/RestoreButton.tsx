"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminButton } from "@/components/admin/form";
import { restorePromo } from "./actions";

export function RestoreButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <AdminButton
      size="sm"
      variant="outline"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        const r = await restorePromo(id);
        setBusy(false);
        if (r.error) { toast.error(r.error); return; }
        toast.success("Промокод восстановлен");
        router.refresh();
      }}
    >
      Восстановить
    </AdminButton>
  );
}
