import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const updatePayeeSchema = z.object({
  name: z.string().min(1, 'Payee name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
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
      'SELECT id, name, email, phone, address, created_at, updated_at FROM payees WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Payee not found' }, { status: 404 });
    }

    return NextResponse.json({ payee: result.rows[0] });
  } catch (error) {
    console.error('Get payee error:', error);
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
    const updateData = updatePayeeSchema.parse(body);

    const { id } = await params;
    const existingPayee = await pool.query(
      'SELECT id FROM payees WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (existingPayee.rows.length === 0) {
      return NextResponse.json({ error: 'Payee not found' }, { status: 404 });
    }

    if (updateData.name) {
      const nameExists = await pool.query(
        'SELECT id FROM payees WHERE user_id = $1 AND name = $2 AND id != $3',
        [user.id, updateData.name, id]
      );

      if (nameExists.rows.length > 0) {
        return NextResponse.json(
          { error: 'Payee with this name already exists' },
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
    if (updateData.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(updateData.email || null);
    }
    if (updateData.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      updateValues.push(updateData.phone || null);
    }
    if (updateData.address !== undefined) {
      updateFields.push(`address = $${paramIndex++}`);
      updateValues.push(updateData.address || null);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id, user.id);

    const result = await pool.query(
      `UPDATE payees SET ${updateFields.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING id, name, email, phone, address, created_at, updated_at`,
      updateValues
    );

    return NextResponse.json({ payee: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    
    console.error('Update payee error:', error);
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
    const existingPayee = await pool.query(
      'SELECT id FROM payees WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (existingPayee.rows.length === 0) {
      return NextResponse.json({ error: 'Payee not found' }, { status: 404 });
    }

    const hasTransactions = await pool.query(
      'SELECT id FROM transactions WHERE payee_id = $1 LIMIT 1',
      [id]
    );

    if (hasTransactions.rows.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete payee with existing transactions' },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM payees WHERE id = $1 AND user_id = $2', [
      id,
      user.id,
    ]);

    return NextResponse.json({ message: 'Payee deleted successfully' });
  } catch (error) {
    console.error('Delete payee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}