// /feed/drops has been folded into /feed/shop — Shop now hosts both the normal
// Amazon picks and the bundled deals ("drops") that used to live here. Redirect
// so old links, bookmarks, and the screenshot script keep working.
import { redirect } from "next/navigation";

export default function DropsPage() {
  redirect("/feed/shop");
}
