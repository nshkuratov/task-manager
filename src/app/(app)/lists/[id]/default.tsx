import { notFound } from "next/navigation";

/**
 * `children` falls back here when the slot matches but no list page does (a hard load of a URL only `@modal`
 * knows). Without it the shell would render an empty `<main>` instead of the 404.
 */
export default function ListChildrenDefault() {
  notFound();
}
