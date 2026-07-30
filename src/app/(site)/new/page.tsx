import type { Metadata } from "next";
import { NewListing, newListingMetadata } from "./listing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return newListingMetadata(1);
}

export default function NewArrivalsPage() {
  return <NewListing currentPage={1} />;
}
