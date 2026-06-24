import { SignIn } from "@clerk/nextjs";
import { AuthConsent } from "@/components/app/auth-consent";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-10">
      <SignIn />
      <AuthConsent />
    </div>
  );
}
