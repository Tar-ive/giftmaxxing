"use client";

import { useState } from "react";
import Link from "next/link";
import { USERS } from "@/lib/social";
import { Avatar, Icons } from "@/components/ui";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const users = Object.values(USERS).filter(
    (u) =>
      u.id !== "you" &&
      (u.name.toLowerCase().includes(q.toLowerCase()) ||
        u.handle.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-5 flex items-center gap-3 rounded-full border border-line bg-surface px-4 py-2.5">
        <Icons.search size={18} className="text-ink-faint" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people…"
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
        />
      </div>

      <p className="mb-2 px-1 text-sm font-bold text-ink-soft">
        {q ? "Results" : "Recent"}
      </p>
      <div className="space-y-1">
        {users.map((u) => (
          <Link
            key={u.id}
            href={`/feed/${u.id}`}
            className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-ink/5"
          >
            <Avatar grad={u.grad} label={u.name} size={44} />
            <div>
              <p className="text-sm font-bold text-ink">{u.handle}</p>
              <p className="text-xs text-ink-faint">{u.name}</p>
            </div>
          </Link>
        ))}
        {users.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-faint">No people found.</p>
        )}
      </div>
    </div>
  );
}
