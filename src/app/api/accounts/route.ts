import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['checking', 'savings', 'credit', 'cash', 'investment']),
  balance: z.union([z.number(), z.string().transform((val) => parseFloat(val))]).default(0),
  credit_limit: z.union([z.number(), z.null()]).optional(),
  bill_generation_date: z.union([z.number().min(1).max(31), z.null()]).optional(),
  payment_due_date: z.union([z.number().min(1).max(31), z.null()]).optional(),
  status: z.enum(['active', 'inactive', 'closed']).default('active'),
  opening_date: z.string().optional(),
  currency: z.string().default('INR'),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      'SELECT id, name, type, balance, credit_limit, bill_generation_date, payment_due_date, status, opening_date, currency, created_at, updated_at FROM accounts WHERE user_id = $1 ORDER BY created_at DESC',
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
    const { name, type, balance, credit_limit, bill_generation_date, payment_due_date, status, opening_date, currency } = createAccountSchema.parse(body);

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
      'INSERT INTO accounts (user_id, name, type, balance, credit_limit, bill_generation_date, payment_due_date, status, opening_date, currency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, name, type, balance, credit_limit, bill_generation_date, payment_due_date, status, opening_date, currency, created_at, updated_at',
      [user.id, name, type, balance, credit_limit, bill_generation_date, payment_due_date, status, opening_date || new Date().toISOString().split('T')[0], currency]
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