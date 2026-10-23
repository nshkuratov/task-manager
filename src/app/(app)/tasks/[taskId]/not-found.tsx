import Link from "next/link";
import { Button } from "@/components/ui/button";

/** A missing task and another user's task get the same answer, so an id reveals nothing. */
export default function TaskNotFound() {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-4 py-12 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Task not found</h1>
      <p className="text-sm text-muted-foreground">This task doesn&apos;t exist or was deleted.</p>
      <Button asChild>
        <Link href="/lists">Go to your lists</Link>
      </Button>
    </div>
  );
}
