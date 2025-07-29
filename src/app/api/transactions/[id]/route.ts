import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const updateTransactionSchema = z.object({
  account_id: z.string().uuid('Invalid account ID').optional(),
  category_id: z.string().uuid('Invalid category ID').optional().nullable(),
  payee_id: z.string().uuid('Invalid payee ID').optional().nullable(),
  amount: z.union([z.number(), z.string().transform((val) => parseFloat(val))]).optional(),
  type: z.enum(['deposit', 'withdrawal', 'transfer']).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date format').optional(),
  to_account_id: z.string().uuid('Invalid destination account ID').optional().nullable(),
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
       WHERE t.id = $1 AND t.user_id = $2`,
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const transaction = {
      ...result.rows[0],
      amount: parseFloat(result.rows[0].amount)
    };

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
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
    const updateData = updateTransactionSchema.parse(body);

    const { id } = await params;
    
    // Check if transaction exists and belongs to user
    const existingTransaction = await pool.query(
      'SELECT id, type FROM transactions WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (existingTransaction.rows.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Check if this is a transfer transaction (has linked transactions)
    const transferCheck = await pool.query(
      'SELECT from_transaction_id, to_transaction_id FROM transfer_transactions WHERE from_transaction_id = $1 OR to_transaction_id = $1',
      [id]
    );

    if (transferCheck.rows.length > 0) {
      return NextResponse.json({ 
        error: 'Transfer transactions cannot be edited. Please delete and create a new one.' 
      }, { status: 400 });
    }

    await pool.query('BEGIN');

    try {
      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (updateData.account_id !== undefined) {
        updateFields.push(`account_id = $${paramIndex++}`);
        updateValues.push(updateData.account_id);
      }

      if (updateData.category_id !== undefined) {
        updateFields.push(`category_id = $${paramIndex++}`);
        updateValues.push(updateData.category_id);
      }

      if (updateData.payee_id !== undefined) {
        updateFields.push(`payee_id = $${paramIndex++}`);
        updateValues.push(updateData.payee_id);
      }

      if (updateData.amount !== undefined) {
        const transactionType = updateData.type || existingTransaction.rows[0].type;
        const transactionAmount = transactionType === 'income' ? Math.abs(updateData.amount) : -Math.abs(updateData.amount);
        updateFields.push(`amount = $${paramIndex++}`);
        updateValues.push(transactionAmount);
      }

      if (updateData.type !== undefined) {
        const amount = updateData.amount !== undefined ? updateData.amount : Math.abs(parseFloat(existingTransaction.rows[0].amount));
        const transactionAmount = updateData.type === 'deposit' ? Math.abs(amount) : -Math.abs(amount);
        const transactionType = updateData.type === 'deposit' ? 'income' : 'expense';
        
        updateFields.push(`type = $${paramIndex++}`);
        updateValues.push(transactionType);
        
        if (updateData.amount === undefined) {
          updateFields.push(`amount = $${paramIndex++}`);
          updateValues.push(transactionAmount);
        }
      }

      if (updateData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(updateData.description);
      }

      if (updateData.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        updateValues.push(updateData.notes);
      }

      if (updateData.date !== undefined) {
        updateFields.push(`date = $${paramIndex++}`);
        updateValues.push(updateData.date);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id, user.id);

      const result = await pool.query(
        `UPDATE transactions SET ${updateFields.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} 
         RETURNING id, amount, type, description, notes, date, created_at, updated_at`,
        updateValues
      );

      await pool.query('COMMIT');
      return NextResponse.json({ transaction: result.rows[0] });

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
    
    console.error('Update transaction error:', error);
    return NextResponse.json({ 
      error: typeof error === 'object' && error !== null && 'message' in error 
        ? (error as Error).message 
        : 'Internal server error' 
    }, { status: 500 });
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
    
    // Check if transaction exists and belongs to user
    const existingTransaction = await pool.query(
      'SELECT id, amount, account_id FROM transactions WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (existingTransaction.rows.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    await pool.query('BEGIN');

    try {
      // Check if this is part of a transfer
      const transferCheck = await pool.query(
        'SELECT from_account_id, to_account_id, from_transaction_id, to_transaction_id, amount FROM transfer_transactions WHERE from_transaction_id = $1 OR to_transaction_id = $1',
        [id]
      );

      if (transferCheck.rows.length > 0) {
        // This is a transfer transaction - delete both transactions and transfer record
        const transfer = transferCheck.rows[0];
        const isFromTransaction = transfer.from_transaction_id === id;
        const linkedTransactionId = isFromTransaction ? transfer.to_transaction_id : transfer.from_transaction_id;

        // Reverse the account balance changes
        await pool.query(
          'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
          [transfer.amount, transfer.to_account_id]
        );
        await pool.query(
          'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
          [transfer.amount, transfer.from_account_id]
        );

        // Delete the transfer record
        await pool.query(
          'DELETE FROM transfer_transactions WHERE from_transaction_id = $1 OR to_transaction_id = $1',
          [id]
        );

        // Delete both transactions
        await pool.query(
          'DELETE FROM transactions WHERE id IN ($1, $2) AND user_id = $3',
          [id, linkedTransactionId, user.id]
        );

      } else {
        // Regular transaction - reverse balance change and delete
        const transaction = existingTransaction.rows[0];
        
        // Reverse the balance change
        await pool.query(
          'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
          [parseFloat(transaction.amount), transaction.account_id]
        );

        // Delete the transaction
        await pool.query(
          'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
          [id, user.id]
        );
      }

      await pool.query('COMMIT');
      return NextResponse.json({ message: 'Transaction deleted successfully' });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Delete transaction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}