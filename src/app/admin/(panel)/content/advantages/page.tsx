import { redirect } from "next/navigation";
export default function Page() {
  redirect("/admin/content/home-blocks?tab=advantages");
}
