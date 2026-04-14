import { auth } from "@/lib/auth";
import { canView } from "@/lib/authorization";
import { eventHub } from "@/lib/event-hub";
import { REALTIME_CONFIG } from "@/lib/realtime-config";
import { EVENT_TYPES, type HubEventEnvelope } from "@/lib/realtime-types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: listId } = await params;

  if (!(await canView(listId))) {
    return new Response("Forbidden", { status: 403 });
  }

  const userId = session.user.id;
  const userName = session.user.name ?? session.user.email ?? "Anonymous";

  // Rate limit: max connections per user per list
  const currentConnections = eventHub.getConnectionCount(listId, userId);
  if (currentConnections >= REALTIME_CONFIG.maxConnectionsPerUserPerList) {
    return new Response("Too many connections", { status: 429 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (err) {
          console.warn("SSE send failed (stream likely closed):", err);
        }
      };

      const sendKeepalive = () => {
        try {
          controller.enqueue(encoder.encode(":keepalive\n\n"));
        } catch (err) {
          console.warn("SSE keepalive failed (stream likely closed):", err);
        }
      };

      // Subscribe to events
      const unsubscribe = eventHub.subscribe(
        listId,
        userId,
        userName,
        (envelope: HubEventEnvelope) => {
          send(JSON.stringify(envelope));

          // Close stream if this user was removed from the list
          if (
            envelope.event.type === EVENT_TYPES.MEMBER_REMOVED &&
            envelope.event.data.userId === userId
          ) {
            cleanup();
            controller.close();
          }
        },
      );

      // Keepalive interval
      const keepaliveInterval = setInterval(
        sendKeepalive,
        REALTIME_CONFIG.keepaliveIntervalMs,
      );

      const cleanup = () => {
        unsubscribe();
        clearInterval(keepaliveInterval);
      };

      // Clean up on client disconnect
      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
