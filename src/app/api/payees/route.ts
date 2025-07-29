import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const createPayeeSchema = z.object({
  name: z.string().min(1, 'Payee name is required'),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      'SELECT id, name, email, phone, address, created_at, updated_at FROM payees WHERE user_id = $1 ORDER BY name ASC',
      [user.id]
    );

    return NextResponse.json({ payees: result.rows });
  } catch (error) {
    console.error('Get payees error:', error);
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
    const { name, email, phone, address } = createPayeeSchema.parse(body);

    const existingPayee = await pool.query(
      'SELECT id FROM payees WHERE user_id = $1 AND name = $2',
      [user.id, name]
    );

    if (existingPayee.rows.length > 0) {
      return NextResponse.json(
        { error: 'Payee with this name already exists' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'INSERT INTO payees (user_id, name, email, phone, address) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, address, created_at, updated_at',
      [user.id, name, email, phone, address]
    );

    return NextResponse.json({ payee: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    
    console.error('Create payee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}