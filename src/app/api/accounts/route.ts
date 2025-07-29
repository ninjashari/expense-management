import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['checking', 'savings', 'credit', 'cash', 'investment']),
  balance: z.number().default(0),
  credit_limit: z.number().optional(),
  bill_generation_date: z.number().min(1).max(31).optional(),
  payment_due_date: z.number().min(1).max(31).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      'SELECT id, name, type, balance, credit_limit, bill_generation_date, payment_due_date, created_at, updated_at FROM accounts WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    return NextResponse.json({ accounts: result.rows });
  } catch (error) {
    console.error('Get accounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, balance, credit_limit, bill_generation_date, payment_due_date } = createAccountSchema.parse(body);

    const existingAccount = await pool.query(
      'SELECT id FROM accounts WHERE user_id = $1 AND name = $2',
      [user.id, name]
    );

    if (existingAccount.rows.length > 0) {
      return NextResponse.json(
        { error: 'Account with this name already exists' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'INSERT INTO accounts (user_id, name, type, balance, credit_limit, bill_generation_date, payment_due_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, type, balance, credit_limit, bill_generation_date, payment_due_date, created_at, updated_at',
      [user.id, name, type, balance, credit_limit, bill_generation_date, payment_due_date]
    );

    return NextResponse.json({ account: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    
    console.error('Create account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}