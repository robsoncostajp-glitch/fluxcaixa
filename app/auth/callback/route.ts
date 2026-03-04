import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const { data: perfil } = await supabase
    .from('perfis')
    .select('id, role')
    .eq('email', user.email)
    .single()

  if (!perfil) {
    try {
      await fetch(`${origin}/api/notificar-acesso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          nome: user.user_metadata?.full_name ?? null,
        }),
      })
    } catch (e) {
      console.error('Erro ao notificar admin:', e)
    }

    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/acesso-negado`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
