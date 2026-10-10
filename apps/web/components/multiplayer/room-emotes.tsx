"use client";

import { AnimatePresence, motion } from "motion/react";
import { content } from "@/lib/content";
import { ContentIcon } from "@/components/game/icon";

export interface EmoteMessage {
  id: string;
  senderName: string;
  emoteId: string;
  icon: string;
  label: string;
}

export function RoomEmotesBar({ onSendEmote }: { onSendEmote: (emoteId: string) => void }) {
  const emotes = content.multiplayer.emotes;

  return (
    <div className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-card/90 p-1.5 shadow-md backdrop-blur">
      {emotes.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => onSendEmote(e.id)}
          title={e.label.en}
          className="grid size-9 place-items-center rounded-full text-foreground transition-transform hover:scale-115 active:scale-95 hover:bg-accent"
        >
          <ContentIcon name={e.icon} className="size-5" />
        </button>
      ))}
    </div>
  );
}

export function FloatingEmotesOverlay({ emotes }: { emotes: EmoteMessage[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 top-20 z-40 overflow-hidden px-4">
      <AnimatePresence>
        {emotes.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 30, scale: 0.6 }}
            animate={{ opacity: 1, y: -40, scale: 1 }}
            exit={{ opacity: 0, y: -90, scale: 0.8 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute bottom-10 start-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-primary/30 bg-card px-4 py-2 shadow-xl"
          >
            <span className="text-xs font-bold text-muted-foreground">{msg.senderName}:</span>
            <ContentIcon name={msg.icon} className="size-5 text-primary" />
            <span className="text-xs font-extrabold text-foreground">{msg.label}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
