import {
  // Коммерция / магазин
  ShoppingCart,
  ShoppingBag,
  Store,
  Package,
  PackageCheck,
  Truck,
  CreditCard,
  Banknote,
  Wallet,
  Coins,
  HandCoins,
  BadgePercent,
  Percent,
  Tag,
  Tags,
  Gift,
  Receipt,
  Ticket,
  // Доверие / качество
  ShieldCheck,
  BadgeCheck,
  Star,
  Heart,
  HeartHandshake,
  ThumbsUp,
  Award,
  Gem,
  Sparkles,
  // Техника (тематика Apple)
  Smartphone,
  Tablet,
  Laptop,
  Watch,
  Headphones,
  Headset,
  Cpu,
  BatteryFull,
  Camera,
  Wifi,
  // Сервис / обмен / время
  ArrowRightLeft,
  RefreshCw,
  Clock,
  Timer,
  Hourglass,
  Wrench,
  Settings,
  // Связь / навигация
  MessagesSquare,
  Phone,
  MapPin,
  Search,
  Zap,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

/**
 * Единый набор иконок системы (kebab-имена ↔ lucide-компоненты).
 * Подобран под электронную торговлю техникой Apple: магазин/оплата/доставка,
 * доверие, устройства, сервис и время. Используется и в админ-пикере, и в
 * публичных компонентах (преимущества, шаги trade-in, бейджи). Имя хранится
 * строкой в БД — старые имена сохранены, чтобы данные не «отвалились».
 */
export const ICON_SET: { name: string; Icon: LucideIcon }[] = [
  // Коммерция
  { name: "shopping-cart", Icon: ShoppingCart },
  { name: "shopping-bag", Icon: ShoppingBag },
  { name: "store", Icon: Store },
  { name: "package", Icon: Package },
  { name: "package-check", Icon: PackageCheck },
  { name: "truck", Icon: Truck },
  { name: "credit-card", Icon: CreditCard },
  { name: "banknote", Icon: Banknote },
  { name: "wallet", Icon: Wallet },
  { name: "coins", Icon: Coins },
  { name: "hand-coins", Icon: HandCoins },
  { name: "badge-percent", Icon: BadgePercent },
  { name: "percent", Icon: Percent },
  { name: "tag", Icon: Tag },
  { name: "tags", Icon: Tags },
  { name: "gift", Icon: Gift },
  { name: "receipt", Icon: Receipt },
  { name: "ticket", Icon: Ticket },
  // Доверие / качество
  { name: "shield-check", Icon: ShieldCheck },
  { name: "badge-check", Icon: BadgeCheck },
  { name: "star", Icon: Star },
  { name: "heart", Icon: Heart },
  { name: "heart-handshake", Icon: HeartHandshake },
  { name: "thumbs-up", Icon: ThumbsUp },
  { name: "award", Icon: Award },
  { name: "gem", Icon: Gem },
  { name: "sparkles", Icon: Sparkles },
  // Техника
  { name: "smartphone", Icon: Smartphone },
  { name: "tablet", Icon: Tablet },
  { name: "laptop", Icon: Laptop },
  { name: "watch", Icon: Watch },
  { name: "headphones", Icon: Headphones },
  { name: "headset", Icon: Headset },
  { name: "cpu", Icon: Cpu },
  { name: "battery", Icon: BatteryFull },
  { name: "camera", Icon: Camera },
  { name: "wifi", Icon: Wifi },
  // Сервис / обмен / время
  { name: "arrow-right-left", Icon: ArrowRightLeft },
  { name: "refresh-cw", Icon: RefreshCw },
  { name: "clock", Icon: Clock },
  { name: "timer", Icon: Timer },
  { name: "hourglass", Icon: Hourglass },
  { name: "wrench", Icon: Wrench },
  { name: "settings", Icon: Settings },
  // Связь / навигация
  { name: "messages-square", Icon: MessagesSquare },
  { name: "phone", Icon: Phone },
  { name: "map-pin", Icon: MapPin },
  { name: "search", Icon: Search },
  { name: "zap", Icon: Zap },
  { name: "check", Icon: CheckCircle2 },
];

const MAP: Record<string, LucideIcon> = Object.fromEntries(ICON_SET.map((i) => [i.name, i.Icon]));

/** Имя иконки → компонент (Sparkles по умолчанию). */
export function resolveIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Sparkles;
  return MAP[name.trim().toLowerCase()] ?? Sparkles;
}
