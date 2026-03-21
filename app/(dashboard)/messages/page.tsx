import { MessagesClient } from "@/components/messages/messages-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14))] flex-col sm:flex-row w-full overflow-hidden bg-background">
        <MessagesClient userId={user.id} />
    </div>
  );
}
