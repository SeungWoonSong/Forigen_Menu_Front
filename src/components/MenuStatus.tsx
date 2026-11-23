import Image from "next/image";
import type { Language } from "../types/menu";
import { PENGUIN } from "../lib/menu";
import { menuCopy } from "../lib/menu-copy";
import { Button } from "./ui/button";

interface MenuStatusProps {
  state: "loading" | "unpublished" | "empty" | "error";
  language: Language;
  action?: { label: string; onClick: () => void };
}

export function MenuStatus({ state, language, action }: MenuStatusProps) {
  const copy = menuCopy[language];

  return (
    <section className="rounded-2xl border bg-card px-5 py-12 text-center sm:py-16">
      <div className="flex flex-col items-center gap-3" role={state === "error" ? "alert" : "status"}>
        <Image src={PENGUIN[state]} alt="" width={160} height={160} priority={state === "loading"} />
        <h2 className="text-xl font-semibold">{copy[state]}</h2>
      </div>
      {action && <Button className="mt-5 whitespace-normal" onClick={action.onClick}>{action.label}</Button>}
    </section>
  );
}
