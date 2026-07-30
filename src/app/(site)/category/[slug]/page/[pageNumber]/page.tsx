import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  hasCatalogViewParams,
  parsePageNumber,
  searchParamsString,
  type RouteSearchParams,
} from "@/lib/catalog/pagination";
import {
  CategoryListing,
  categoryListingMetadata,
} from "../../listing";

type Props = {
  params: Promise<{ slug: string; pageNumber: string }>;
  searchParams: Promise<RouteSearchParams>;
};

async function resolveRoute(props: Props) {
  const [{ slug, pageNumber }, query] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const currentPage = parsePageNumber(pageNumber);
  const basePath = `/category/${slug}`;

  if (currentPage === 1) {
    const queryString = searchParamsString(query);
    permanentRedirect(queryString ? `${basePath}?${queryString}` : basePath);
  }
  if (currentPage === null) notFound();
  if (hasCatalogViewParams(query)) {
    const queryString = searchParamsString(query);
    redirect(queryString ? `${basePath}?${queryString}` : basePath);
  }
  return { slug, currentPage };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug, currentPage } = await resolveRoute(props);
  return categoryListingMetadata({
    slug,
    currentPage,
    isFaceted: false,
  });
}

export default async function PaginatedCategoryPage(props: Props) {
  const { slug, currentPage } = await resolveRoute(props);
  return (
    <CategoryListing
      slug={slug}
      currentPage={currentPage}
      isFaceted={false}
    />
  );
}
