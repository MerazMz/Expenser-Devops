"use server";

import dbConnect from "@/lib/db";
import Expense from "@/models/Expense";
import Settings from "@/models/Settings";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";

export async function getTodayExpense(userId: string) {
  if (!userId) return null;
  await dbConnect();
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  
  let expense = await Expense.findOne({ userId, date: today }).lean();
  
  if (!expense) {
    const settings = await Settings.findOne({ userId });
    if (settings) {
      expense = await Expense.findOneAndUpdate(
        { userId, date: today },
        { 
          userId,
          date: today, 
          limit: settings.dailyBudget, 
          spent: 0, 
          saved: settings.dailyBudget, 
          note: '' 
        },
        { upsert: true, new: true }
      ).lean();
    }
  }

  return expense ? JSON.parse(JSON.stringify(expense)) : null;
}

export async function saveTodayExpense(userId: string, spent: number, note?: string) {
  if (!userId) return null;
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  return saveExpense(userId, today, spent, note);
}

export async function saveExpense(userId: string, date: string, spent: number, note?: string) {
  if (!userId) throw new Error("Unauthorized");
  await dbConnect();
  
  const currentExpense = await Expense.findOne({ userId, date });
  const limit = currentExpense?.limit || 0;
  const saved = limit - spent;

  const expense = await Expense.findOneAndUpdate(
    { userId, date },
    { spent, saved, note: note || '' },
    { new: true }
  );

  revalidatePath("/");
  revalidatePath("/calendar");
  return JSON.parse(JSON.stringify(expense));
}

export async function getMonthExpenses(userId: string, monthStr: string) {
  if (!userId) return [];
  await dbConnect();
  const expenses = await Expense.find({
    userId,
    date: { $regex: new RegExp(`^${monthStr}`) }
  }).sort({ date: 1 }).lean();

  return JSON.parse(JSON.stringify(expenses));
}

export async function getMonthlySummary(userId: string, monthStr: string) {
  if (!userId) return { totalSpent: 0, totalSaved: 0, totalLimit: 0, totalLimitTillNow: 0 };
  await dbConnect();
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  const expenses = await Expense.find({
    userId,
    date: { $regex: new RegExp(`^${monthStr}`) }
  }).lean();

  const summary = expenses.reduce((acc, curr) => {
    acc.totalSpent += curr.spent || 0;
    
    const hasEntry = curr.spent > 0 || (curr.note && curr.note.trim() !== "");
    
    if (curr.date < todayStr && hasEntry) {
      acc.totalSaved += curr.saved || 0;
      acc.totalLimitTillNow += curr.limit || 0;
    }
    
    acc.totalLimit += curr.limit || 0;
    return acc;
  }, { totalSpent: 0, totalSaved: 0, totalLimit: 0, totalLimitTillNow: 0 });

  return summary;
}

export async function getExpenseByDate(userId: string, date: string) {
  if (!userId) return null;
  await dbConnect();
  const expense = await Expense.findOne({ userId, date }).lean();
  return expense ? JSON.parse(JSON.stringify(expense)) : null;
}

export async function getStreak(userId: string) {
  if (!userId) return 0;
  await dbConnect();
  
  // Get all expenses sorted by date descending
  const expenses = await Expense.find({ userId })
    .sort({ date: -1 })
    .lean();
    
  const todayStr = format(new Date(), "yyyy-MM-dd");
  let streak = 0;
  
  for (const exp of expenses) {
    // Only count days up to today
    if (exp.date > todayStr) continue;
    
    const hasData = exp.spent > 0 || (exp.note && exp.note.trim() !== "");
    
    if (hasData) {
      if (exp.saved >= 0) {
        streak++;
      } else {
        // Break at the first over-budget day
        break;
      }
    } else {
      // If no data and it's a past day, break the streak
      if (exp.date < todayStr) {
        break;
      }
      // If it's today and no data, just skip it (don't break, don't increment)
      continue;
    }
  }
  
  return streak;
}
