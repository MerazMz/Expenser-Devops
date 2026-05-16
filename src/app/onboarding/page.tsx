"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { saveSettings } from "@/actions/settings";
import { toast } from "sonner";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { format } from "date-fns";

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dailyBudget = monthlyBudget ? Math.round(Number(monthlyBudget) / daysInMonth) : 0;

  const handleNext = () => {
    if (step === 1 && (!monthlyBudget || Number(monthlyBudget) <= 0)) {
      toast.error("Please enter a valid budget");
      return;
    }
    setStep(step + 1);
  };

  const handleFinish = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await saveSettings(user.uid, {
        monthlyBudget: Number(monthlyBudget),
      });
      toast.success("Setup complete!");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md space-y-8 text-center"
          >
            <div className="space-y-2">
              <h1 className="text-4xl font-bold italic lowercase text-primary">EXPENSER</h1>
              <p className="text-muted-foreground">Let&apos;s set up your {format(new Date(), "MMMM")} month budget.</p>
            </div>

            <Card className="border-none bg-card/50">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                    Monthly Budget (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold italic text-primary">₹</span>
                    <Input
                      type="number"
                      placeholder="6000"
                      value={monthlyBudget}
                      onChange={(e) => setMonthlyBudget(e.target.value)}
                      className="h-20 border-none bg-transparent pl-12 text-5xl font-bold italic focus-visible:ring-0"
                      autoFocus
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleNext}
              className="h-16 w-full rounded-2xl text-xl font-bold italic"
              size="lg"
            >
              CONTINUE <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md space-y-8 text-center"
          >
            <div className="space-y-2">
              <h1 className="text-4xl font-bold italic text-primary">DAILY LIMIT</h1>
              <p className="text-muted-foreground">Based on your monthly budget.</p>
            </div>

            <Card className="border-none bg-card/50">
              <CardContent className="flex flex-col items-center justify-center pt-10 pb-10 space-y-4">
                <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                  Your Daily Budget
                </span>
                <span className="text-7xl font-bold italic text-primary">₹{dailyBudget}</span>
                <p className="text-xs text-muted-foreground">
                  {daysInMonth} days in this month
                </p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Button
                onClick={handleFinish}
                disabled={isLoading}
                className="h-16 w-full rounded-2xl text-xl font-bold italic"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    GET STARTED <Check className="ml-2 h-6 w-6" />
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="text-muted-foreground"
              >
                Go Back
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
