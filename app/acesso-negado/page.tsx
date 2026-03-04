'use client'

import { createClient } from '@/lib/supabase'

export default function AcessoNegadoPage() {
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#080e14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
    }}>
      <div style={{
        background: '#0d1b2a',
        border: '1px solid #3a1e1e',
        borderRadius: 20,
        padding: '48px 40px',
        width: 420,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 24 }}>🔒</div>

        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#34d399' }}>flux</span>
          <span style={{ fontSize: 24, color: '#334155' }}>caixa</span>
        </div>

        <h2 style={{ color: '#f87171', fontSize: 18, fontWeight: 700, margin: '16px 0 12px' }}>
          Acesso não autorizado
        </h2>

        <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, margin: '0 0 32px' }}>
          Seu email não está cadastrado no sistema.
          Sua solicitação foi enviada ao administrador —
          aguarde a liberação do acesso.
        </p>

        <div style={{
          background: '#080e14',
          border: '1px solid #1a2940',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 32,
          fontSize: 12,
          color: '#34d399',
        }}>
          ✓ Administrador notificado por email
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '12px',
            background: 'transparent',
            border: '1px solid #1a2940',
            borderRadius: 10,
            color: '#475569',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          Sair e voltar ao login
        </button>
      </div>
    </main>
  )
}
