"use client";

import Image from "next/image";

import { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSettings, saveSettings, resetMonth, updateTheme } from "@/actions/settings";
import { logout } from "@/actions/auth";
import { getMonthExpenses } from "@/actions/expenses";
import { exportToExcel } from "@/lib/export";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
  Download,
  RotateCcw,
  Moon,
  Sun,
  Save,
  ChevronRight,
  Database,
  ShieldCheck,
  Loader2,
  LogOut
} from "lucide-react";
import { format } from "date-fns";
import { ISettings } from "@/types";
import { auth, signOut } from "@/lib/firebase";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<ISettings | null>(null);
  const [budget, setBudget] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      async function loadData() {
        const data = await getSettings(user!.uid);
        setSettings(data);
        if (data) setBudget(data.monthlyBudget.toString());
      }
      loadData();
    }
  }, [user, authLoading, router]);

  const handleSaveBudget = async () => {
    if (!user || !budget || Number(budget) <= 0) {
      toast.error("Invalid budget");
      return;
    }
    setIsLoading(true);
    try {
      const updated = await saveSettings(user.uid, { monthlyBudget: Number(budget) });
      setSettings(updated);
      toast.success("Budget updated!");
    } catch {
      toast.error("Failed to update");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!settings || !user) return;
    const now = new Date();
    const currentMonth = format(now, "yyyy-MM");
    const expenses = await getMonthExpenses(user.uid, currentMonth);
    exportToExcel(expenses, currentMonth, settings.monthlyBudget);
    toast.success("Exporting to Excel...");
  };

  const handleReset = async () => {
    if (!user) return;
    setIsResetting(true);
    try {
      await resetMonth(user.uid);
      toast.success("Month reset successfully");
      setIsResetDialogOpen(false);
    } catch {
      toast.error("Failed to reset month");
    } finally {
      setIsResetting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await Promise.all([
        signOut(auth),
        logout()
      ]);
      router.push("/login");
    } catch {
      toast.error("Sign out failed");
    }
  };

  if (authLoading || !settings) {
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

        <div className="h-20 w-full bg-card/50 rounded-2xl border border-border relative overflow-hidden">
          <div className="absolute inset-0 shimmer" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 w-full bg-card/30 rounded-2xl border border-border/40 relative overflow-hidden">
              <div className="absolute inset-0 shimmer" />
            </div>
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="flex flex-col space-y-8 p-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-medium italic text-primary uppercase">Settings</h1>
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Preferences & Data
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* User Profile Info */}
        <Card className="flex flex-row items-center border border-border bg-card">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full overflow-hidden border border-border">
              {user?.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt="Profile"
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase italic">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0)}
                </div>
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium  italic text-foreground">{user?.displayName}</p>
              <p className="text-[10px] lowercase font-medium text-muted-foreground opacity-60">
                {user?.email}
              </p>
            </div>
          </CardContent>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-12 w-12 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </Card>

        {/* Budget Section */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground ml-2">Budgeting</h2>
          <Card className="border border-border bg-card">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium
                   italic text-foreground">Monthly Budget</p>
                  <p className="text-xs text-muted-foreground">Current: ₹{settings.monthlyBudget}</p>
                </div>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-primary">₹</span>
                  <Input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="bg-muted/20 border-none h-10 pl-7 text-right font-medium italic text-foreground"
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveBudget}
                disabled={isLoading}
                className="w-full h-12 rounded-xl text-xs font-medium uppercase tracking-widest bg-primary text-primary-foreground"
              >
                {isLoading ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Update Budget</>}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Preferences Section */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground ml-2">Preferences</h2>
          <Card className="border border-border bg-card divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-muted/20 text-primary">
                  {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </div>
                <span className="text-sm font-medium italic text-foreground">Dark Mode</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newTheme = theme === 'dark' ? 'light' : 'dark';
                  setTheme(newTheme);
                  if (user) updateTheme(user.uid, newTheme);
                }}
                className="bg-muted/20 hover:bg-muted/40 rounded-full px-4 text-[10px] uppercase font-medium text-foreground"
              >
                {theme === 'dark' ? 'ENABLED' : 'DISABLED'}
              </Button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-muted/20 text-primary">
                  <Database className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium italic text-foreground">Currency</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">INR (₹)</span>
            </div>
          </Card>
        </section>

        {/* Data Management Section */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground ml-2">Data & Export</h2>
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="outline"
              onClick={handleExport}
              className="h-14 justify-start px-6 rounded-2xl border-border bg-card hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <Download className="mr-4 h-5 w-5" />
              <div className="text-left">
                <p className="text-sm font-medium italic text-foreground">Export to Excel</p>
                <p className="text-[10px] font-medium opacity-50">Monthly summary sheet</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 opacity-30" />
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsResetDialogOpen(true)}
              className="h-14 justify-start px-6 rounded-2xl border-border bg-card hover:bg-red-500/10 hover:text-red-500 transition-all"
            >
              <RotateCcw className="mr-4 h-5 w-5" />
              <div className="text-left">
                <p className="text-sm font-medium italic text-foreground">Reset Current Month</p>
                <p className="text-[10px] font-medium opacity-50">Regenerate all daily entries</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 opacity-30" />
            </Button>
          </div>
        </section>

        {/* About Section */}
        <div className="pt-8 text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-primary/50">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-medium uppercase tracking-widest">v1.0.0 Production Ready</span>
          </div>
          <p className="text-[10px] text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
            Data is securely linked to your Google Account.
          </p>
        </div>
      </div>

      <Dialog
        open={isResetDialogOpen}
        onOpenChange={(open) => {
          setIsResetDialogOpen(open);
          if (!open) setConfirmText("");
        }}
      >
        <DialogContent className="rounded-[2rem] border-border bg-card p-8">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-medium italic text-foreground uppercase">
              Reset Month?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              This will <span className="text-foreground font-medium">PERMANENTLY CLEAR</span> all spending and notes for the current month. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground opacity-60">
              Type <span className="text-foreground">CONFIRM</span> to proceed
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CONFIRM"
              className="h-12 border-border bg-background rounded-xl px-4 font-mono font-bold tracking-widest text-center"
            />
          </div>

          <DialogFooter className="flex-row gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsResetDialogOpen(false)}
              className="flex-1 h-12 rounded-xl text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReset}
              disabled={isResetting || confirmText !== "CONFIRM"}
              className="flex-1 h-12 rounded-xl bg-red-500 text-white text-[10px] font-medium uppercase tracking-widest hover:bg-red-600 transition-colors disabled:opacity-20"
            >
              {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
