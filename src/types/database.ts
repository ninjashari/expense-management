export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
  balance: number;
  credit_limit?: number;
  bill_generation_date?: number;
  payment_due_date?: number;
  status: 'active' | 'inactive' | 'closed';
  opening_date: Date;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: Date;
  updated_at: Date;
}

export interface Payee {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id?: string;
  payee_id?: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  description?: string;
  notes?: string;
  date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface TransferTransaction {
  id: string;
  user_id: string;
  from_account_id: string;
  to_account_id: string;
  from_transaction_id: string;
  to_transaction_id: string;
  amount: number;
  description?: string;
  date: Date;
  created_at: Date;
}

export interface TransactionWithDetails extends Transaction {
  account_name: string;
  category_name?: string;
  payee_name?: string;
}