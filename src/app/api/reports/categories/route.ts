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
    const conditions = ['t.user_id = $1', 't.category_id IS NOT NULL'];
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

    // Get total amount for percentage calculation
    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(ABS(t.amount)), 0) as total_amount
       FROM transactions t
       WHERE ${whereClause}`,
      params
    );

    const totalAmount = parseFloat(totalResult.rows[0].total_amount) || 0;

    // Get category breakdown
    const result = await pool.query(
      `SELECT 
        t.category_id,
        c.name as category_name,
        c.color as category_color,
        COALESCE(SUM(ABS(t.amount)), 0) as total_amount,
        COUNT(*) as transaction_count
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE ${whereClause}
       GROUP BY t.category_id, c.name, c.color
       ORDER BY total_amount DESC`,
      params
    );

    const categories = result.rows.map(row => ({
      category_id: row.category_id,
      category_name: row.category_name,
      category_color: row.category_color,
      total_amount: parseFloat(row.total_amount),
      transaction_count: parseInt(row.transaction_count),
      percentage: totalAmount > 0 ? (parseFloat(row.total_amount) / totalAmount) * 100 : 0,
    }));

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get category report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}