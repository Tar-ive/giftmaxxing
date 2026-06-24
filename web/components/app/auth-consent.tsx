// Consent + payment disclosure shown wherever a user authenticates (the sign-in
// / sign-up pages, the AuthGate wall, and the group-gift invite landing). By
// continuing, the user agrees that Giftmaxxing coordinates group gifts but never
// processes payments or manages how a cost is split — that's between them and
// their group. Pure (no hooks / "use client"), so it renders on server pages too.
export function AuthConsent({ className }: { className?: string }) {
  return (
    <p
      className={
        className ??
        "mx-auto mt-5 max-w-sm text-center text-[11px] leading-relaxed text-ink-faint"
      }
    >
      By continuing, you agree to our{" "}
      <a href="/privacy" className="font-semibold underline hover:text-ink">
        Privacy&nbsp;Policy
      </a>
      . Giftmaxxing helps you coordinate group gifts but{" "}
      <strong className="font-semibold text-ink-soft">
        does not process payments or manage how the cost is split
      </strong>{" "}
      — collecting, splitting, and settling money is handled directly between you
      and your group.{" "}
      <a href="/privacy#group-gifts" className="font-semibold underline hover:text-ink">
        Learn&nbsp;more
      </a>
      .
    </p>
  );
}
