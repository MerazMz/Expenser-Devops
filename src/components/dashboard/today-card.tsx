"use client";

import { Card, CardContent } from "@/components/ui/card";

interface TodayCardProps {
  expense: {
    date: string;
    limit: number;
    spent: number;
    saved: number;
  };
}

import { motion } from "framer-motion";

export function TodayCard({ expense }: TodayCardProps) {
  const displaySaved = expense.limit - expense.spent;
  const percentageSaved = Math.max(0, Math.min(100, Math.round((displaySaved / expense.limit) * 100)));
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Card className="border border-border bg-card rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-8">
            {/* Top Row */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground opacity-60">
                  Daily Budget
                </p>
                <p className="text-xl font-medium italic text-foreground font-mono">₹{expense.limit}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground opacity-60">
                  Today&apos;s Spent
                </p>
                <p className="text-xl font-medium italic text-foreground font-mono">₹{expense.spent}</p>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground opacity-60">
                  You Saved
                </p>
                <p className="text-3xl font-medium italic text-primary font-mono">₹{displaySaved}</p>
              </div>
              <div className="relative h-14 w-14 flex-shrink-0">
                <svg className="h-full w-full" viewBox="0 0 36 36">
                  <path
                    className="stroke-muted/20 fill-none"
                    strokeWidth="3"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <motion.path
                    className="stroke-primary fill-none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: percentageSaved / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-foreground/80">
                  {percentageSaved}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
