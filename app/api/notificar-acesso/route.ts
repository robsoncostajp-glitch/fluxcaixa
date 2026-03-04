import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, nome } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FluxCaixa <onboarding@resend.dev>',
        to: ['robsoncostajp@gmail.com'],
        subject: '🔔 Nova solicitação de acesso — FluxCaixa',
        html: `
          <div style="font-family: monospace; background: #080e14; color: #e2e8f0; padding: 40px; border-radius: 12px; max-width: 500px;">
            <div style="margin-bottom: 24px;">
              <span style="font-size: 24px; font-weight: 800; color: #34d399;">flux</span>
              <span style="font-size: 24px; color: #334155;">caixa</span>
            </div>
            <h2 style="color: #e2e8f0; margin: 0 0 16px;">Nova solicitação de acesso</h2>
            <p style="color: #94a3b8; margin: 0 0 24px;">
              Uma pessoa tentou acessar o FluxCaixa mas não está cadastrada.
            </p>
            <div style="background: #0d1b2a; border: 1px solid #1a2940; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px; color: #475569; font-size: 12px;">EMAIL SOLICITANTE</p>
              <p style="margin: 0; color: #34d399; font-size: 18px; font-weight: 700;">${email}</p>
              ${nome ? `<p style="margin: 8px 0 0; color: #94a3b8; font-size: 13px;">${nome}</p>` : ''}
            </div>
            <p style="color: #475569; font-size: 12px; margin: 0;">
              Cadastre o email acima na tabela <strong style="color: #34d399;">perfis</strong> do Supabase para liberar o acesso.
            </p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      console.error('Resend error:', err)
      return NextResponse.json({ error: 'Falha ao enviar email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao notificar:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
