"use client";

import { useState } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday, 
  getDay, 
  addMonths, 
  subMonths,
} from "date-fns";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getMonthExpenses, saveExpense, getMonthlySummary } from "@/actions/expenses";
import { getSettings } from "@/actions/settings";
import { MonthlySummary } from "@/components/dashboard/monthly-summary";
import { cn } from "@/lib/utils";
import { IExpense } from "@/types";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

import { useQuery, useQueryClient } from "@tanstack/react-query";


export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<IExpense | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editSpent, setEditSpent] = useState("");
  const [editNote, setEditNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const monthStr = format(currentDate, "yyyy-MM");

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ["calendar", user?.uid, monthStr],
    queryFn: async () => {
      if (!user) return null;
      const [expenses, summary, settings] = await Promise.all([
        getMonthExpenses(user.uid, monthStr),
        getMonthlySummary(user.uid, monthStr),
        getSettings(user.uid)
      ]);
      return { expenses, summary, settings };
    },
    enabled: !!user && !authLoading,
    staleTime: 1000 * 60 * 10, // 10 mins
  });

  const loading = authLoading || queryLoading;
  const expenses = data?.expenses || [];
  const summary = data?.summary || null;
  const settings = data?.settings || null;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Adjust for Monday start (0: Sun, 1: Mon, ..., 6: Sat)
  // We want 0 to be Monday.
  const startDayIdx = (getDay(monthStart) + 6) % 7;

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const expense = expenses.find((e: IExpense) => e.date === dateStr);
    if (expense) {
      setSelectedDay(expense);
      const hasData = expense.spent > 0 || (expense.note && expense.note.trim() !== "");
      setEditSpent(hasData ? expense.spent.toString() : "");
      setEditNote(expense.note || "");
      setIsSheetOpen(true);
    }
  };

  const handleSave = async () => {
    if (!selectedDay || !user) return;
    setIsSaving(true);
    try {
      await saveExpense(user.uid, selectedDay.date, Number(editSpent), editNote);
      toast.success("Updated successfully");
      setIsSheetOpen(false);
      queryClient.invalidateQueries({ queryKey: ["calendar", user.uid, monthStr] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user.uid] });
      queryClient.invalidateQueries({ queryKey: ["insights", user.uid] });
    } catch {
      toast.error("Failed to update");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || loading || !data) {
    return (
      <PageWrapper className="flex flex-col min-h-screen bg-background px-6 pt-4 pb-24 space-y-8">
        <div className="flex justify-center">
          <div className="h-8 w-40 bg-muted/20 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square w-full bg-card/40 rounded-full border border-border/50 relative overflow-hidden">
              <div className="absolute inset-0 shimmer" />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="h-24 w-full bg-card/50 rounded-2xl border border-border relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="flex flex-col min-h-screen bg-background px-6 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-center mb-8 relative">
        <div className="flex items-center space-x-6">
          <ChevronLeft 
            className="w-5 h-5 text-foreground opacity-60 cursor-pointer" 
            onClick={handlePrevMonth} 
          />
          <h1 className="text-xl font-medium text-primary uppercase tracking-widest">
            {format(currentDate, "MMMM yyyy")}
          </h1>
          <ChevronRight 
            className="w-5 h-5 text-primary cursor-pointer" 
            onClick={handleNextMonth} 
          />
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 mb-4 border-b border-border pb-2">
        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
          <div key={day} className="text-center text-[10px] font-bold text-muted-foreground opacity-40">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-12 pb-10">
        {/* Padding */}
        {Array.from({ length: startDayIdx }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const expense = expenses.find((e: IExpense) => e.date === dateStr);
          const isTodayDay = isToday(day);
          const isFuture = day > new Date();

          return (
            <div 
              key={dateStr}
              onClick={() => handleDayClick(day)}
              className={cn(
                "flex flex-col items-center justify-center space-y-1.5 cursor-pointer transition-all active:scale-90 min-h-[50px]",
                isTodayDay && "rounded-xl border border-primary py-2 px-1"
              )}
            >
              <span className="text-base font-medium text-foreground">{format(day, "d")}</span>
              <span className={cn(
                "text-[10px] font-mono",
                !expense || isFuture || expense.spent === 0 ? "text-muted-foreground opacity-20" :
                expense.saved >= 0 ? "text-primary" : "text-red-500"
              )}>
                {!expense || isFuture || expense.spent === 0 ? "-" : expense.saved}
              </span>
            </div>
          );
        })}
      </div>

      {/* Monthly Summary (Only for past months) */}
      {summary && settings && monthStr < format(new Date(), "yyyy-MM") && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-6 ml-1">
            {format(currentDate, "MMMM")} Summary
          </p>
          <MonthlySummary 
            summary={summary} 
            monthlyBudget={settings.monthlyBudget} 
          />
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 flex items-center justify-center space-x-6 pt-10 pb-4">
        <LegendItem color="bg-primary" label="Saved" />
        <LegendItem color="bg-red-500" label="Overspent" />
        <LegendItem color="bg-muted" label="No Entry" />
      </div>

      {/* Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[2.5rem] border-t-0 bg-card px-8 pt-6 pb-10">
          {selectedDay && (
            <div className="space-y-8">
              <div className="space-y-1">
                <h2 className="text-2xl font-medium text-primary">
                  {format(new Date(selectedDay.date), "d MMM yyyy")}
                </h2>
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  EDIT DAILY RECORD
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground opacity-60">
                    Amount Spent
                  </p>
                  <Input
                    type="number"
                    value={editSpent}
                    onChange={(e) => setEditSpent(e.target.value)}
                    className="h-14 border-border bg-background rounded-xl px-6 text-xl font-bold font-mono italic text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground opacity-60">
                    Note
                  </p>
                  <Input
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="What did you buy?"
                    className="h-14 border-border bg-background rounded-xl px-6 text-sm text-foreground"
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-14 w-full rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest hover:opacity-90 active:scale-[0.98]"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : "UPDATE RECORD"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center space-x-1.5">
      <div className={cn("h-2 w-2 rounded-full", color)} />
      <span className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wider">{label}</span>
    </div>
  );
}
