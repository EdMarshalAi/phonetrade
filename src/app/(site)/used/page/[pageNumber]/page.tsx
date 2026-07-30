import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  hasCatalogViewParams,
  parsePageNumber,
  searchParamsString,
  type RouteSearchParams,
} from "@/lib/catalog/pagination";
import { UsedListing, usedListingMetadata } from "../../listing";

type Props = {
  params: Promise<{ pageNumber: string }>;
  searchParams: Promise<RouteSearchParams>;
};

async function resolveRoute(props: Props) {
  const [{ pageNumber }, query] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const currentPage = parsePageNumber(pageNumber);
  if (currentPage === 1) {
    const queryString = searchParamsString(query);
    permanentRedirect(queryString ? `/used?${queryString}` : "/used");
  }
  if (currentPage === null) notFound();
  if (hasCatalogViewParams(query)) {
    const queryString = searchParamsString(query);
    redirect(queryString ? `/used?${queryString}` : "/used");
  }
  return currentPage;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return usedListingMetadata({
    currentPage: await resolveRoute(props),
    isFaceted: false,
  });
}

export default async function PaginatedUsedPage(props: Props) {
  return (
    <UsedListing
      currentPage={await resolveRoute(props)}
      isFaceted={false}
    />
  );
}
