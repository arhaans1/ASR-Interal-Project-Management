'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database, Loader2, CheckCircle2 } from 'lucide-react';

export default function DataMigrationBtn() {
    const [loading, setLoading] = useState(false);
    const [complete, setComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const performMigration = async () => {
        if (!confirm('This will update ALL clients with old statuses to "Active". Are you sure?')) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Update various old statuses to 'Active'
            const { error: updateError } = await supabase
                .from('clients')
                .update({ status: 'Active' })
                .in('status', ['Onboarding', 'In-Process', 'On-Hold', 'Ads Launched', 'Closed', 'active']); // including lowercase 'active' just in case

            if (updateError) throw updateError;

            // 2. Also map 'Ads Launched' to 'Active' explicitly if the IN clause missed it for some reason or if we want specific mapping (user said shift ALL to active, so the above single query is cleaner).
            // Actually, user said: "shift all current clients to active". This implies everything that isn't already archived or team?
            // "Can we permanentely remove Onboarding, In-Process , Ads Launched, Closed all old status types?? ... we can shift all current clients to active status"

            // Safety check: Let's run a second pass to be sure
            await supabase
                .from('clients')
                .update({ status: 'Active' })
                .eq('status', 'Ads Launched');

            setComplete(true);
            setTimeout(() => {
                window.location.reload(); // Reload to reflect changes
            }, 1500);

        } catch (err) {
            console.error('Migration failed:', err);
            setError('Migration failed. See console.');
        } finally {
            setLoading(false);
        }
    };

    if (complete) {
        return (
            <button className="w-full mt-4 py-2 px-4 bg-green-50 text-green-700 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold border border-green-100">
                <CheckCircle2 className="w-4 h-4" />
                Migration Complete!
            </button>
        );
    }

    return (
        <div className="px-4 mt-auto pb-4">
            <button
                onClick={performMigration}
                disabled={loading}
                className="w-full py-2 px-4 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-semibold border border-amber-100 border-dashed"
            >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                {loading ? 'Fixing Data...' : 'Fix Legacy Data'}
            </button>
            {error && <p className="text-xs text-red-500 text-center mt-1">{error}</p>}
        </div>
    );
}
