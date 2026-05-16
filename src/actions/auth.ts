"use server";

import dbConnect from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const ALLOWED_DOMAINS = ["@gmail.com", "@lpu.in", "@yahoo.com", "@outlook.com"];

export async function signup(formData: any) {
  try {
    const { email, password, displayName } = formData;
    if (!email || !password) return { error: "Missing fields" };

    const isAllowed = ALLOWED_DOMAINS.some(domain => email.toLowerCase().endsWith(domain));
    if (!isAllowed) {
      return { error: `Signup allowed only for: ${ALLOWED_DOMAINS.join(", ")}` };
    }

    await dbConnect();

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      if (user.password) {
        return { error: "Account already exists. Please login." };
      }
      
      // User exists (Google) but has no password. Let's add it.
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      // We don't strictly need to change 'provider' if we want to support both, 
      // but let's make it clear it's now a full account.
      await user.save();
    } else {
      // New user
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await User.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        displayName,
        provider: "email"
      });
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
    
    (await cookies()).set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return { success: true, user: { uid: user._id.toString(), email: user.email, displayName: user.displayName } };
  } catch (error: any) {
    console.error("Signup error:", error);
    return { error: error.message || "Internal server error" };
  }
}

export async function syncGoogleUser(userData: any) {
  try {
    const { email, uid, displayName, photoURL } = userData;
    if (!email) return { error: "Missing email" };

    await dbConnect();

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = await User.create({
        email: email.toLowerCase(),
        displayName,
        photoURL,
        provider: "google",
      });
    } else {
      // User exists with email/password or google. 
      // Just update photo/name if missing
      if (!user.photoURL && photoURL) user.photoURL = photoURL;
      if (!user.displayName && displayName) user.displayName = displayName;
      await user.save();
    }

    // Create JWT for Google user to unify session
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
    
    (await cookies()).set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return { success: true, user: { uid: user._id.toString(), email: user.email, displayName: user.displayName } };
  } catch (error: any) {
    console.error("Sync Google User error:", error);
    return { error: error.message };
  }
}

export async function login(formData: any) {
  try {
    const { email, password } = formData;
    if (!email || !password) return { error: "Missing fields" };

    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.password) return { error: "Invalid credentials" };

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return { error: "Invalid credentials" };

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });

    (await cookies()).set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return { success: true, user: { uid: user._id.toString(), email: user.email, displayName: user.displayName } };
  } catch (error: any) {
    console.error("Login error:", error);
    return { error: error.message || "Internal server error" };
  }
}

export async function requestOTP(email: string) {
  try {
    if (!email) return { error: "Email is required" };

    await dbConnect();
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return { error: "No account found with this email" };

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetOTP = otp;
    user.resetOTPExpires = expiry;
    await user.save();

    // Send via Brevo
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      console.warn("BREVO_API_KEY not found. OTP is:", otp); // Fallback for dev
      return { success: true, debug: true }; // Allow progress in dev
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { 
          name: process.env.BREVO_SENDER_NAME || "Expenser", 
          email: process.env.BREVO_SENDER_EMAIL || "noreply@expenser.com" 
        },
        to: [{ email: user.email }],
        subject: "Password Reset OTP - Expenser",
        htmlContent: `
          <div style="font-family: sans-serif; padding: 20px; background: #000; color: #fff; border-radius: 20px; text-align: center;">
            <h1 style="color: #c8f135; font-style: italic;">EXPENSER</h1>
            <p>Your password reset code is:</p>
            <h2 style="font-size: 32px; letter-spacing: 5px; color: #c8f135;">${otp}</h2>
            <p style="color: #666; font-size: 12px;">This code expires in 10 minutes.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Brevo Error:", error);
      return { error: "Failed to send email" };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Request OTP error:", error);
    return { error: error.message };
  }
}

export async function verifyOTP(email: string, otp: string) {
  try {
    if (!email || !otp) return { error: "Missing fields" };

    await dbConnect();
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      resetOTP: otp,
      resetOTPExpires: { $gt: new Date() }
    });

    if (!user) return { error: "Invalid or expired OTP" };

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function resetPasswordWithOTP(formData: any) {
  try {
    const { email, otp, newPassword } = formData;
    if (!email || !otp || !newPassword) return { error: "Missing fields" };

    await dbConnect();
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      resetOTP: otp,
      resetOTPExpires: { $gt: new Date() }
    });

    if (!user) return { error: "Invalid or expired OTP" };

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;
    await user.save();

    return { success: true };
  } catch (error: any) {
    console.error("Reset Password error:", error);
    return { error: error.message };
  }
}

export async function logout() {
  (await cookies()).delete("token");
  return { success: true };
}

export async function getSession() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    await dbConnect();
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return null;
    return { uid: user._id.toString(), email: user.email, displayName: user.displayName, photoURL: user.photoURL };
  } catch {
    return null;
  }
}
