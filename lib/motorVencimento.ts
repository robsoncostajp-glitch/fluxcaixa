// lib/motorVencimento.ts
// Calcula datas de vencimento (clientes) e pagamento (fornecedores)
// baseado nas regras cadastradas em contatos
// Roda 100% no frontend — sem chamadas ao banco

export type RegraVencimento = {
    tipo_prazo_cliente: string | null
    dias_vencimento: number | null
    dia_fixo_vencimento: number | null
}

export type RegraPagamento = {
    tipo_prazo_forn: string | null
    dias_pagamento: number | null
}

export type ResultadoVencimento = {
    data_vencimento_prevista: string | null
    fonte_vencimento: 'previsto' | 'manual'
    confianca_calculo: 'alta' | 'media' | 'baixa'
    regra_aplicada: string
}

export type ResultadoPagamento = {
    data_pagamento_prevista: string | null
    fonte_pagamento: 'previsto' | 'manual'
    confianca_calculo: 'alta' | 'media' | 'baixa'
    regra_aplicada: string
}

function addDias(data: Date, dias: number): Date {
    const d = new Date(data)
    d.setDate(d.getDate() + dias)
    return d
}

function toISO(d: Date): string {
    return d.toISOString().split('T')[0]
}

function proximaSegunda(data: Date): Date {
    const d = new Date(data)
    const diaSemana = d.getDay() // 0=dom, 1=seg...
    // Se já é segunda, próxima segunda = +7 dias
    const diasAteSegunda = diaSemana === 1 ? 7 : (8 - diaSemana) % 7
    d.setDate(d.getDate() + diasAteSegunda)
    return d
}

function proximaSextaOuMesma(data: Date): Date {
    const d = new Date(data)
    const diaSemana = d.getDay() // 0=dom, 6=sab, 5=sex
    if (diaSemana === 5) return d // já é sexta
    if (diaSemana < 5) {
        // ainda na semana — avança para sexta
        d.setDate(d.getDate() + (5 - diaSemana))
        return d
    }
    // sábado ou domingo — próxima sexta
    d.setDate(d.getDate() + (12 - diaSemana))
    return d
}

function diaFixoMes(data: Date, dia: number): Date {
    const d = new Date(data)
    const proximoMes = new Date(d.getFullYear(), d.getMonth() + 1, dia)
    // Se o dia fixo ainda não passou no mês atual, usa o mês atual
    const mesmoMes = new Date(d.getFullYear(), d.getMonth(), dia)
    return mesmoMes > d ? mesmoMes : proximoMes
}

// ─────────────────────────────────────────
// MOTOR DE VENCIMENTO — CLIENTES
// ─────────────────────────────────────────

export function calcularVencimento(
    dataLancamento: string,
    regra: RegraVencimento
): ResultadoVencimento {
    const base = new Date(dataLancamento + 'T12:00') // evita problema de timezone

    if (!regra.tipo_prazo_cliente) {
        return {
            data_vencimento_prevista: null,
            fonte_vencimento: 'manual',
            confianca_calculo: 'baixa',
            regra_aplicada: 'sem_regra',
        }
    }

    switch (regra.tipo_prazo_cliente) {
        case 'imediato':
            return {
                data_vencimento_prevista: toISO(base),
                fonte_vencimento: 'previsto',
                confianca_calculo: 'alta',
                regra_aplicada: 'imediato',
            }

        case 'dias_corridos':
            if (!regra.dias_vencimento) break
            return {
                data_vencimento_prevista: toISO(addDias(base, regra.dias_vencimento)),
                fonte_vencimento: 'previsto',
                confianca_calculo: 'alta',
                regra_aplicada: `dias_corridos_${regra.dias_vencimento}`,
            }

        case 'proxima_segunda':
            return {
                data_vencimento_prevista: toISO(proximaSegunda(base)),
                fonte_vencimento: 'previsto',
                confianca_calculo: 'alta',
                regra_aplicada: 'proxima_segunda',
            }

        case 'sexta_semana':
            return {
                data_vencimento_prevista: toISO(proximaSextaOuMesma(base)),
                fonte_vencimento: 'previsto',
                confianca_calculo: 'alta',
                regra_aplicada: 'sexta_da_semana',
            }

        case 'dia_fixo_mes':
            if (!regra.dia_fixo_vencimento) break
            return {
                data_vencimento_prevista: toISO(diaFixoMes(base, regra.dia_fixo_vencimento)),
                fonte_vencimento: 'previsto',
                confianca_calculo: 'alta',
                regra_aplicada: `dia_fixo_${regra.dia_fixo_vencimento}`,
            }
    }

    // Fallback manual
    return {
        data_vencimento_prevista: null,
        fonte_vencimento: 'manual',
        confianca_calculo: 'baixa',
        regra_aplicada: 'regra_invalida',
    }
}

