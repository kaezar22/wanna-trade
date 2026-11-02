import type { Metadata } from "next";
import { ProfileView } from "@/components/sim/profile-view";

export const metadata: Metadata = { title: "Tu perfil de inversionista" };

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <ProfileView />
    </div>
  );
}
