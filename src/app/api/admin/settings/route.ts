import { requireAdminSession } from '@/lib/session';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    await requireAdminSession();

    let rows: any[] = [];
    try {
      const res = await query(
        `SELECT key, value FROM admin_settings WHERE key IN ('excel_export_path', 'tutorial_video_url')`
      );
      rows = res.rows;
    } catch (e) {
      console.log('Settings table may not exist yet');
    }

    const settings: Record<string, string> = {
      excel_export_path: '',
      tutorial_video_url: ''
    };
    
    for (const row of rows) {
      settings[row.key] = row.value || '';
    }

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdminSession();

    const body = await req.json();
    const validKeys = ['excel_export_path', 'tutorial_video_url'];
    const updates = Object.keys(body).filter(k => validKeys.includes(k));

    // Check if table exists, if not create it
    await query(
      `CREATE TABLE IF NOT EXISTS admin_settings (
        id BIGSERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`
    ).catch((e) => console.log('Table creation (may already exist):', e));

    for (const key of updates) {
      const value = body[key];
      if (typeof value === 'string') {
        await query(
          `INSERT INTO admin_settings (key, value, updated_at) 
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, value.trim()]
        );
      }
    }
    
    console.log('Settings saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ 
      error: `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