// ─────────────────────────────────────────
// MOTOR DE PAGAMENTO — FORNECEDORES
// ─────────────────────────────────────────

export function calcularPagamento(
    dataEmissao: string,
    regra: RegraPagamento
): ResultadoPagamento {
    const base = new Date(dataEmissao + 'T12:00')

    if (!regra.tipo_prazo_forn || regra.tipo_prazo_forn === 'manual') {
        return {
            data_pagamento_prevista: null,
            fonte_pagamento: 'manual',
            confianca_calculo: 'baixa',
            regra_aplicada: 'manual',
        }
    }

    if (regra.tipo_prazo_forn === 'dias_corridos' && regra.dias_pagamento) {
        return {
            data_pagamento_prevista: toISO(addDias(base, regra.dias_pagamento)),
            fonte_pagamento: 'previsto',
            confianca_calculo: 'alta',
            regra_aplicada: `dias_corridos_${regra.dias_pagamento}`,
        }
    }

    return {
        data_pagamento_prevista: null,
        fonte_pagamento: 'manual',
        confianca_calculo: 'baixa',
        regra_aplicada: 'regra_invalida',
    }
}

// ─────────────────────────────────────────
// PARCELAMENTO
// Gera array de lançamentos para venda parcelada
// ─────────────────────────────────────────

export type ParcelaGerada = {
    parcela_num: number
    parcelas_total: number
    valor: number
    data_vencimento_prevista: string
    descricao_sufixo: string // ex: "(2/5)"
}

export function gerarParcelas(params: {
    valorTotal: number
    numeroParcelas: number
    percentualEntrada: number
    dataLancamento: string
    regra: RegraVencimento
}): ParcelaGerada[] {
    const { valorTotal, numeroParcelas, percentualEntrada, dataLancamento, regra } = params

    const parcelas: ParcelaGerada[] = []
    let valorRestante = valorTotal

    // Entrada
    if (percentualEntrada > 0) {
        const valorEntrada = Math.round(valorTotal * percentualEntrada) / 100
        valorRestante -= valorEntrada
        const venc = calcularVencimento(dataLancamento, { ...regra, tipo_prazo_cliente: 'imediato' })
        parcelas.push({
            parcela_num: 0,
            parcelas_total: numeroParcelas,
            valor: valorEntrada,
            data_vencimento_prevista: venc.data_vencimento_prevista ?? dataLancamento,
            descricao_sufixo: '(entrada)',
        })
    }

    // Parcelas
    const valorParcela = Math.floor((valorRestante / numeroParcelas) * 100) / 100

    for (let i = 1; i <= numeroParcelas; i++) {
        const diasOffset = (i - 1) * 30 // aproximação para múltiplos meses
        const dataBase = new Date(dataLancamento + 'T12:00')
        dataBase.setDate(dataBase.getDate() + diasOffset)
        const dataBaseStr = dataBase.toISOString().split('T')[0]

        // Ajuste de centavos na última parcela
        const valor = i === numeroParcelas
            ? Math.round((valorRestante - valorParcela * (numeroParcelas - 1)) * 100) / 100
            : valorParcela

        const venc = calcularVencimento(dataBaseStr, regra)

        parcelas.push({
            parcela_num: i,
            parcelas_total: numeroParcelas,
            valor,
            data_vencimento_prevista: venc.data_vencimento_prevista ?? dataBaseStr,
            descricao_sufixo: `(${i}/${numeroParcelas})`,
        })
    }

    return parcelas
}
