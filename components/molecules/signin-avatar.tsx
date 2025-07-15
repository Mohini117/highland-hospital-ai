import InteractiveSignInButton from "@/components/molecules/interactive-sign-in-button";
import { auth } from "@/auth";
import ClientAvatar from "@/components/molecules/client-avatar";

export default async function SigninOrAvatar() {
  const session = await auth();
  if (!session?.user) {
    return <InteractiveSignInButton />;
  }

  return <ClientAvatar session={session} />;
}
