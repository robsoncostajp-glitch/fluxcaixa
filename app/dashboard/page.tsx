import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return (
        <main style={{ minHeight: '100vh', background: '#080e14', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#34d399', marginBottom: '8px' }}>fluxcaixa</div>
                <p style={{ color: '#475569' }}>Bem-vindo, {user.email}</p>
                <p style={{ color: '#34d399', marginTop: '16px' }}>✓ Login com Google funcionando!</p>
            </div>
        </main>
    )
}
