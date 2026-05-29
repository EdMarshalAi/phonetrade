export const LEAD_TYPE: Record<string, string> = {
  trade_in: "Trade-in",
  callback: "Обратный звонок",
  question: "Вопрос",
  repair: "Ремонт",
};

export const LEAD_STATUS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  converted: "Конвертирована",
  rejected: "Отказ",
};

export function leadStatusTone(status: string): "neutral" | "strong" | "outline" | "danger" {
  if (status === "converted") return "strong";
  if (status === "rejected") return "danger";
  if (status === "in_progress") return "outline";
  return "neutral";
}
