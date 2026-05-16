"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MonthlySummaryProps {
  summary: {
    totalSpent: number;
    totalSaved: number;
    totalLimit: number;
  };
  monthlyBudget: number;
}

import { motion } from "framer-motion";

export function MonthlySummary({ summary, monthlyBudget }: MonthlySummaryProps) {
  const percentageUsed = Math.min(Math.round((summary.totalSpent / monthlyBudget) * 100), 100);
  const remainingBudget = monthlyBudget - summary.totalSpent;
  
  return (
    <div className="space-y-8">
      <motion.div 
        className="grid grid-cols-2 gap-3"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        <StatCard label="Budget" value={monthlyBudget} />
        <StatCard label="Spent" value={summary.totalSpent} color="destructive" />
        <StatCard label="Saved" value={summary.totalSaved} color="primary" />
        <StatCard label="Left" value={remainingBudget} color="primary" />
      </motion.div>

      <motion.div 
        className="space-y-4 pt-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-widest">
          <span className="text-muted-foreground opacity-60">PROGRESS</span>
          <span className="text-primary">{percentageUsed}%</span>
        </div>
        <Progress value={percentageUsed} className="h-2 bg-muted/20" indicatorClassName="bg-primary" />
        <p className="text-[10px] font-medium text-muted-foreground opacity-40 font-mono">
          ₹{summary.totalSpent} of ₹{monthlyBudget} used
        </p>
      </motion.div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  color = "white" 
}: { 
  label: string; 
  value: number; 
  color?: "white" | "primary" | "destructive" 
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
      }}
    >
      <Card className="border border-border bg-card rounded-xl">
        <CardContent className="p-4 space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground opacity-60">
            {label}
          </p>
          <p className={cn(
            "text-lg font-medium italic font-mono",
            color === "primary" ? "text-primary" : color === "destructive" ? "text-red-500" : "text-foreground"
          )}>
            ₹{value}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
