import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total balance across all accounts
    const balanceResult = await pool.query(
      'SELECT SUM(balance) as total_balance FROM accounts WHERE user_id = $1',
      [user.id]
    );

    // Get accounts count
    const accountsResult = await pool.query(
      'SELECT COUNT(*) as accounts_count FROM accounts WHERE user_id = $1',
      [user.id]
    );

    // Get current month's income and expenses
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const incomeResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as monthly_income 
       FROM transactions 
       WHERE user_id = $1 AND type = 'income' 
       AND date >= $2 AND date <= $3`,
      [user.id, startOfMonth, endOfMonth]
    );

    const expenseResult = await pool.query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as monthly_expenses 
       FROM transactions 
       WHERE user_id = $1 AND type = 'expense' 
       AND date >= $2 AND date <= $3`,
      [user.id, startOfMonth, endOfMonth]
    );

    // Get recent transactions with account and category details
    const recentTransactionsResult = await pool.query(
      `SELECT t.id, t.amount, t.type, t.description, t.date,
              a.name as account_name,
              c.name as category_name,
              p.name as payee_name
       FROM transactions t
       LEFT JOIN accounts a ON t.account_id = a.id
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN payees p ON t.payee_id = p.id
       WHERE t.user_id = $1
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT 5`,
      [user.id]
    );

    const stats = {
      totalBalance: parseFloat(balanceResult.rows[0]?.total_balance || '0'),
      accountsCount: parseInt(accountsResult.rows[0]?.accounts_count || '0'),
      monthlyIncome: parseFloat(incomeResult.rows[0]?.monthly_income || '0'),
      monthlyExpenses: parseFloat(expenseResult.rows[0]?.monthly_expenses || '0'),
      recentTransactions: recentTransactionsResult.rows.map(row => ({
        ...row,
        amount: parseFloat(row.amount),
        date: row.date
      }))
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}