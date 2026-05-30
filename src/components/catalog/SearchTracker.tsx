"use client";

import * as React from "react";
import { trackSearch } from "@/lib/analytics/track";

/** Логирует поисковый запрос в аналитику (search_queries) один раз на запрос. */
export function SearchTracker({ query, count }: { query: string; count: number }) {
  React.useEffect(() => {
    if (query.trim()) trackSearch(query, count);
  }, [query, count]);
  return null;
}
