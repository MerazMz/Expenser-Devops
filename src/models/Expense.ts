import { Schema, model, models } from 'mongoose';

const ExpenseSchema = new Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  limit: { type: Number, required: true },
  spent: { type: Number, default: 0 },
  saved: { type: Number, default: 0 },
  note: { type: String, default: '' },
}, { timestamps: true });

ExpenseSchema.index({ userId: 1, date: 1 }, { unique: true });

const Expense = models.Expense || model('Expense', ExpenseSchema);

export default Expense;
