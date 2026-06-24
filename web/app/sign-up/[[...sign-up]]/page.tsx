import { SignUp } from "@clerk/nextjs";
import { AuthConsent } from "@/components/app/auth-consent";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-10">
      <SignUp />
      <AuthConsent />
    </div>
  );
}
