import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { parsePageNumber } from "@/lib/catalog/pagination";
import { NewListing, newListingMetadata } from "../../listing";

type Props = {
  params: Promise<{ pageNumber: string }>;
};

async function currentPage(props: Props): Promise<number> {
  const { pageNumber } = await props.params;
  const page = parsePageNumber(pageNumber);
  if (page === 1) permanentRedirect("/new");
  if (page === null) notFound();
  return page;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return newListingMetadata(await currentPage(props));
}

export default async function PaginatedNewPage(props: Props) {
  return <NewListing currentPage={await currentPage(props)} />;
}
