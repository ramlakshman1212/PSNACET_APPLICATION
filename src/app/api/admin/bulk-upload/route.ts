import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdminSession, AuthError } from '@/lib/session';
import { normalizeApplicationNumber } from '@/lib/student-password';

function makeInstitutionalId() {
  return `INST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const body = await req.json();
    const students = body.students;

    if (!Array.isArray(students)) {
      return NextResponse.json({ error: 'Invalid payload: expected an array of students' }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const student of students) {
      try {
        // Map the new CSV properties:
        // "Application Id","Name","Gender","Community","Email","Mobile","Branch",
        // "Admission Status","Is Allotted in Upward","First Graduate","PMSS","Round"
        
        const rawAppId = student['Application Id'] ?? student.application_number ?? student.id ?? '';
        const rawName = student['Name'] ?? student.full_name ?? student.name ?? '';
        const rawMobile = student['Mobile'] ?? student.mobile_number ?? student.mobile ?? '';
        const rawBranch = student['Branch'] ?? student.academic_branch ?? student.department ?? '';
        
        const application_number = normalizeApplicationNumber(String(rawAppId));
        const full_name = String(rawName).trim();
        const mobile_number = String(rawMobile).trim();
        const academic_branch = String(rawBranch).trim();
        
        // date_of_birth is no longer required or available in the new CSV
        const date_of_birth = null; 
        
        // Extract extra fields into JSON
        const additional_info = {
          Gender: student['Gender'],
          Community: student['Community'],
          Email: student['Email'],
          'Admission Status': student['Admission Status'],
          'Is Allotted in Upward': student['Is Allotted in Upward'],
          'First Graduate': student['First Graduate'],
          PMSS: student['PMSS'],
          Round: student['Round'],
        };

        if (!application_number || !full_name || !mobile_number || !academic_branch) {
          results.failed++;
          results.errors.push(`Row missing required fields (App No, Name, Mobile, or Branch). App No: ${application_number || 'Unknown'}`);
          continue;
        }

        const { rows: existingRows } = await query(
          `SELECT *, to_char(date_of_birth, 'YYYY-MM-DD') as dob_str FROM students WHERE application_number = $1`,
          [application_number]
        );

        if (existingRows.length > 0) {
          const existing = existingRows[0];
          
          if (
            existing.full_name === full_name &&
            existing.academic_branch === academic_branch &&
            (existing.mobile_number || '') === mobile_number
          ) {
            results.failed++;
            results.errors.push(`Duplicate skipped (No changes): ${application_number} (${full_name})`);
            continue;
          } else {
            // Update existing record
            await query(
              `UPDATE students SET
                full_name = $2, academic_branch = $3, mobile_number = $4, additional_info = $5::jsonb, updated_at = NOW()
               WHERE application_number = $1`,
               [
                 application_number, full_name, academic_branch, mobile_number, JSON.stringify(additional_info)
               ]
            );
            results.success++;
            continue;
          }
        }

        const institutional_id = makeInstitutionalId();
        const accessExpiresAt = new Date();
        accessExpiresAt.setDate(accessExpiresAt.getDate() + 3);

        await query(
          `INSERT INTO students (
            application_number, institutional_id, full_name, academic_branch,
            mobile_number, additional_info, status, completion_status, is_locked, access_expires_at, extended_days
          ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11)`,
          [
            application_number,
            institutional_id,
            full_name,
            academic_branch,
            mobile_number,
            JSON.stringify(additional_info),
            'In Review',
            'Complete', // Initially set to Complete as per standard manual creation
            false,
            accessExpiresAt.toISOString(),
            0,
          ]
        );
        results.success++;
      } catch (e: any) {
        if (e.code === '23505') {
          results.failed++;
          results.errors.push(`Duplicate application number: ${student['Application Id'] || student.application_number || student.id}`);
        } else {
          results.failed++;
          results.errors.push(`Failed to process ${student['Application Id'] || student.application_number || 'Unknown'}: ${e.message}`);
        }
      }
    }

    return NextResponse.json({ results });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('Bulk upload error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
