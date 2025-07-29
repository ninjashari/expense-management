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
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount) ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(t.amount), 0) as net_amount,
        COUNT(*) as transaction_count
       FROM transactions t
       WHERE ${whereClause}`,
      params
    );

    const summary = {
      total_income: parseFloat(result.rows[0].total_income) || 0,
      total_expenses: parseFloat(result.rows[0].total_expenses) || 0,
      net_amount: parseFloat(result.rows[0].net_amount) || 0,
      transaction_count: parseInt(result.rows[0].transaction_count) || 0,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Get report summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}