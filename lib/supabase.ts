import { createBrowserClient } from '@supabase/ssr'

export type Database = {
    public: {
        Tables: {
            empresas: {
                Row: {
                    id: string
                    nome: string
                    cnpj: string | null
                    ativo: boolean
                    modo_visualizacao: 'mensal' | 'semanal'
                    criado_em: string
                }
            }
            perfis: {
                Row: {
                    id: string
                    nome: string
                    email: string
                    role: 'admin' | 'usuario' | 'visualizador'
                    empresa_id: string | null
                    criado_em: string
                }
            }
            contatos: {
                Row: {
                    id: string
                    empresa_id: string
                    tipo: 'cliente' | 'fornecedor' | 'ambos'
                    nome: string
                    tipo_prazo_cliente: string | null
                    dias_vencimento: number | null
                    dia_fixo_vencimento: number | null
                    tipo_prazo_forn: string | null
                    dias_pagamento: number | null
                    ativo: boolean
                }
            }
            categorias: {
                Row: {
                    id: string
                    empresa_id: string
                    nome_categoria: string
                    tipo: 'RECEITA' | 'DESPESA'
                    subgrupo: string | null
                    ordem: number | null
                    ativo: boolean
                }
            }
            transacoes: {
                Row: {
                    id: string
                    empresa_id: string
                    tipo: 'entrada' | 'saida'
                    descricao: string
                    valor: number
                    categoria_id: string | null
                    contato_id: string | null
                    data_lancamento: string
                    data_vencimento: string | null
                    data_vencimento_prevista: string | null
                    data_vencimento_confirmada: string | null
                    data_pagamento_prevista: string | null
                    data_pagamento_confirmada: string | null
                    data_pagamento: string | null
                    fonte_vencimento: 'previsto' | 'manual' | null
                    fonte_pagamento: 'previsto' | 'manual' | null
                    confianca_calculo: 'alta' | 'media' | 'baixa' | null
                    regra_aplicada: string | null
                    id_venda: string | null
                    parcela_num: number | null
                    parcelas_total: number | null
                    origem: 'manual' | 'importacao' | 'recorrencia' | 'api'
                    recorrencia_id: string | null
                    versao: number
                    criado_por: string | null
                    criado_em: string
                    atualizado_por: string | null
                    atualizado_em: string | null
                    deleted_at: string | null
                }
            }
            recorrencias: {
                Row: {
                    id: string
                    empresa_id: string
                    descricao: string
                    tipo: 'entrada' | 'saida'
                    categoria_id: string | null
                    contato_id: string | null
                    valor_padrao: number
                    frequencia: 'semanal' | 'mensal'
                    dia_semana: number | null
                    dia_mes: number | null
                    modo_geracao: 'automatico' | 'confirmacao'
                    estado: 'ativa' | 'pausada' | 'encerrada'
                    proxima_geracao: string | null
                    deleted_at: string | null
                }
            }
            notificacoes: {
                Row: {
                    id: string
                    empresa_id: string
                    usuario_id: string | null
                    tipo: 'vencimento_proximo' | 'atrasado' | 'saldo_negativo' | 'recorrencia_pendente'
                    titulo: string
                    mensagem: string | null
                    lida: boolean
                    transacao_id: string | null
                    criado_em: string
                }
            }
        }
        Views: {
            transacoes_com_status: {
                Row: {
                    id: string
                    empresa_id: string
                    tipo: 'entrada' | 'saida'
                    descricao: string
                    valor: number
                    categoria_id: string | null
                    contato_id: string | null
                    data_lancamento: string
                    data_vencimento_confirmada: string | null
                    data_pagamento: string | null
                    status: 'pago' | 'pendente' | 'atrasado'
                    nome_categoria: string | null
                    categoria_tipo: 'RECEITA' | 'DESPESA' | null
                    categoria_subgrupo: string | null
                    contato_nome: string | null
                    contato_tipo: 'cliente' | 'fornecedor' | 'ambos' | null
                }
            }
            kpis_mensais: {
                Row: {
                    empresa_id: string
                    mes: string
                    total_entradas: number
                    total_saidas: number
                    saldo: number
                    qtd_pagos: number
                    qtd_atrasados: number
                    qtd_pendentes: number
                }
            }
        }
    }
}

export function createClient() {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

export const supabase = createClient()
