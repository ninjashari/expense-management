import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      'SELECT name, type, balance FROM accounts WHERE user_id = $1 ORDER BY balance DESC LIMIT 4',
      [user.id]
    );

    const accounts = result.rows.map(row => ({
      ...row,
      balance: parseFloat(row.balance)
    }));

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Get dashboard accounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}