import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const LOGIN_PATH = "/admin/login";

/**
 * Proxy (Next 16 — бывший middleware). Освежает cookie-сессию Supabase и
 * грубо гейтит доступ к /admin/*:
 *   • нет сессии и путь не /admin/login → редирект на логин;
 *   • есть сессия и путь /admin/login   → редирект в дашборд.
 * Точная проверка роли (запись в admin_users, is_active) делается в
 * (admin)/layout.tsx — proxy лишь дешёвый первый барьер.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Без env Supabase не блокируем — пусть layout покажет понятную ошибку.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isLogin = pathname === LOGIN_PATH;

  if (!user && !isLogin) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("returnTo", pathname + search);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLogin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Гейт по правам роли: ограниченные роли не открывают чужие разделы по URL.
  if (user && !isLogin && pathname !== "/admin") {
    const { data: au } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (au) {
      const { data: role } = await supabase
        .from("admin_roles")
        .select("full_access, permissions")
        .eq("key", au.role)
        .maybeSingle();
      const fullAccess = !!role?.full_access;
      const perms: string[] = Array.isArray(role?.permissions) ? (role!.permissions as string[]) : [];
      const allowed =
        fullAccess || perms.some((p) => pathname === p || pathname.startsWith(p + "/"));
      if (!allowed) return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return response;
}

export const config = {
  // Только маршруты админки.
  matcher: ["/admin/:path*"],
};
