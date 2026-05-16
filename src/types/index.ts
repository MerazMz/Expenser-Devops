export interface ISettings {
  _id?: string;
  userId: string;
  monthlyBudget: number;
  dailyBudget: number;
  currency: string;
  currentMonth: string;
  theme: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IExpense {
  _id?: string;
  userId: string;
  date: string;
  limit: number;
  spent: number;
  saved: number;
  note: string;
  createdAt?: string;
  updatedAt?: string;
}
