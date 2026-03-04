import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import LoginButton from './LoginButton'

export default async function LoginPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/dashboard')

    return (
        <main style={{ minHeight: '100vh', background: '#080e14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
            <div style={{ background: '#0d1b2a', border: '1px solid #1a2940', borderRadius: '20px', padding: '48px 40px', width: '400px' }}>
                <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 800, color: '#34d399' }}>flux</span>
                    <span style={{ fontSize: '28px', color: '#334155' }}>caixa</span>
                </div>
                <h2 style={{ color: '#e2e8f0', marginBottom: '8px', fontSize: '20px' }}>Entrar no sistema</h2>
                <p style={{ color: '#475569', fontSize: '13px', marginBottom: '32px' }}>Use sua conta Google para acessar.</p>
                <LoginButton />
                <p style={{ color: '#334155', fontSize: '11px', textAlign: 'center', marginTop: '24px' }}>Acesso restrito — liberado pelo admin</p>
            </div>
        </main>
    )
}
