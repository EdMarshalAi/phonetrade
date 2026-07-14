"use client";

import * as React from "react";
import type { CardDisplay, ProductOption } from "@/lib/content";

const DEFAULT: CardDisplay = { cash: true, card: true, credit: true, old_price: true, badges: true, options: [] };

type Ctx = { display: CardDisplay; options: ProductOption[]; allowZeroStock: boolean };
const CardSettingsContext = React.createContext<Ctx>({ display: DEFAULT, options: [], allowZeroStock: true });

/** Провайдер настроек карточки (что показывать + опции) — из серверного layout. */
export function CardSettingsProvider({
  display,
  options,
  allowZeroStock,
  children,
}: {
  display: CardDisplay;
  options: ProductOption[];
  allowZeroStock: boolean;
  children: React.ReactNode;
}) {
  return <CardSettingsContext.Provider value={{ display, options, allowZeroStock }}>{children}</CardSettingsContext.Provider>;
}

export function useCardSettings() {
  return React.useContext(CardSettingsContext);
}
