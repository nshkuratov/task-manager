import "server-only";
import type { TaskPriority, TaskStatus } from "@/contracts/task";

export interface DemoTask {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: Date | null;
}

export interface DemoList {
  name: string;
  createdAt: Date;
  tasks: DemoTask[];
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * The demo lists, with deadlines relative to `now` so a fresh seed shows every list-card state:
 * overdue (red), due within 48 h (yellow), all done (100%), and empty. Newest list first.
 */
export function buildDemoData(now: Date): DemoList[] {
  const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);

  return [
    {
      name: "Product launch",
      createdAt: at(0),
      tasks: [
        {
          title: "Finalize pricing page copy",
          description: "Legal asked for the annual-plan disclaimer before the page goes live.",
          status: "in_progress",
          priority: "high",
          deadline: at(-1 * DAY),
        },
        {
          title: "Record the product demo video",
          description: "Three minutes, covering onboarding and the reports screen.",
          status: "new",
          priority: "high",
          deadline: at(5 * DAY),
        },
        {
          title: "Write the launch blog post",
          description: "Draft is in the shared folder; needs screenshots of the new dashboard.",
          status: "in_progress",
          priority: "medium",
          deadline: at(7 * DAY),
        },
        {
          title: "Set up the status page",
          description: "",
          status: "done",
          priority: "medium",
          deadline: at(-3 * DAY),
        },
        {
          title: "Prepare the press kit",
          description: "Logo pack, founder bios and two product screenshots.",
          status: "new",
          priority: "medium",
          deadline: at(3 * DAY),
        },
        {
          title: "Brief the support team",
          description: "Walk through the FAQ and the known limitations.",
          status: "new",
          priority: "low",
          deadline: null,
        },
      ],
    },
    {
      name: "Home renovation",
      createdAt: at(-1 * HOUR),
      tasks: [
        {
          title: "Confirm the tiler's start date",
          description: "They need the bathroom cleared the evening before.",
          status: "new",
          priority: "high",
          deadline: at(20 * HOUR),
        },
        {
          title: "Choose kitchen cabinet handles",
          description: "Brushed brass or matte black; order samples of both.",
          status: "in_progress",
          priority: "medium",
          deadline: at(10 * DAY),
        },
        {
          title: "Get three quotes for the windows",
          description: "",
          status: "new",
          priority: "low",
          deadline: null,
        },
        {
          title: "Pick paint colours for the hallway",
          description: "",
          status: "new",
          priority: "low",
          deadline: at(14 * DAY),
        },
        {
          title: "Book the skip hire",
          description: "Eight-yard skip for two weeks.",
          status: "done",
          priority: "medium",
          deadline: at(-2 * DAY),
        },
      ],
    },
    {
      name: "Reading list",
      createdAt: at(-2 * HOUR),
      tasks: [
        {
          title: "Designing Data-Intensive Applications",
          description: "Chapters on replication and partitioning.",
          status: "done",
          priority: "high",
          deadline: at(-20 * DAY),
        },
        {
          title: "The Pragmatic Programmer",
          description: "",
          status: "done",
          priority: "medium",
          deadline: null,
        },
        {
          title: "Refactoring UI",
          description: "Take notes on spacing and typographic scale.",
          status: "done",
          priority: "low",
          deadline: at(-5 * DAY),
        },
        {
          title: "Thinking in Systems",
          description: "",
          status: "done",
          priority: "low",
          deadline: null,
        },
      ],
    },
    {
      name: "Someday",
      createdAt: at(-3 * HOUR),
      tasks: [],
    },
  ];
}
