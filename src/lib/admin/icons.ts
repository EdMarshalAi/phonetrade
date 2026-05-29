import {
  ShieldCheck,
  Wrench,
  ArrowRightLeft,
  MessagesSquare,
  MapPin,
  HeartHandshake,
  Award,
  Truck,
  BadgePercent,
  Star,
  Package,
  Headphones,
  Sparkles,
  Tag,
  Gift,
  Clock,
  CreditCard,
  Banknote,
  Smartphone,
  Search,
  Settings,
  ThumbsUp,
  ShoppingBag,
  Zap,
  Battery,
  Camera,
  Cpu,
  RefreshCw,
  CheckCircle2,
  Phone,
  type LucideIcon,
} from "lucide-react";

/**
 * Единый набор иконок системы (kebab-имена ↔ lucide-компоненты).
 * Используется и в админ-пикере, и в публичных компонентах (преимущества,
 * шаги trade-in). Имя хранится строкой в БД.
 */
export const ICON_SET: { name: string; Icon: LucideIcon }[] = [
  { name: "shield-check", Icon: ShieldCheck },
  { name: "wrench", Icon: Wrench },
  { name: "arrow-right-left", Icon: ArrowRightLeft },
  { name: "messages-square", Icon: MessagesSquare },
  { name: "map-pin", Icon: MapPin },
  { name: "heart-handshake", Icon: HeartHandshake },
  { name: "award", Icon: Award },
  { name: "truck", Icon: Truck },
  { name: "badge-percent", Icon: BadgePercent },
  { name: "star", Icon: Star },
  { name: "package", Icon: Package },
  { name: "headphones", Icon: Headphones },
  { name: "tag", Icon: Tag },
  { name: "gift", Icon: Gift },
  { name: "clock", Icon: Clock },
  { name: "credit-card", Icon: CreditCard },
  { name: "banknote", Icon: Banknote },
  { name: "smartphone", Icon: Smartphone },
  { name: "search", Icon: Search },
  { name: "settings", Icon: Settings },
  { name: "thumbs-up", Icon: ThumbsUp },
  { name: "shopping-bag", Icon: ShoppingBag },
  { name: "zap", Icon: Zap },
  { name: "battery", Icon: Battery },
  { name: "camera", Icon: Camera },
  { name: "cpu", Icon: Cpu },
  { name: "refresh-cw", Icon: RefreshCw },
  { name: "check", Icon: CheckCircle2 },
  { name: "phone", Icon: Phone },
];

const MAP: Record<string, LucideIcon> = Object.fromEntries(ICON_SET.map((i) => [i.name, i.Icon]));

/** Имя иконки → компонент (Sparkles по умолчанию). */
export function resolveIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Sparkles;
  return MAP[name.trim().toLowerCase()] ?? Sparkles;
}
