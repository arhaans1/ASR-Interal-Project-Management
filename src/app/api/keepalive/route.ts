import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // A minimal query to keep the Supabase database awake
        // We select just 1 row from the users/clients table or chat_messages to trigger a database read
        const { data, error } = await supabase
            .from('users') // We can query any table here
            .select('id')
            .limit(1);

        if (error) throw error;

        return NextResponse.json({ 
            success: true, 
            message: "Supabase Keep-Alive Ping Successful",
            timestamp: new Date().toISOString()
        }, { status: 200 });

    } catch (error) {
        console.error("Keep-Alive Ping Failed:", error);
        return NextResponse.json({ 
            success: false, 
            error: "Failed to ping Supabase" 
        }, { status: 500 });
    }
}
