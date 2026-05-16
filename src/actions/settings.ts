"use server";

import dbConnect from "@/lib/db";
import Settings from "@/models/Settings";
import Expense from "@/models/Expense";
import { revalidatePath } from "next/cache";

export async function getSettings(userId: string) {
  if (!userId) return null;
  await dbConnect();
  const settings = await Settings.findOne({ userId }).lean();
  return settings ? JSON.parse(JSON.stringify(settings)) : null;
}

export async function saveSettings(userId: string, data: {
  monthlyBudget: number;
  currency?: string;
  theme?: string;
}) {
  if (!userId) throw new Error("Unauthorized");
  await dbConnect();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyBudget = Math.round(data.monthlyBudget / daysInMonth);

  const updatedSettings = await Settings.findOneAndUpdate(
    { userId },
    {
      userId,
      ...data,
      dailyBudget,
      currentMonth,
      theme: data.theme || 'dark',
      currency: data.currency || 'INR'
    },
    { upsert: true, new: true }
  );

  await generateMonthEntries(userId, currentMonth, dailyBudget);

  revalidatePath("/");
  return JSON.parse(JSON.stringify(updatedSettings));
}

export async function generateMonthEntries(userId: string, monthStr: string, dailyBudget: number) {
  await dbConnect();
  
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const entries = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    entries.push({
      userId,
      date,
      limit: dailyBudget,
      spent: 0,
      saved: 0,
      note: ''
    });
  }

  const operations = entries.map(entry => ({
    updateOne: {
      filter: { userId, date: entry.date },
      update: [
        { 
          $set: { 
            userId,
            limit: dailyBudget,
            spent: { $ifNull: ["$spent", 0] },
            note: { $ifNull: ["$note", ""] }
          } 
        },
        { 
          $set: { 
            saved: { 
              $cond: {
                if: { 
                  $and: [
                    { $eq: ["$spent", 0] },
                    { $eq: ["$note", ""] }
                  ] 
                },
                then: 0,
                else: { $subtract: ["$limit", "$spent"] }
              }
            } 
          } 
        }
      ],
      upsert: true
    }
  }));

  await Expense.bulkWrite(operations);
}

export async function updateTheme(userId: string, theme: string) {
  if (!userId) return;
  await dbConnect();
  await Settings.findOneAndUpdate({ userId }, { theme }, { upsert: true });
  revalidatePath("/");
}

export async function resetMonth(userId: string) {
  if (!userId) return;
  await dbConnect();
  const settings = await Settings.findOne({ userId });
  if (!settings) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const currentMonth = `${year}-${String(month).padStart(2, '0')}`;
  
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyBudget = Math.round(settings.monthlyBudget / daysInMonth);

  await Settings.findOneAndUpdate({ userId }, { dailyBudget, currentMonth });

  const entries = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    entries.push({
      userId,
      date,
      limit: dailyBudget,
      spent: 0,
      saved: 0,
      note: ''
    });
  }

  await Expense.deleteMany({ userId, date: { $regex: `^${currentMonth}` } });
  await Expense.insertMany(entries);
  
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/insights");
}
