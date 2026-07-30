import type { Metadata } from "next";
import {
  CategoryListing,
  categoryListingMetadata,
} from "./listing";
import {
  hasCatalogViewParams,
  type RouteSearchParams,
} from "@/lib/catalog/pagination";

type RouteParams = { slug: string };

type Props = {
  params: Promise<RouteParams>;
  searchParams: Promise<RouteSearchParams>;
};

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  return categoryListingMetadata({
    slug,
    currentPage: 1,
    isFaceted: hasCatalogViewParams(query),
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  return (
    <CategoryListing
      slug={slug}
      currentPage={1}
      isFaceted={hasCatalogViewParams(query)}
    />
  );
}
