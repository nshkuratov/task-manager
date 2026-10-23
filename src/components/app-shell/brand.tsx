import { ListChecksIcon } from "lucide-react";
import Link from "next/link";

export function Brand() {
  return (
    <Link
      href="/lists"
      className="flex items-center gap-2 rounded-md font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <ListChecksIcon aria-hidden className="size-5" />
      Task Manager
    </Link>
  );
}
