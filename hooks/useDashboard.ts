// hooks/useDashboard.ts
// Hook principal do dashboard — agrega todos os dados em paralelo
// Substitui completamente o gerarDadosIniciais() mock

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    getKpisMes,
    getKpisTodosMeses,
    getDistribuicaoCategoria,
    getAlertas,
    getPrevisao,
    getLancamentos,
    getCurvaSaldo30Dias,
} } from '@/lib/queries'

// Tipos extraídos para facilitar
export type KpiMensal = {
    empresa_id: string
    mes: string
    total_entradas: number
    total_saidas: number
    saldo: number
    qtd_pagos: number
    qtd_atrasados: number
    qtd_pendentes: number
}

export type TransacaoComStatus = any
export type AlertaItem = any
export type PrevisaoBloco = any
export type CategoriaDistribuicao = any
export type FiltrosLancamentos = any

// ─────────────────────────────────────────
// Helpers de data
// ─────────────────────────────────────────

function mesAtualISO() {
    const hoje = new Date()
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
}

function anoAtual() {
    return new Date().getFullYear()
}

// ─────────────────────────────────────────
// Estado do dashboard
// ─────────────────────────────────────────

export type DashboardState = {
    // Controle de carregamento
    loading: boolean
    loadingLancamentos: boolean
    error: string | null

    // Mês selecionado
    mesSelecionado: string // 'YYYY-MM-01'
    setMesSelecionado: (mes: string) => void

    // KPIs
    kpiMes: KpiMensal | null
    kpisTodosMeses: KpiMensal[]         // para o gráfico de barras

    // Distribuição categorias
    distribuicaoReceitas: CategoriaDistribuicao[]
    distribuicaoDespesas: CategoriaDistribuicao[]

    // Alertas
    alertas: AlertaItem[]
    qtdAtrasados: number
    qtdVencendoHoje: number
    qtdRecorrenciasPendentes: number

    // Previsão
    previsao: {
        semana: PrevisaoBloco
        quinzena: PrevisaoBloco
        trinta: PrevisaoBloco
    } | null

    // Curva de saldo
    curvaSaldo: { data: string; saldo_acumulado: number }[]

    // Lançamentos
    lancamentos: TransacaoComStatus[]
    totalLancamentos: number
    totalPaginas: number
    filtros: FiltrosLancamentos
    setFiltros: (f: Partial<FiltrosLancamentos>) => void

    // Ações
    recarregar: () => void
}

// ─────────────────────────────────────────
// Hook
// ─────────────────────────────────────────

export function useDashboard(): DashboardState {
    const [loading, setLoading] = useState(true)
    const [loadingLancamentos, setLoadingLancamentos] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [mesSelecionado, setMesSelecionadoState] = useState(mesAtualISO())

    // Dados
    const [kpiMes, setKpiMes] = useState<KpiMensal | null>(null)
    const [kpisTodosMeses, setKpisTodosMeses] = useState<KpiMensal[]>([])
    const [distribuicaoReceitas, setDistribuicaoReceitas] = useState<CategoriaDistribuicao[]>([])
    const [distribuicaoDespesas, setDistribuicaoDespesas] = useState<CategoriaDistribuicao[]>([])
    const [alertas, setAlertas] = useState<AlertaItem[]>([])
    const [previsao, setPrevisao] = useState<DashboardState['previsao']>(null)
    const [curvaSaldo, setCurvaSaldo] = useState<{ data: string; saldo_acumulado: number }[]>([])
    const [lancamentos, setLancamentos] = useState<TransacaoComStatus[]>([])
    const [totalLancamentos, setTotalLancamentos] = useState(0)
    const [totalPaginas, setTotalPaginas] = useState(0)

    const [filtros, setFiltrosState] = useState<FiltrosLancamentos>({
        mes: mesAtualISO(),
        tipo: 'todos',
        status: 'todos',
        busca: '',
        pagina: 1,
        por_pagina: 15,
    })

    // ── Carrega dados do mês (KPIs + pizzas) ao mudar mês
    const carregarDadosMes = useCallback(async (mes: string) => {
        setLoading(true)
        setError(null)
        try {
            const [kpi, anoKpis, receitas, despesas] = await Promise.all([
                getKpisMes(mes),
                getKpisTodosMeses(anoAtual()),
                getDistribuicaoCategoria(mes, 'entrada'),
                getDistribuicaoCategoria(mes, 'saida'),
            ])
            setKpiMes(kpi)
            setKpisTodosMeses(anoKpis)
            setDistribuicaoReceitas(receitas)
            setDistribuicaoDespesas(despesas)
        } catch (e) {
            setError('Erro ao carregar KPIs. Verifique sua conexão.')
        } finally {
            setLoading(false)
        }
    }, [])

    // ── Carrega alertas + previsão + curva (uma vez, independente do mês)
    const carregarDadosGlobais = useCallback(async () => {
        try {
            const [alertasData, previsaoData, curvaData] = await Promise.all([
                getAlertas(),
                getPrevisao(),
                getCurvaSaldo30Dias(),
            ])
            setAlertas(alertasData)
            setPrevisao(previsaoData)
            setCurvaSaldo(curvaData)
        } catch (e) {
            console.error('Erro ao carregar dados globais:', e)
        }
    }, [])

    // ── Carrega lançamentos paginados
    const carregarLancamentos = useCallback(async (f: FiltrosLancamentos) => {
        setLoadingLancamentos(true)
        try {
            const { lancamentos: l, total, paginas } = await getLancamentos(f)
            setLancamentos(l)
            setTotalLancamentos(total)
            setTotalPaginas(paginas)
        } catch (e) {
            console.error('Erro ao carregar lançamentos:', e)
        } finally {
            setLoadingLancamentos(false)
        }
    }, [])

    // ── Inicialização
    useEffect(() => {
        carregarDadosMes(mesSelecionado)
        carregarDadosGlobais()
    }, [])

    // ── Recarrega ao mudar mês
    useEffect(() => {
        carregarDadosMes(mesSelecionado)
    }, [mesSelecionado])

    // ── Recarrega lançamentos ao mudar filtros
    useEffect(() => {
        carregarLancamentos(filtros)
    }, [filtros])

    // ── Handlers públicos
    function setMesSelecionado(mes: string) {
        setMesSelecionadoState(mes)
        setFiltrosState(prev => ({ ...prev, mes, pagina: 1 }))
    }

    function setFiltros(novosFiltros: Partial<FiltrosLancamentos>) {
        setFiltrosState(prev => ({ ...prev, ...novosFiltros, pagina: novosFiltros.pagina ?? 1 }))
    }

    function recarregar() {
        carregarDadosMes(mesSelecionado)
        carregarDadosGlobais()
        carregarLancamentos(filtros)
    }

    // ── Derivados dos alertas
    const qtdAtrasados = alertas.filter(a => a.tipo === 'atrasado').length
    const qtdVencendoHoje = alertas.filter(a => a.tipo === 'vencimento_proximo' && a.dias === 0).length
    const qtdRecorrenciasPendentes = alertas.filter(a => a.tipo === 'recorrencia_pendente').length

    return {
        loading,
        loadingLancamentos,
        error,
        mesSelecionado,
        setMesSelecionado,
        kpiMes,
        kpisTodosMeses,
        distribuicaoReceitas,
        distribuicaoDespesas,
        alertas,
        qtdAtrasados,
        qtdVencendoHoje,
        qtdRecorrenciasPendentes,
        previsao,
        curvaSaldo,
        lancamentos,
        totalLancamentos,
        totalPaginas,
        filtros,
        setFiltros,
        recarregar,
    }
}
