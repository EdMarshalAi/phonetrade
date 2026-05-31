/** Варианты ответов квиза trade-in (общие, без "use server"). */

export const EXTERNAL_OPTIONS = [
  { value: "perfect", label: "Как новый", hint: "Без следов использования" },
  { value: "light_wear", label: "Лёгкие потёртости", hint: "Почти не видно" },
  { value: "scratches", label: "Заметные царапины", hint: "Видны при разглядывании" },
  { value: "glass_crack", label: "Трещины на стекле", hint: "Сколы или трещины экрана" },
  { value: "body_crack", label: "Трещины на корпусе", hint: "Повреждения корпуса" },
] as const;

export const BATTERY_OPTIONS = [
  { value: "90_100", label: "90% и выше", hint: "Отличное состояние" },
  { value: "85_89", label: "85–89%", hint: "Хорошее" },
  { value: "80_84", label: "80–84%", hint: "Среднее" },
  { value: "below_80", label: "Меньше 80%", hint: "Требует замены" },
] as const;

export const KIT_OPTIONS = [
  { value: "full", label: "Коробка + зарядка", hint: "+5% к цене" },
  { value: "box_only", label: "Только коробка", hint: "+2% к цене" },
  { value: "none", label: "Без коробки", hint: "" },
] as const;

export type ExternalValue = (typeof EXTERNAL_OPTIONS)[number]["value"];
export type BatteryValue = (typeof BATTERY_OPTIONS)[number]["value"];
export type KitValue = (typeof KIT_OPTIONS)[number]["value"];

export const EXTERNAL_LABELS: Record<string, string> = Object.fromEntries(EXTERNAL_OPTIONS.map((o) => [o.value, o.label]));
export const BATTERY_LABELS: Record<string, string> = Object.fromEntries(BATTERY_OPTIONS.map((o) => [o.value, o.label]));
export const KIT_LABELS: Record<string, string> = Object.fromEntries(KIT_OPTIONS.map((o) => [o.value, o.label]));

export const TRADE_IN_STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  contacted: "Менеджер связался",
  scheduled: "Назначена встреча",
  evaluated: "На оценке",
  agreed: "Цена согласована",
  completed: "Выкуплено",
  rejected: "Отклонена",
  cancelled: "Отменена",
};

export type TradeInModel = {
  model_key: string;
  model_title: string;
  memories: { memory_gb: number; base_price_rub: number }[];
};
