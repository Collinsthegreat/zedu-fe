import { useContext, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { DataContext } from "~/store/GlobalState";
import { ACTIONS } from "~/store/Actions";
import { setMessageHighlight } from "~/utils/message-highlight";

interface UseMessageDeepLinkOptions {
  messages: Array<{ thread_id?: string; [key: string]: any }>;
  loading?: boolean;
}

export function useMessageDeepLink({
  messages,
  loading = false,
}: UseMessageDeepLinkOptions) {
  const searchParams = useSearchParams();
  const params = useParams();
  const { state, dispatch } = useContext(DataContext);
  const appliedRef = useRef<string | null>(null);
  const threadRef = useRef(state?.thread);
  const loadThreadRef = useRef(state?.loadThread);
  const repliesRef = useRef(state?.replies);

  useEffect(() => {
    threadRef.current = state?.thread;
    loadThreadRef.current = state?.loadThread;
    repliesRef.current = state?.replies;
  }, [state?.thread, state?.loadThread, state?.replies]);

  const threadId = searchParams.get("thread_id");
  const messageId = searchParams.get("message_id");
  const channelId = (params?.id as string) || "";

  useEffect(() => {
    if (!threadId) {
      appliedRef.current = null;
      return;
    }

    const signature = `${channelId}:${threadId}:${messageId || ""}`;
    const parentThread = messages?.find(
      (message: any) =>
        String(message?.thread_id || "") === String(threadId) ||
        String(message?.id || "") === String(threadId)
    );

    if (appliedRef.current === signature) {
      if (
        parentThread &&
        String(threadRef.current?.thread_id || "") === String(threadId) &&
        (!threadRef.current?.message ||
          threadRef.current?.username === "Thread")
      ) {
        // Restore parent metadata only; page-1 REPLIES would wipe fetched replies.
        dispatch({ type: ACTIONS.THREAD, payload: parentThread });
        const existingReplies = repliesRef.current || [];
        if (
          existingReplies.length === 0 &&
          Array.isArray(parentThread.preview_reply) &&
          parentThread.preview_reply.length > 0
        ) {
          dispatch({
            type: ACTIONS.REPLIES,
            payload: {
              newThreads: parentThread.preview_reply,
              newPage: 1,
              parentReactions: parentThread.reactions,
            },
          });
        }
      }
      return;
    }

    const highlightId = threadId;

    setMessageHighlight(highlightId);
    dispatch({ type: ACTIONS.DATA_ID, payload: highlightId });

    if (parentThread) {
      dispatch({ type: ACTIONS.THREAD, payload: parentThread });
      dispatch({
        type: ACTIONS.REPLIES,
        payload: {
          newThreads: parentThread.preview_reply || [],
          newPage: 1,
          parentReactions: parentThread.reactions,
        },
      });
      dispatch({ type: ACTIONS.REPLY, payload: true });
      dispatch({ type: ACTIONS.LOAD_THREAD, payload: !loadThreadRef.current });
      appliedRef.current = signature;
      return;
    }

    if (!loading) {
      const fallbackThread = {
        thread_id: threadId,
        channels_id: channelId,
        message: "",
        username: "Thread",
        created_at: new Date().toISOString(),
        reactions: [],
        preview_reply: [],
        type: "message",
      };

      dispatch({ type: ACTIONS.THREAD, payload: fallbackThread });
      dispatch({
        type: ACTIONS.REPLIES,
        payload: {
          newThreads: [],
          newPage: 1,
          parentReactions: [],
        },
      });
      dispatch({ type: ACTIONS.REPLY, payload: true });
      dispatch({ type: ACTIONS.LOAD_THREAD, payload: !loadThreadRef.current });
      appliedRef.current = signature;
    }
  }, [channelId, threadId, messageId, messages, loading, dispatch]);
}
