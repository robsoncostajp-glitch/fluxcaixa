import { supabase } from './lib/supabase'

export async function getKpisMes(mes: string) {
    const { data } = await supabase
        .from('kpis_mensais')
        .select('*')
        .eq('mes', mes)
        .single()
    return data as any
}

export async function getKpisTodosMeses(ano: number) {
    const { data } = await supabase
        .from('kpis_mensais')
        .select('*')
        .gte('mes', `${ano}-01-01`)
        .lte('mes', `${ano}-12-01`)
        .order('mes', { ascending: true })
    return (data ?? []) as any[]
}

export async function getDistribuicaoCategoria(mes: string, tipo: string) {
    const fimMes = new Date(mes)
    fimMes.setMonth(fimMes.getMonth() + 1)
    const fimStr = fimMes.toISOString().split('T')[0]

    const { data } = await supabase
        .from('transacoes_com_status')
        .select('valor, nome_categoria, categoria_subgrupo')
        .eq('tipo', tipo)
        .not('data_pagamento', 'is', null)
        .gte('data_lancamento', mes)
        .lt('data_lancamento', fimStr)

    if (!data || data.length === 0) return []

    const mapa: Record<string, { total: number; subgrupo: string | null }> = {}
    let totalGeral = 0

    for (const t of data as any[]) {
        const cat = t.nome_categoria ?? 'Sem categoria'
        mapa[cat] = mapa[cat] ?? { total: 0, subgrupo: t.categoria_subgrupo }
        mapa[cat].total += Number(t.valor)
        totalGeral += Number(t.valor)
    }

    return Object.entries(mapa)
        .map(([nome_categoria, { total, subgrupo }]) => ({
            nome_categoria,
            subgrupo,
            total,
            percentual: totalGeral > 0 ? (total / totalGeral) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6)
}

export async function getAlertas() {
    const hoje = new Date()
    const em7dias = new Date()
    em7dias.setDate(hoje.getDate() + 7)
    const hojeStr = hoje.toISOString().split('T')[0]
    const em7Str = em7dias.toISOString().split('T')[0]

    const { data: atrasados } = await supabase
        .from('transacoes_com_status')
        .select('id, tipo, descricao, valor, data_vencimento_confirmada, contato_nome')
        .eq('status', 'atrasado')
        .order('data_vencimento_confirmada', { ascending: true })
        .limit(10)

    const { data: proximos } = await supabase
        .from('transacoes_com_status')
        .select('id, tipo, descricao, valor, data_vencimento_confirmada, contato_nome')
        .eq('status', 'pendente')
        .gte('data_vencimento_confirmada', hojeStr)
        .lte('data_vencimento_confirmada', em7Str)
        .order('data_vencimento_confirmada', { ascending: true })
        .limit(10)

    const { data: recorrencias } = await supabase
        .from('recorrencias')
        .select('id, descricao, valor_padrao, proxima_geracao')
        .eq('estado', 'ativa')
        .eq('modo_geracao', 'confirmacao')
        .lte('proxima_geracao', em7Str)
        .limit(5)

    const alertas: any[] = []

    for (const t of (atrasados ?? []) as any[]) {
        const venc = new Date(t.data_vencimento_confirmada)
        const dias = Math.floor((hoje.getTime() - venc.getTime()) / 86400000)
        alertas.push({ ...t, tipo_alerta: 'atrasado', dias: -dias })
    }

    for (const t of (proximos ?? []) as any[]) {
        const venc = new Date(t.data_vencimento_confirmada)
        const dias = Math.floor((venc.getTime() - hoje.getTime()) / 86400000)
        alertas.push({ ...t, tipo_alerta: 'vencimento_proximo', dias })
    }

    for (const r of (recorrencias ?? []) as any[]) {
        alertas.push({ ...r, tipo_alerta: 'recorrencia_pendente', dias: 0 })
    }

    return alertas
}

export async function getPrevisao() {
    const hoje = new Date()
    const hojeStr = hoje.toISOString().split('T')[0]

    function addDias(d: Date, n: number) {
        const r = new Date(d)
        r.setDate(r.getDate() + n)
        return r.toISOString().split('T')[0]
    }

    const diaSemana = hoje.getDay()
    const diasParaDom = diaSemana === 0 ? 0 : 7 - diaSemana
    const fimSemana = addDias(hoje, diasParaDom)
    const fim15 = addDias(hoje, 15)
    const fim30 = addDias(hoje, 30)

    async function bloco(label: string, inicio: string, fim: string) {
        const { data } = await supabase
            .from('transacoes_com_status')
            .select('id, tipo, valor, data_vencimento_confirmada, contato_nome, descricao')
            .eq('status', 'pendente')
            .gte('data_vencimento_confirmada', inicio)
            .lte('data_vencimento_confirmada', fim)
            .order('data_vencimento_confirmada', { ascending: true })

        const items = (data ?? []) as any[]
        const receber = items.filter((t: any) => t.tipo === 'entrada')
        const pagar = items.filter((t: any) => t.tipo === 'saida')
        const total_receber = receber.reduce((s: number, t: any) => s + Number(t.valor), 0)
        const total_pagar = pagar.reduce((s: number, t: any) => s + Number(t.valor), 0)

        return {
            label, data_inicio: inicio, data_fim: fim,
            total_receber, total_pagar,
            saldo_previsto: total_receber - total_pagar,
            qtd_receber: receber.length, qtd_pagar: pagar.length,
            proximo_receber: receber[0]?.contato_nome ?? receber[0]?.descricao ?? null,
            proximo_pagar: pagar[0]?.contato_nome ?? pagar[0]?.descricao ?? null,
        }
    }

    const [semana, quinzena, trinta] = await Promise.all([
        bloco('Esta semana', hojeStr, fimSemana),
        bloco('Próximos 15 dias', hojeStr, fim15),
        bloco('Próximos 30 dias', hojeStr, fim30),
    ])

    return { semana, quinzena, trinta }
}

export async function getLancamentos(filtros: any) {
    const { mes, tipo = 'todos', status = 'todos', busca = '', pagina = 1, por_pagina = 15 } = filtros
    const fimMes = new Date(mes)
    fimMes.setMonth(fimMes.getMonth() + 1)
    const fimStr = fimMes.toISOString().split('T')[0]

    let query = supabase
        .from('transacoes_com_status')
        .select('*', { count: 'exact' })
        .gte('data_lancamento', mes)
        .lt('data_lancamento', fimStr)
        .order('data_lancamento', { ascending: false })
        .range((pagina - 1) * por_pagina, pagina * por_pagina - 1)

    if (tipo !== 'todos') query = query.eq('tipo', tipo)
    if (status !== 'todos') query = query.eq('status', status)
    if (busca) query = query.ilike('descricao', `%${busca}%`)

    const { data, count } = await query
    return {
        lancamentos: (data ?? []) as any[],
        total: count ?? 0,
        paginas: Math.ceil((count ?? 0) / por_pagina),
    }
}

export async function getCategorias(tipo?: string) {
    let query = supabase
        .from('categorias')
        .select('id, nome_categoria, tipo, subgrupo, ordem')
        .eq('ativo', true)
        .order('ordem', { ascending: true })
    if (tipo) query = query.eq('tipo', tipo)
    const { data } = await query
    return (data ?? []) as any[]
}

export async function getContatos(tipo?: string) {
    let query = supabase
        .from('contatos')
        .select('id, nome, tipo, tipo_prazo_cliente, dias_vencimento, dia_fixo_vencimento, tipo_prazo_forn, dias_pagamento')
        .eq('ativo', true)
        .order('nome', { ascending: true })
    if (tipo) query = query.eq('tipo', tipo)
    const { data } = await query
    return (data ?? []) as any[]
}

export async function getCurvaSaldo30Dias() {
    const hoje = new Date()
    const em30 = new Date()
    em30.setDate(hoje.getDate() + 30)
    const hojeStr = hoje.toISOString().split('T')[0]
    const em30Str = em30.toISOString().split('T')[0]

    const { data } = await supabase
        .from('transacoes_com_status')
        .select('tipo, valor, data_vencimento_confirmada')
        .eq('status', 'pendente')
        .gte('data_vencimento_confirmada', hojeStr)
        .lte('data_vencimento_confirmada', em30Str)
        .order('data_vencimento_confirmada', { ascending: true })

    const porDia: Record<string, number> = {}
    for (const t of (data ?? []) as any[]) {
        const dia = t.data_vencimento_confirmada
        porDia[dia] = (porDia[dia] ?? 0) + (t.tipo === 'entrada' ? Number(t.valor) : -Number(t.valor))
    }

    let acumulado = 0
    const resultado = []
    const cursor = new Date(hoje)
    while (cursor <= em30) {
        const dStr = cursor.toISOString().split('T')[0]
        acumulado += porDia[dStr] ?? 0
        resultado.push({ data: dStr, saldo_acumulado: acumulado })
        cursor.setDate(cursor.getDate() + 1)
    }

    return resultado
}

export async function criarLancamentoV2(dados: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { data: perfil } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .single()

    if (!perfil) return { error: 'Perfil não encontrado' }
    if (!perfil.empresa_id) return { error: 'Empresa não encontrada' }

    const { data, error } = await supabase
        .from('transacoes')
        .insert({
            ...dados,
            empresa_id: perfil.empresa_id,
            criado_por: user.id,
            origem: dados.origem ?? 'manual'
        })
        .select()
        .single()

    return { data, error }
}

export async function marcarComoPago(id: string, data_pagamento: string, versao: number) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
        .from('transacoes')
        .update({ data_pagamento, atualizado_por: user?.id, versao: versao + 1 })
        .eq('id', id)
        .eq('versao', versao)
        .select()
        .single()
    return { data, error }
}

export async function deletarLancamento(id: string, motivo?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
        .from('transacoes')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id, deleted_reason: motivo ?? 'Excluído pelo usuário' })
        .eq('id', id)
    return { error }
}
