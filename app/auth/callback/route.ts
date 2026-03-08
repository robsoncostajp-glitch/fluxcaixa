import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?erro=sem_codigo`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as any)
          )
        },
      },
    }
  )

  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

  if (sessionError) {
    console.error('Erro ao trocar code por sessão:', sessionError.message)
    return NextResponse.redirect(`${origin}/login?erro=sessao`)
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.redirect(`${origin}/login?erro=usuario`)
  }

  // USA SERVICE ROLE para checar perfis sem depender de RLS
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )

  const { data: perfil } = await supabaseAdmin
    .from('perfis')
    .select('id, role')
    .eq('email', user.email!)
    .maybeSingle()

  if (!perfil) {
    try {
      await fetch(`${origin}/api/notificar-acesso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          nome: user.user_metadata?.full_name ?? user.email,
        }),
      })
    } catch (e) {
      console.error('Erro ao notificar acesso:', e)
    }

    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/acesso-negado`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
