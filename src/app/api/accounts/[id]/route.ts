import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').optional(),
  type: z.enum(['checking', 'savings', 'credit', 'cash', 'investment']).optional(),
  balance: z.union([z.number(), z.string().transform((val) => parseFloat(val))]).optional(),
  credit_limit: z.union([z.number(), z.null()]).optional(),
  bill_generation_date: z.union([z.number().min(1).max(31), z.null()]).optional(),
  payment_due_date: z.union([z.number().min(1).max(31), z.null()]).optional(),
  status: z.enum(['active', 'inactive', 'closed']).optional(),
  opening_date: z.string().optional(),
  currency: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await pool.query(
      'SELECT id, name, type, balance, credit_limit, bill_generation_date, payment_due_date, status, opening_date, currency, created_at, updated_at FROM accounts WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ account: result.rows[0] });
  } catch (error) {
    console.error('Get account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updateData = updateAccountSchema.parse(body);

    const { id } = await params;
    const existingAccount = await pool.query(
      'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (existingAccount.rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (updateData.name) {
      const nameExists = await pool.query(
        'SELECT id FROM accounts WHERE user_id = $1 AND name = $2 AND id != $3',
        [user.id, updateData.name, id]
      );

      if (nameExists.rows.length > 0) {
        return NextResponse.json(
          { error: 'Account with this name already exists' },
          { status: 400 }
        );
      }
    }

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (updateData.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(updateData.name);
    }
    if (updateData.type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      updateValues.push(updateData.type);
    }
    if (updateData.balance !== undefined) {
      updateFields.push(`balance = $${paramIndex++}`);
      updateValues.push(updateData.balance);
    }
    if (updateData.credit_limit !== undefined) {
      updateFields.push(`credit_limit = $${paramIndex++}`);
      updateValues.push(updateData.credit_limit);
    }
    if (updateData.bill_generation_date !== undefined) {
      updateFields.push(`bill_generation_date = $${paramIndex++}`);
      updateValues.push(updateData.bill_generation_date);
    }
    if (updateData.payment_due_date !== undefined) {
      updateFields.push(`payment_due_date = $${paramIndex++}`);
      updateValues.push(updateData.payment_due_date);
    }
    if (updateData.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(updateData.status);
    }
    if (updateData.opening_date !== undefined) {
      updateFields.push(`opening_date = $${paramIndex++}`);
      updateValues.push(updateData.opening_date);
    }
    if (updateData.currency !== undefined) {
      updateFields.push(`currency = $${paramIndex++}`);
      updateValues.push(updateData.currency);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id, user.id);

    const result = await pool.query(
      `UPDATE accounts SET ${updateFields.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING id, name, type, balance, credit_limit, bill_generation_date, payment_due_date, status, opening_date, currency, created_at, updated_at`,
      updateValues
    );

    return NextResponse.json({ account: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    
    console.error('Update account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existingAccount = await pool.query(
      'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (existingAccount.rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const hasTransactions = await pool.query(
      'SELECT id FROM transactions WHERE account_id = $1 LIMIT 1',
      [id]
    );

    if (hasTransactions.rows.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with existing transactions' },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM accounts WHERE id = $1 AND user_id = $2', [
      id,
      user.id,
    ]);

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}