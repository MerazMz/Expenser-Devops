"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveTodayExpense } from "@/actions/expenses";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpendInputProps {
  userId: string;
  initialSpent?: number;
  initialNote?: string;
}

import { motion, AnimatePresence } from "framer-motion";

import { useQueryClient } from "@tanstack/react-query";

export function SpendInput({ userId, initialSpent = 0, initialNote = "" }: SpendInputProps) {
  const queryClient = useQueryClient();
  const [spent, setSpent] = useState(initialSpent > 0 ? initialSpent.toString() : "");
  const [note, setNote] = useState(initialNote);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(initialSpent === 0);

  const handleSave = async () => {
    if (!spent || Number(spent) < 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    try {
      await saveTodayExpense(userId, Number(spent), note);
      setIsSaved(true);
      toast.success("Expense saved!");
      
      // Invalidate cache to refresh data across pages
      queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
      queryClient.invalidateQueries({ queryKey: ["insights", userId] });
      queryClient.invalidateQueries({ queryKey: ["calendar", userId] });

      setTimeout(() => {
        setIsSaved(false);
        setIsEditing(false);
      }, 1500);
    } catch {
      toast.error("Failed to save expense");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!isEditing && initialSpent > 0 ? (
        <motion.div
          key="caught-up"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={() => setIsEditing(true)}
          className="flex flex-col items-center justify-center p-8 rounded-2xl bg-card border border-primary/10 cursor-pointer group active:scale-[0.98] transition-all"
        >
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">YOU&apos;RE CAUGHT UP FOR TODAY</p>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest opacity-40">
            TAP TO EDIT ENTRY
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="editing"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-4"
        >
          <div className="relative">
            <Input
              type="number"
              placeholder="0"
              value={spent}
              autoFocus={initialSpent > 0}
              onChange={(e) => {
                setSpent(e.target.value);
                setIsSaved(false);
              }}
              className="h-16 border-border bg-card rounded-xl px-6 text-2xl font-medium italic text-foreground focus-visible:ring-primary/20 font-mono"
            />
          </div>
          
          <Input
            placeholder="Add a note (optional)"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setIsSaved(false);
            }}
            className="h-10 border-none bg-transparent px-2 text-sm text-muted-foreground focus-visible:ring-0 placeholder:text-muted-foreground/30"
          />

          <Button
            onClick={handleSave}
            disabled={isLoading}
            className={cn(
              "h-14 w-full rounded-xl text-sm font-medium uppercase tracking-widest transition-all duration-300",
              isSaved ? "bg-green-500 text-white" : "bg-primary text-black hover:opacity-90 active:scale-[0.98]"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : isSaved ? (
              <Check className="h-6 w-6" />
            ) : (
              "SAVE EXPENSE"
            )}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
