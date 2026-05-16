"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider, signInWithPopup } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Mail,
  Lock,
  User as UserIcon,
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { login, signup, syncGoogleUser, requestOTP, verifyOTP, resetPasswordWithOTP } from "@/actions/auth";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

type AuthStep = "welcome" | "login" | "signup" | "forgot" | "verify" | "reset";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<AuthStep>("welcome");
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(0);
  const [isWebView, setIsWebView] = useState(false);

  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();

  useEffect(() => {
    const checkWebView = () => {
      if (typeof window === "undefined") return false;
      const ua = navigator.userAgent || "";
      const isAndroid = /Android/i.test(ua);
      const isSafari = /Safari/i.test(ua);
      const hasVersion = /Version\//i.test(ua);
      const isWv = /wv/i.test(ua);
      const customId = ua.includes("EXPENSER_ANDROID_WEBVIEW");

      // In Android, standalone browsers always have "Safari" 
      // but integrated WebViews often have "Version/" or lack "Safari"
      return customId || (isAndroid && (hasVersion || !isSafari || isWv));
    };
    setIsWebView(checkWebView());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("expenser_email");
      const savedPass = localStorage.getItem("expenser_pass");
      if (savedEmail) setEmail(savedEmail);
      if (savedPass) setPassword(savedPass);
    }
  }, []);

  useEffect(() => {
    if (authUser && !authLoading) {
      router.push("/dashboard");
    }
  }, [authUser, authLoading, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Sync Google user with our MongoDB
      await syncGoogleUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });

      router.push("/dashboard");
    } catch (error) {
      toast.error("Google login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submission started for step:", step);
    setLoading(true);
    try {
      if (step === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }
        const res = await signup({ email, password, displayName });
        if (res.error) toast.error(res.error);
        else {
          toast.success("Account created!");
          router.push("/onboarding");
        }
      } else {
        const res = await login({ email, password });
        if (res.error) toast.error(res.error);
        else {
          // Save for pre-fill
          localStorage.setItem("expenser_email", email);
          localStorage.setItem("expenser_pass", password);
          
          toast.success("Welcome back!");
          router.push("/dashboard");
        }
      }
    } catch (err) {
      toast.error("Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await requestOTP(email);
      if (res.error) toast.error(res.error);
      else {
        toast.success("OTP sent to your email");
        setTimer(60);
        setStep("verify");
      }
    } catch (err) {
      toast.error("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length < 6) {
      toast.error("Please enter 6-digit OTP");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyOTP(email, otpString);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Code verified!");
        setStep("reset");
      }
    } catch (err) {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length < 6) {
      toast.error("Please enter 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await resetPasswordWithOTP({ email, otp: otpString, newPassword: password });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Password reset successfully!");
        setStep("login");
      }
    } catch (err) {
      toast.error("Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-[#c8f135]" />
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case "welcome":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm space-y-12"
          >
            <div className="text-center space-y-4">
              <h1 className="text-5xl font-black italic lowercase tracking-tighter text-[#c8f135]">expenser</h1>
              <p className="text-[8px] font-medium tracking-widest text-muted-foreground/80 opacity-50 lowercase">Personal Finance Redefined</p>
              {/* <p className="text-[10px] text-white/20 mt-4">
                Debug: {isWebView ? "WebView Detected" : "Browser Detected"}
              </p> */}
            </div>

            <div className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-10 space-y-10 shadow-2xl">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold text-white">Welcome Back</h2>
                <p className="text-xs text-muted-foreground">Sign in to sync your data</p>
              </div>
              <div className="space-y-4">
                {!isWebView && (
                  <Button
                    onClick={handleGoogleSignIn}
                    variant="outline"
                    className="h-16 w-full rounded-[2rem] border-white/10 bg-black hover:bg-white/5 text-white flex items-center justify-center space-x-3 transition-all"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span className="text-sm font-medium">Continue with Google</span>
                  </Button>
                )}

               {(!isWebView) && <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="flex-shrink mx-4 text-[10px] font-medium text-muted-foreground/30 uppercase tracking-[0.2em]">OR</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>}

                <Button
                  onClick={() => setStep("login")}
                  className="h-16 w-full rounded-[2rem] bg-[#c8f135] hover:bg-[#b8e125] text-black text-sm font-semibold shadow-xl shadow-[#c8f135]/10"
                >
                  Continue with Email
                </Button>
              </div>
            </div>

            <p className="text-center text-[10px] font-medium text-muted-foreground/40 leading-relaxed px-10">
              By continuing you agree to the <span className="text-[#c8f135]">minimalist terms</span>
            </p>
          </motion.div>
        );

      case "login":
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-sm space-y-10"
          >
            <button onClick={() => setStep("welcome")} className="p-2 hover:bg-white/5 rounded-full transition-all">
              <ArrowLeft className="h-6 w-6 text-white" />
            </button>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
              <p className="text-sm font-medium text-muted-foreground">Login to access your account</p>
            </div>

            <form onSubmit={handleEmailAuth} className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-8 space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                    <Input
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-black/40 border-white/5 focus:border-[#c8f135]/50 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 pl-12 pr-12 rounded-2xl bg-black/40 border-white/5 focus:border-[#c8f135]/50 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-[#c8f135]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="text-right">
                    <button type="button" onClick={() => setStep("forgot")} className="text-xs font-medium text-[#c8f135]">Forgot Password?</button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-16 w-full rounded-[2rem] bg-[#c8f135] hover:bg-[#b8e125] text-black text-sm font-semibold"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Login"}
              </Button>

              <p className="text-center text-xs font-medium text-muted-foreground">
                Don&apos;t have an account? <button type="button" onClick={() => setStep("signup")} className="text-[#c8f135]">Sign up</button>
              </p>
            </form>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-[10px] font-medium text-muted-foreground/30 uppercase tracking-[0.2em]">OR</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              className="h-16 w-full rounded-[2rem] border-white/10 bg-black hover:bg-white/5 text-white flex items-center justify-center space-x-3 transition-all"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="text-sm font-medium">Continue with Google</span>
            </Button>
          </motion.div>
        );

      case "signup":
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-sm space-y-10"
          >
            <button onClick={() => setStep("welcome")} className="p-2 hover:bg-white/5 rounded-full transition-all">
              <ArrowLeft className="h-6 w-6 text-white" />
            </button>

            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-bold text-white">Create Account</h2>
              <p className="text-sm font-medium text-muted-foreground">Create your account to get started</p>
            </div>

            <form onSubmit={handleEmailAuth} className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-8 space-y-8">
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                    <Input
                      placeholder="Enter your full name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-black/40 border-white/5 focus:border-[#c8f135]/50 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                    <Input
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-black/40 border-white/5 focus:border-[#c8f135]/50 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 pl-12 pr-12 rounded-2xl bg-black/40 border-white/5 focus:border-[#c8f135]/50 transition-all text-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-14 pl-12 pr-12 rounded-2xl bg-black/40 border-white/5 focus:border-[#c8f135]/50 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center space-x-2 text-[10px] font-medium text-[#c8f135]/60">
                    <ShieldCheck className="h-3 w-3" />
                    <span>At least 8 characters</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] font-medium text-[#c8f135]/60">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Include uppercase, lowercase, number</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-16 w-full rounded-[2rem] bg-[#c8f135] hover:bg-[#b8e125] text-black text-sm font-semibold"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign Up"}
                </Button>

                <p className="text-center text-xs font-medium text-muted-foreground">
                  Already have an account? <button type="button" onClick={() => setStep("login")} className="text-[#c8f135]">Login</button>
                </p>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="flex-shrink mx-4 text-[10px] font-medium text-muted-foreground/30 uppercase tracking-[0.2em]">OR</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                {!isWebView && (
                  <Button
                    onClick={handleGoogleSignIn}
                    variant="outline"
                    className="h-16 w-full rounded-[2rem] border-white/10 bg-black hover:bg-white/5 text-white flex items-center justify-center space-x-3 transition-all"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span className="text-sm font-medium">Continue with Google</span>
                  </Button>
                )}
              </div>
            </form>
          </motion.div>
        );

      case "forgot":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm space-y-10"
          >
            <button onClick={() => setStep("login")} className="p-2 hover:bg-white/5 rounded-full transition-all">
              <ArrowLeft className="h-6 w-6 text-white" />
            </button>

            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Reset Password</h2>
              <p className="text-sm font-medium text-muted-foreground px-10 leading-relaxed">Enter your email and we&apos;ll send you a reset link</p>
            </div>

            <div className="flex justify-center py-4">
              <div className="h-20 w-20 rounded-full bg-[#c8f135]/10 border border-[#c8f135]/20 flex items-center justify-center">
                <Mail className="h-10 w-10 text-[#c8f135]" />
              </div>
            </div>

            <form onSubmit={handleRequestOTP} className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-8 space-y-8">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                  <Input
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 pl-12 rounded-2xl bg-black/40 border-white/5 focus:border-[#c8f135]/50 transition-all text-sm"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-16 w-full rounded-[2rem] bg-[#c8f135] hover:bg-[#b8e125] text-black text-sm font-semibold"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Code"}
              </Button>
            </form>
          </motion.div>
        );

      case "verify":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm space-y-10"
          >
            <button onClick={() => setStep("forgot")} className="p-2 hover:bg-white/5 rounded-full transition-all">
              <ArrowLeft className="h-6 w-6 text-white" />
            </button>

            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Verify Code</h2>
              <p className="text-sm font-medium text-muted-foreground px-10 leading-relaxed">Enter the 6-digit code sent to your email</p>
            </div>

            <form onSubmit={handleVerifyOTP} className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-8 space-y-8">
              <div className="flex justify-between items-center gap-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onPaste={(e) => {
                      const data = e.clipboardData.getData("text").replace(/\D/g, "");
                      if (data.length >= 6) {
                        const newOtp = data.slice(0, 6).split("");
                        setOtp(newOtp);
                        const lastInput = document.getElementById("otp-5");
                        (lastInput as HTMLInputElement)?.focus();
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d?$/.test(val)) {
                        const newOtp = [...otp];
                        newOtp[idx] = val;
                        setOtp(newOtp);
                        if (val && idx < 5) {
                          const next = document.getElementById(`otp-${idx + 1}`);
                          (next as HTMLInputElement)?.focus();
                        }
                      }
                    }}
                    id={`otp-${idx}`}
                    className="w-12 h-14 bg-black border border-white/10 rounded-xl text-[#c8f135] text-xl font-bold text-center focus:border-[#c8f135] transition-all outline-none"
                  />
                ))}
              </div>

              <div className="space-y-8">
                <div className="text-center space-y-2">
                  <p className="text-xs font-medium text-muted-foreground opacity-60">Didn&apos;t receive the code?</p>
                  {timer > 0 ? (
                    <p className="text-xs font-bold text-[#c8f135]">Resend in {formatTime(timer)}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestOTP}
                      className="text-xs font-bold text-[#c8f135] hover:underline"
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-16 w-full rounded-[2rem] bg-[#c8f135] hover:bg-[#b8e125] text-black text-sm font-semibold"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify Code"}
                </Button>
              </div>
            </form>
          </motion.div>
        );

      case "reset":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm space-y-10"
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">New Password</h2>
              <p className="text-sm font-medium text-muted-foreground px-10 leading-relaxed">Set a secure password for your account</p>
            </div>

            <form onSubmit={handleResetPassword} className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-8 space-y-8">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground ml-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 pl-12 pr-12 rounded-2xl bg-black/40 border-white/5 focus:border-[#c8f135]/50 transition-all text-sm"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-14 pl-12 pr-12 rounded-2xl bg-black/40 border-white/5 focus:border-[#c8f135]/50 transition-all text-sm"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-16 w-full rounded-[2rem] bg-[#c8f135] hover:bg-[#b8e125] text-black text-sm font-semibold"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Reset Password"}
              </Button>

              <div className="bg-[#121212]/50 border border-white/5 rounded-2xl p-4 flex items-center space-x-4">
                <div className="p-2 rounded-full bg-[#c8f135]/10 border border-[#c8f135]/20">
                  <ShieldCheck className="h-4 w-4 text-[#c8f135]" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white">Your data is secure</p>
                  <p className="text-[10px] font-medium text-muted-foreground leading-tight">We never share your information with anyone.</p>
                </div>
              </div>
            </form>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <PageWrapper className="min-h-screen flex flex-col items-center justify-center bg-black px-6 py-12 overflow-x-hidden">
      <AnimatePresence mode="wait">
        <div key={step} className="w-full flex justify-center">
          {renderStep()}
        </div>
      </AnimatePresence>
    </PageWrapper>
  );
}
