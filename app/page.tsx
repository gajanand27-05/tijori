import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 font-sans">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-5xl font-semibold text-primary">Tijori</h1>
        <p className="text-lg text-zinc-600">{"Your business's tijori, now smart."}</p>
      </div>
      <Button size="lg" className="h-14 rounded-2xl px-10 text-lg" render={<Link href="/app" />}>
        Open live demo
      </Button>
    </div>
  );
}
