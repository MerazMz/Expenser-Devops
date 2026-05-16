"use client";

import { useEffect } from "react";
import { getSettings } from "@/actions/settings";
import { getMonthExpenses } from "@/actions/expenses";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, Zap, LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { IExpense } from "@/types";
import { SavingsChart } from "@/components/insights/savings-chart";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

export default function InsightsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ["insights", user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const now = new Date();
      const currentMonth = format(now, "yyyy-MM");
      const [settings, expenses] = await Promise.all([
        getSettings(user.uid),
        getMonthExpenses(user.uid, currentMonth)
      ]);

      if (!settings) {
        router.push("/onboarding");
        return null;
      }

      const todayStr = format(now, "yyyy-MM-dd");
      const pastExpenses = expenses.filter((e: IExpense) => e.date < todayStr);
      const totalSpent = expenses.reduce((acc: number, e: IExpense) => acc + e.spent, 0);
      const daysInMonth = expenses.length;
      const currentDayOfMonth = now.getDate();
      const averageSpend = Math.round(totalSpent / currentDayOfMonth);
      const projectedSpent = averageSpend * daysInMonth;
      const isProjectedOver = projectedSpent > settings.monthlyBudget;
      const bestDay = [...pastExpenses].sort((a, b) => b.saved - a.saved)[0];
      const worstDay = [...pastExpenses].sort((a, b) => a.saved - b.saved)[0];
      const savingsData = pastExpenses.map((e: IExpense) => ({
        date: e.date,
        saved: e.saved
      }));

      return {
        averageSpend,
        projectedSpent,
        isProjectedOver,
        bestDay,
        worstDay,
        savingsData
      };
    },
    enabled: !!user && !authLoading,
    staleTime: 1000 * 60 * 5,
  });

  const loading = authLoading || queryLoading;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading || loading || !data) {
    return (
      <PageWrapper className="flex flex-col space-y-8 p-6 bg-background min-h-screen">
        <div className="space-y-3">
          <div className="h-10 w-48 bg-muted/20 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
          <div className="h-4 w-32 bg-muted/10 rounded relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 w-full bg-card/50 rounded-2xl border border-border relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
          <div className="h-32 w-full bg-card/50 rounded-2xl border border-border relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
        </div>

        <div className="h-64 w-full bg-card/50 rounded-2xl border border-border relative overflow-hidden">
          <div className="absolute inset-0 shimmer" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="flex flex-col space-y-8 p-6 bg-background min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-medium italic text-primary uppercase">Insights</h1>
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Analyze your spending
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InsightCard 
          label="Avg. Spend/Day" 
          value={`₹${data.averageSpend}`} 
          icon={Zap} 
          description="Based on this month"
        />
        <InsightCard 
          label="Projected End" 
          value={`₹${data.projectedSpent}`} 
          icon={Target} 
          description={data.isProjectedOver ? "Over budget" : "Within budget"}
          status={data.isProjectedOver ? "danger" : "success"}
        />
        {data.bestDay && (
          <InsightCard 
            label="Best Day" 
            value={`₹${data.bestDay.saved}`} 
            icon={TrendingUp} 
            description={format(new Date(data.bestDay.date), "dd MMM")}
            status="success"
          />
        )}
        {data.worstDay && (
          <InsightCard 
            label="Worst Day" 
            value={`₹${Math.abs(data.worstDay.saved)}`} 
            icon={TrendingDown} 
            description={format(new Date(data.worstDay.date), "dd MMM")}
            status={data.worstDay.saved < 0 ? "danger" : "neutral"}
          />
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-medium italic text-foreground uppercase tracking-wider">
          Trends
        </h2>
        <SavingsChart data={data.savingsData} />
      </div>
    </PageWrapper>
  );
}

function InsightCard({ 
  label, 
  value, 
  icon: Icon, 
  description, 
  status = "neutral" 
}: { 
  label: string; 
  value: string; 
  icon: LucideIcon; 
  description: string;
  status?: "success" | "danger" | "neutral";
}) {
  return (
    <Card className="border border-border bg-card">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <Icon className="h-4 w-4 text-primary opacity-50" />
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-medium italic text-foreground">{value}</p>
          <p className={cn(
            "text-[9px] font-medium uppercase tracking-widest",
            status === "success" ? "text-primary" : status === "danger" ? "text-red-500" : "text-muted-foreground"
          )}>
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
