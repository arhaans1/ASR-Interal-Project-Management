import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bucketName = 'chat-attachments';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = file.name.replace(/\s/g, '_');
        const path = `${uniqueSuffix}-${filename}`;

        const { data, error } = await supabase
            .storage
            .from(bucketName)
            .upload(path, file);

        if (error) {
            console.error("Supabase Storage Error:", error);
            throw error;
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase
            .storage
            .from(bucketName)
            .getPublicUrl(path);

        return NextResponse.json({
            url: publicUrl,
            name: file.name,
            type: file.type
        });

    } catch (error) {
        console.error("Upload API Error:", error);
        return NextResponse.json({ error: 'Upload failed: ' + (error as Error).message }, { status: 500 });
    }
}
