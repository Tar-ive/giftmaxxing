import { Maxi } from "@/components/ui";

export function ComingSoon({
  title,
  body,
  emoji,
}: {
  title: string;
  body: string;
  emoji?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      {emoji ? <span className="text-5xl">{emoji}</span> : <Maxi size={64} />}
      <h1 className="mt-5 font-serif text-3xl text-ink">{title}</h1>
      <p className="mt-3 text-ink-soft">{body}</p>
      <span className="mt-6 rounded-full bg-coral-soft px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-coral-ink">
        Coming soon
      </span>
    </div>
  );
}
