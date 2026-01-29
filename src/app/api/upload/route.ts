
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Use Service Role Key to bypass RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceKey) {
            throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const bucketName = 'chat-attachments';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = file.name.replace(/\s/g, '_');
        const path = `${uniqueSuffix}-${filename}`;

        const { data, error } = await supabaseAdmin
            .storage
            .from(bucketName)
            .upload(path, file, {
                contentType: file.type,
                upsert: false
            });

        if (error) {
            console.error("Supabase Storage Error:", error);
            throw error;
        }

        // Get Public URL (Use admin or anon client, public URL generation is same)
        const { data: { publicUrl } } = supabaseAdmin
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
