import { MessagesClient } from "@/components/messages/messages-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConversationThread } from "@/components/messages/conversation-thread";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

// On mobile, we show just the thread with a back button. 
// On desktop, we ideally want to show the two-panel layout with the conversation active.
// For simplicity, we can render the thread full-screen on mobile, and on desktop just redirect to /messages 
// and handle the active ID via client state. However, since server doesn't know viewport, 
// a CSS-based approach or a client-side redirect component is best.

// Let's create a wrapper that displays the full thread and hides on md screens, combined with a redirect script
export default async function ConversationPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14))] flex-col w-full overflow-hidden bg-background">
      {/* Mobile-only view: Thread with Back Button */}
      <div className="md:hidden flex flex-col h-full w-full">
         <div className="flex items-center gap-2 p-2 border-b bg-background shrink-0">
             <Link href="/messages" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
                 <ArrowLeft className="w-5 h-5 mr-1" />
                 Back to List
             </Link>
         </div>
         <div className="flex-1 overflow-hidden relative">
             <ConversationThread conversationId={id} userId={user.id} />
         </div>
      </div>
      
      {/* Desktop-only view: full layout with active ID initialized */}
      <div className="hidden md:flex h-full w-full">
          {/* We pass the active id to the client via a small bootstrapper, or just modify MessagesClient to take an initialActiveId */}
         <MessagesClient userId={user.id} initialActiveId={id} />
      </div>
    </div>
  );
}
