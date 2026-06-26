"use client";

import { createContext, useContext, useState } from "react";
import type { ReviewConfig } from "./config";
import CommentLayer from "./CommentLayer";

/*
  ReviewKitProvider — the consumer passes its own config here. All kit
  components read config (and the feedback on/off state) from context,
  so the kit isn't tied to any single project.
*/

type Ctx = { config: ReviewConfig; enabled: boolean; toggle: () => void };
const ReviewCtx = createContext<Ctx | null>(null);

export function useReviewKit(): Ctx {
  const c = useContext(ReviewCtx);
  if (!c) throw new Error("useReviewKit must be used inside <ReviewKitProvider>");
  return c;
}

export function useFeedback() {
  const { enabled, toggle } = useReviewKit();
  return { enabled, toggle };
}

export default function ReviewKitProvider({ config, children }: { config: ReviewConfig; children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  return (
    <ReviewCtx.Provider value={{ config, enabled, toggle: () => setEnabled((e) => !e) }}>
      {children}
      <CommentLayer />
    </ReviewCtx.Provider>
  );
}
