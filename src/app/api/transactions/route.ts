import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const createTransactionSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  category_id: z.string().uuid('Invalid category ID').optional(),
  payee_id: z.string().uuid('Invalid payee ID').optional(),
  amount: z.union([z.number(), z.string().transform((val) => parseFloat(val))]),
  type: z.enum(['deposit', 'withdrawal', 'transfer']),
  description: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),
  // For transfers
  to_account_id: z.string().uuid('Invalid destination account ID').optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Get transactions with related data
    const result = await pool.query(
      `SELECT 
        t.id, t.amount, t.type, t.description, t.notes, t.date, t.created_at, t.updated_at,
        t.account_id, t.category_id, t.payee_id,
        a.name as account_name, a.currency,
        c.name as category_name, c.color as category_color,
        p.name as payee_name,
        tt.to_account_id, ta.name as to_account_name
       FROM transactions t
       LEFT JOIN accounts a ON t.account_id = a.id
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN payees p ON t.payee_id = p.id
       LEFT JOIN transfer_transactions tt ON t.id = tt.from_transaction_id
       LEFT JOIN accounts ta ON tt.to_account_id = ta.id
       WHERE t.user_id = $1
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user.id, limit, offset]
    );

    // Get total count for pagination
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM transactions WHERE user_id = $1',
      [user.id]
    );

    const transactions = result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount)
    }));

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
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
    const { 
      account_id, 
      category_id, 
      payee_id, 
      amount, 
      type, 
      description, 
      notes, 
      date,
      to_account_id
    } = createTransactionSchema.parse(body);

    await pool.query('BEGIN');

    try {
      // For transfers, validate accounts and ensure they're different
      if (type === 'transfer') {
        if (!to_account_id) {
          throw new Error('Destination account is required for transfers');
        }
        if (account_id === to_account_id) {
          throw new Error('Source and destination accounts must be different');
        }

        // Verify both accounts belong to the user
        const accountsCheck = await pool.query(
          'SELECT id FROM accounts WHERE id IN ($1, $2) AND user_id = $3',
          [account_id, to_account_id, user.id]
        );

        if (accountsCheck.rows.length !== 2) {
          throw new Error('One or both accounts not found');
        }
      } else {
        // Verify account belongs to user for non-transfer transactions
        const accountCheck = await pool.query(
          'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
          [account_id, user.id]
        );

        if (accountCheck.rows.length === 0) {
          throw new Error('Account not found');
        }
      }

      if (type === 'transfer') {
        // Create two transactions for transfer
        const fromTransactionResult = await pool.query(
          `INSERT INTO transactions (user_id, account_id, amount, type, description, notes, date)
           VALUES ($1, $2, $3, 'expense', $4, $5, $6)
           RETURNING id, amount, type, description, notes, date, created_at, updated_at`,
          [user.id, account_id, -Math.abs(amount), description || 'Transfer out', notes, date]
        );

        const toTransactionResult = await pool.query(
          `INSERT INTO transactions (user_id, account_id, amount, type, description, notes, date)
           VALUES ($1, $2, $3, 'income', $4, $5, $6)
           RETURNING id, amount, type, description, notes, date, created_at, updated_at`,
          [user.id, to_account_id, Math.abs(amount), description || 'Transfer in', notes, date]
        );

        // Create transfer link
        await pool.query(
          `INSERT INTO transfer_transactions (user_id, from_account_id, to_account_id, from_transaction_id, to_transaction_id, amount, description, date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [user.id, account_id, to_account_id, fromTransactionResult.rows[0].id, toTransactionResult.rows[0].id, Math.abs(amount), description, date]
        );

        // Update account balances
        await pool.query(
          'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
          [Math.abs(amount), account_id]
        );
        await pool.query(
          'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
          [Math.abs(amount), to_account_id]
        );

        await pool.query('COMMIT');
        return NextResponse.json({ 
          transaction: fromTransactionResult.rows[0],
          transfer_info: {
            from_account: account_id,
            to_account: to_account_id,
            linked_transaction: toTransactionResult.rows[0].id
          }
        }, { status: 201 });

      } else {
        // Regular deposit or withdrawal
        const transactionAmount = type === 'deposit' ? Math.abs(amount) : -Math.abs(amount);
        const transactionType = type === 'deposit' ? 'income' : 'expense';

        const result = await pool.query(
          `INSERT INTO transactions (user_id, account_id, category_id, payee_id, amount, type, description, notes, date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, amount, type, description, notes, date, created_at, updated_at`,
          [user.id, account_id, category_id, payee_id, transactionAmount, transactionType, description, notes, date]
        );

        // Update account balance
        await pool.query(
          'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
          [transactionAmount, account_id]
        );

        await pool.query('COMMIT');
        return NextResponse.json({ transaction: result.rows[0] }, { status: 201 });
      }

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    
    console.error('Create transaction error:', error);
    return NextResponse.json({ 
      error: typeof error === 'object' && error !== null && 'message' in error 
        ? (error as Error).message 
        : 'Internal server error' 
    }, { status: 500 });
  }
}