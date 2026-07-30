import type { Metadata } from "next";
import { UsedListing, usedListingMetadata } from "./listing";
import {
  hasCatalogViewParams,
  type RouteSearchParams,
} from "@/lib/catalog/pagination";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<RouteSearchParams>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const query = await searchParams;
  return usedListingMetadata({
    currentPage: 1,
    isFaceted: hasCatalogViewParams(query),
  });
}

export default async function UsedPage({ searchParams }: Props) {
  const query = await searchParams;
  return (
    <UsedListing
      currentPage={1}
      isFaceted={hasCatalogViewParams(query)}
    />
  );
}
