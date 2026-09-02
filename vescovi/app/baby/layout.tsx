import React from "react";

export const metadata = {
  title: "Le Petit Prince — Pronostic Bébé",
};

export default function BabyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8E6] via-[#FFFDF7] to-[#E8F6FF] text-slate-900">
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-3xl">{children}</div>
      </div>
    </div>
  );
}
