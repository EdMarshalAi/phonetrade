/**
 * Создаёт первого пользователя админки: auth-пользователя Supabase +
 * строку в admin_users с ролью admin. Идемпотентно (повторный запуск
 * не плодит дублей, обновляет роль/пароль).
 *
 * Требует применённой миграции 0001_admin_core.sql (таблица admin_users).
 *
 * Запуск:
 *   ADMIN_EMAIL=owner@phonetrade.ru ADMIN_PASSWORD='секрет' npm run seed:admin
 * Без переменных используются значения по умолчанию ниже (поменяйте пароль!).
 *
 * Нужны в .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* optional */
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local");
  }

  const email = (process.env.ADMIN_EMAIL ?? "owner@phonetrade.ru").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "PhoneTrade2026!";
  const fullName = process.env.ADMIN_NAME ?? "Администратор";

  const db = createClient(url, key, { auth: { persistSession: false } });

  // 1) Найти или создать auth-пользователя.
  let userId: string | undefined;
  const list = await db.auth.admin.listUsers();
  if (list.error) throw list.error;
  const existing = list.data.users.find((u) => u.email?.toLowerCase() === email);

  if (existing) {
    userId = existing.id;
    await db.auth.admin.updateUserById(userId, { password, email_confirm: true });
    console.log(`Auth-пользователь уже есть: ${email} (${userId}), пароль обновлён.`);
  } else {
    const created = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    userId = created.data.user.id;
    console.log(`Создан auth-пользователь: ${email} (${userId}).`);
  }

  // 2) Upsert строки admin_users с ролью admin.
  const up = await db
    .from("admin_users")
    .upsert(
      { id: userId, email, full_name: fullName, role: "admin", is_active: true },
      { onConflict: "id" }
    );
  if (up.error) throw up.error;

  console.log("\nГотово. Данные для входа в /admin/login:");
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  console.log("\nСразу смените пароль после первого входа (раздел «Пользователи»).");
}

main().catch((e) => {
  console.error("Ошибка seed-admin:", e.message ?? e);
  process.exit(1);
});
