"use client";

import { createContext, useContext, useState } from "react";
import CommentLayer from "./CommentLayer";

type FeedbackCtx = { enabled: boolean; toggle: () => void };
const Ctx = createContext<FeedbackCtx>({ enabled: false, toggle: () => {} });

export function useFeedback() {
  return useContext(Ctx);
}

export default function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const toggle = () => setEnabled((e) => !e);
  return (
    <Ctx.Provider value={{ enabled, toggle }}>
      {children}
      <CommentLayer enabled={enabled} />
    </Ctx.Provider>
  );
}
