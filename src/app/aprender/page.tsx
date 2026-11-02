import type { Metadata } from "next";
import { LearningPath } from "@/components/learn/path";

export const metadata: Metadata = { title: "Aprender" };

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <LearningPath />
    </div>
  );
}
