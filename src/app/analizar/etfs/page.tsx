import type { Metadata } from "next";
import { Suspense } from "react";
import { EtfView } from "@/components/rates/etf-view";
import { CDT_DATA_START } from "@/lib/rates/cdt";

export const metadata: Metadata = { title: "ETFs y CDT" };

export default function Page() {
  return (
    <Suspense>
      <EtfView dataStart={CDT_DATA_START} />
    </Suspense>
  );
}
