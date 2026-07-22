import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads');

export async function GET() {
  try {
    const res = await query('SELECT * FROM hostel_images ORDER BY created_at DESC');
    return NextResponse.json({ images: res.rows });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const hostelType = formData.get('hostel_type') as string;
    const file = formData.get('file') as File;

    if (!hostelType || !file) {
      return NextResponse.json({ error: 'Missing type or file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExt = path.extname(file.name);
    const fileName = file.name;
    const fileKey = crypto.randomUUID() + '_' + Date.now() + fileExt;

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, fileKey), buffer);

    const res = await query('INSERT INTO hostel_images (hostel_type, file_key, file_name) VALUES ($1, $2, $3) RETURNING *', [hostelType, fileKey, fileName]);
    
    return NextResponse.json({ image: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to upload' }, { status: 500 });
  }
}
