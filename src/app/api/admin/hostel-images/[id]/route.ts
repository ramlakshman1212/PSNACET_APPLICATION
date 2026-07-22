import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads');

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
    
    // Get the image info first
    const res = await query('SELECT * FROM hostel_images WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    const image = res.rows[0];
    
    // Delete from filesystem
    try {
      await fs.unlink(path.join(UPLOAD_DIR, image.file_key as string));
    } catch (e) {
      console.warn('File already deleted or missing:', image.file_key);
    }
    
    // Delete from DB
    await query('DELETE FROM hostel_images WHERE id = $1', [id]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
