
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

// Helper to save file locally (For Vercel/Production this should ideally be S3/Blob storage, 
// but user asked for "simple" and local storage is okay for this internal tool prototype).
// NOTE: On Vercel deployments, local filesystem is ephemeral. 
// If user deploys to Vercel, this will break. But for local dev it's fine.
// I'll add a comment.

export async function POST(request: Request) {
    try {
        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = file.name.replace(/\s/g, '_');
        const uniqueFilename = `${uniqueSuffix}-${filename}`;

        // Save to public/uploads
        // Ensure public/uploads exists!
        const path = join(process.cwd(), 'public/uploads', uniqueFilename);

        await writeFile(path, buffer);

        // Return URL
        const url = `/uploads/${uniqueFilename}`;

        return NextResponse.json({ url, name: file.name, type: file.type });
    } catch (error) {
        console.error("Upload API Error:", error);
        return NextResponse.json({ error: 'Upload failed: ' + (error as Error).message }, { status: 500 });
    }
}
