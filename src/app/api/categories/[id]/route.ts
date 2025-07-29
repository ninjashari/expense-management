import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
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
      'SELECT id, name, color, created_at, updated_at FROM categories WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Get category error:', error);
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
    const updateData = updateCategorySchema.parse(body);

    const { id } = await params;
    const existingCategory = await pool.query(
      'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (existingCategory.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (updateData.name) {
      const nameExists = await pool.query(
        'SELECT id FROM categories WHERE user_id = $1 AND name = $2 AND id != $3',
        [user.id, updateData.name, id]
      );

      if (nameExists.rows.length > 0) {
        return NextResponse.json(
          { error: 'Category with this name already exists' },
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
    if (updateData.color !== undefined) {
      updateFields.push(`color = $${paramIndex++}`);
      updateValues.push(updateData.color);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id, user.id);

    const result = await pool.query(
      `UPDATE categories SET ${updateFields.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING id, name, color, created_at, updated_at`,
      updateValues
    );

    return NextResponse.json({ category: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    
    console.error('Update category error:', error);
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
    const existingCategory = await pool.query(
      'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (existingCategory.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const hasTransactions = await pool.query(
      'SELECT id FROM transactions WHERE category_id = $1 LIMIT 1',
      [id]
    );

    if (hasTransactions.rows.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with existing transactions' },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [
      id,
      user.id,
    ]);

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}