"use client";

import * as React from "react";
import { Tooltip } from "@base-ui-components/react/tooltip";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <Tooltip.Provider delay={150}>{children}</Tooltip.Provider>;
}
