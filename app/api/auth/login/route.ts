import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const sessionToken = await createSession(username.trim());

    return NextResponse.json({ 
      success: true, 
      sessionToken,
      message: 'Logged in successfully' 
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}