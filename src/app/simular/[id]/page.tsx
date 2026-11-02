import type { Metadata } from "next";
import { Suspense } from "react";
import { GameScreen } from "@/components/sim/game-screen";

export const metadata: Metadata = { title: "Partida" };

export default function Page({ params }: PageProps<"/simular/[id]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Suspense fallback={<div aria-busy="true" className="h-96 rounded-lg bg-paper-raised" />}>
        <Game params={params} />
      </Suspense>
    </div>
  );
}

async function Game({ params }: { params: PageProps<"/simular/[id]">["params"] }) {
  const { id } = await params;
  return <GameScreen id={id} />;
}
