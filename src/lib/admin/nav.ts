import {
  BarChart3,
  ShoppingCart,
  Inbox,
  Package,
  FolderTree,
  Tag,
  Repeat,
  Table2,
  Images,
  LayoutGrid,
  Newspaper,
  FileText,
  Ticket,
  Percent,
  Users,
  Store,
  Menu,
  Search,
  Bell,
  Plug,
  UserCog,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import type { AdminRole } from "@/lib/admin/auth";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Если не указано — доступно всем ролям. */
  roles?: AdminRole[];
}

export interface NavGroup {
  /** Заголовок группы (необязательно для верхнего блока). */
  label?: string;
  items: NavItem[];
}

const ALL: AdminRole[] = ["admin", "manager", "content"];
const STAFF: AdminRole[] = ["admin", "manager"];
const ADMIN_ONLY: AdminRole[] = ["admin"];
const CONTENT: AdminRole[] = ["admin", "content"];
const ANALYTICS: AdminRole[] = ["admin", "manager", "analytics"];

/** Структура сайдбара админки (спека §2). */
export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Аналитика",
    items: [
      { label: "Аналитика сайта", href: "/admin/analytics/site", icon: BarChart3, roles: ANALYTICS },
      { label: "Аналитика заказов", href: "/admin/analytics/orders", icon: BarChart3, roles: ANALYTICS },
    ],
  },
  {
    label: "Продажи",
    items: [
      { label: "Заказы", href: "/admin/orders", icon: ShoppingCart, roles: STAFF },
      { label: "Заявки", href: "/admin/leads", icon: Inbox, roles: STAFF },
      { label: "Клиенты", href: "/admin/customers", icon: Users, roles: STAFF },
    ],
  },
  {
    label: "Каталог",
    items: [
      { label: "Товары", href: "/admin/catalog/products", icon: Package, roles: ALL },
      { label: "Прайс", href: "/admin/catalog/pricing", icon: Table2, roles: STAFF },
      { label: "Категории", href: "/admin/catalog/categories", icon: FolderTree, roles: ALL },
      { label: "Бренды", href: "/admin/catalog/brands", icon: Tag, roles: ALL },
      { label: "Цены выкупа", href: "/admin/catalog/trade-in-prices", icon: Repeat, roles: STAFF },
    ],
  },
  {
    label: "Контент",
    items: [
      { label: "Hero-баннер", href: "/admin/content/hero", icon: Images, roles: CONTENT },
      { label: "Блоки на главной", href: "/admin/content/home-blocks", icon: LayoutGrid, roles: CONTENT },
      { label: "Блог", href: "/admin/content/blog", icon: Newspaper, roles: CONTENT },
      { label: "Страницы", href: "/admin/content/pages", icon: FileText, roles: CONTENT },
    ],
  },
  {
    label: "Промо",
    items: [
      { label: "Промокоды", href: "/admin/promotions/promo-codes", icon: Ticket, roles: STAFF },
      { label: "Скидки и акции", href: "/admin/promotions/discounts", icon: Percent, roles: STAFF },
    ],
  },
  {
    label: "Настройки",
    items: [
      { label: "Общие", href: "/admin/settings/shop", icon: Store, roles: ADMIN_ONLY },
      { label: "Навигация", href: "/admin/settings/navigation", icon: Menu, roles: ADMIN_ONLY },
      { label: "Корзина", href: "/admin/settings/cart", icon: ShoppingCart, roles: ADMIN_ONLY },
      { label: "Статусы заказов", href: "/admin/settings/orders", icon: ListChecks, roles: ADMIN_ONLY },
      { label: "SEO", href: "/admin/settings/seo", icon: Search, roles: ADMIN_ONLY },
      { label: "Уведомления", href: "/admin/settings/notifications", icon: Bell, roles: ADMIN_ONLY },
      { label: "Интеграции", href: "/admin/settings/integrations", icon: Plug, roles: ADMIN_ONLY },
      { label: "Администраторы", href: "/admin/settings/users", icon: UserCog, roles: ADMIN_ONLY },
    ],
  },
];

/** Сайдбар по правам роли: full_access — всё; иначе фильтр по permissions (href). */
export function navForAccess(fullAccess: boolean, permissions: string[]): NavGroup[] {
  if (fullAccess) return ADMIN_NAV.filter((g) => g.items.length > 0);
  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (i) => i.href === "/admin" || permissions.some((p) => i.href === p || i.href.startsWith(p + "/"))
    ),
  })).filter((group) => group.items.length > 0);
}

/** Плоский список разделов для настройки прав роли (без дашборда). */
export const NAV_PERMISSION_ITEMS: { href: string; label: string; group: string }[] =
  ADMIN_NAV.flatMap((g) =>
    g.items
      .filter((i) => i.href !== "/admin")
      .map((i) => ({ href: i.href, label: i.label, group: g.label ?? "Основное" }))
  );

/** Человеческое имя раздела по href (для хлебных крошек/заголовков). */
export function labelForHref(href: string): string | undefined {
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      if (item.href === href) return item.label;
    }
  }
  return undefined;
}
