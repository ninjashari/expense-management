import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const accountId = searchParams.get('accountId');
    const categoryId = searchParams.get('categoryId');
    const payeeId = searchParams.get('payeeId');
    const transactionType = searchParams.get('transactionType');

    // Build dynamic WHERE clause
    const conditions = ['t.user_id = $1'];
    const params: (string | number)[] = [user.id];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`t.date >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`t.date <= $${paramIndex++}`);
      params.push(endDate);
    }

    if (accountId) {
      conditions.push(`t.account_id = $${paramIndex++}`);
      params.push(accountId);
    }

    if (categoryId) {
      conditions.push(`t.category_id = $${paramIndex++}`);
      params.push(categoryId);
    }

    if (payeeId) {
      conditions.push(`t.payee_id = $${paramIndex++}`);
      params.push(payeeId);
    }

    if (transactionType) {
      conditions.push(`t.type = $${paramIndex++}`);
      params.push(transactionType);
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query(
      `SELECT 
        t.account_id,
        a.name as account_name,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount) ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(t.amount), 0) as net_amount,
        COUNT(*) as transaction_count
       FROM transactions t
       LEFT JOIN accounts a ON t.account_id = a.id
       WHERE ${whereClause}
       GROUP BY t.account_id, a.name
       ORDER BY net_amount DESC`,
      params
    );

    const accounts = result.rows.map(row => ({
      account_id: row.account_id,
      account_name: row.account_name,
      total_income: parseFloat(row.total_income),
      total_expenses: parseFloat(row.total_expenses),
      net_amount: parseFloat(row.net_amount),
      transaction_count: parseInt(row.transaction_count),
    }));

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Get account report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}