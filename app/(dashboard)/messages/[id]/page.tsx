import { MessagesClient } from "@/components/messages/messages-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MobileThreadView from "./mobile-thread-view";

export default async function ConversationPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14))] flex-col w-full overflow-hidden bg-background">
      {/* Mobile-only view: Thread with in-header back button */}
      <div className="md:hidden flex flex-col h-full w-full">
        <MobileThreadView conversationId={id} userId={user.id} />
      </div>

      {/* Desktop-only view: full two-panel layout with active ID initialized */}
      <div className="hidden md:flex h-full w-full">
        <MessagesClient userId={user.id} initialActiveId={id} />
      </div>
    </div>
  );
}
