'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Megaphone, MapPin, CheckCircle, LogOut, User, RotateCcw } from 'lucide-react'

export default function AtendentePage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<any>(null)
  const [nomeGuiche, setNomeGuiche] = useState('Carregando...')
  
  // Estados da Senha
  const [senhaAtual, setSenhaAtual] = useState<number | null>(null)
  const [ultimoTipo, setUltimoTipo] = useState<string>('normal') // Para saber se repete como pref ou normal
  
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    verificarLogin()
    carregarUltimaSenha()
  }, [])

  function verificarLogin() {
    const sessao = localStorage.getItem('fila_usuario')
    if (!sessao) {
        router.push('/login')
        return
    }
    const user = JSON.parse(sessao)
    setUsuario(user)

    if (user.fe_guiches) {
        setNomeGuiche(user.fe_guiches.nome)
    } else {
        setNomeGuiche('Sem Guichê Vinculado')
    }
  }

  function logout() {
    localStorage.removeItem('fila_usuario')
    router.push('/login')
  }

  async function carregarUltimaSenha() {
    // Busca a config do contador
    const { data } = await supabase.from('fe_config').select('valor').eq('chave', 'contador_atual').single()
    if (data) setSenhaAtual(data.valor)
    
    // Tenta descobrir qual foi o tipo da última (para o botão repetir funcionar melhor ao recarregar pag)
    const { data: ultChamada } = await supabase.from('fe_chamadas').select('tipo').order('id', { ascending: false }).limit(1).single()
    if (ultChamada) setUltimoTipo(ultChamada.tipo)
  }

  async function chamarProxima(preferencial: boolean = false) {
    if (!usuario || !usuario.fe_guiches) return alert('Sem guichê vinculado.')
    
    setLoading(true)
    setFeedback('')
    try {
      const { data, error } = await supabase
        .rpc('fe_chamar_proxima_senha', { 
            nome_guiche: usuario.fe_guiches.nome, 
            eh_preferencial: preferencial 
        })

      if (error) throw error

      if (data && data.length > 0) {
          setSenhaAtual(data[0].nova_senha)
          setUltimoTipo(preferencial ? 'preferencial' : 'normal')
          setFeedback(`Senha ${data[0].nova_senha} chamada!`)
          setTimeout(() => setFeedback(''), 3000)
      }
    } catch (error) {
      console.error(error)
      alert('Erro ao chamar senha.')
    } finally {
      setLoading(false)
    }
  }

  // NOVA FUNÇÃO: REPETIR
  async function repetirChamada() {
    if (!usuario || !usuario.fe_guiches || senhaAtual === null) return
    
    setLoading(true)
    try {
        await supabase.rpc('fe_repetir_senha', {
            p_numero: senhaAtual,
            p_guiche: usuario.fe_guiches.nome,
            p_tipo: ultimoTipo
        })
        setFeedback(`Senha ${senhaAtual} repetida!`)
        setTimeout(() => setFeedback(''), 3000)
    } catch (error) {
        console.error(error)
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Barra Superior */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
           <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
           Portal do Atendente
        </h1>
        <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-gray-700 flex items-center gap-1 justify-end">
                    <User className="w-3 h-3"/> {usuario?.nome}
                </div>
                <div className="text-xs text-gray-400">Logado como {usuario?.login}</div>
            </div>
            <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all" title="Sair">
                <LogOut className="w-5 h-5"/>
            </button>
        </div>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto p-6 flex flex-col justify-center">
        
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            
            {/* Info do Local */}
            <div className="bg-slate-50 p-4 border-b border-gray-100 text-center">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3" /> Local de Atendimento
                </label>
                <div className="text-xl font-bold text-blue-900">{nomeGuiche}</div>
            </div>

            <div className="p-8">
                {/* Display Senha */}
                <div className="text-center mb-8">
                    <span className="text-sm font-medium text-gray-400 uppercase">Última senha chamada</span>
                    
                    <div className="flex items-center justify-center gap-4 mt-2">
                         <div className="text-7xl font-bold text-slate-800 font-mono tracking-tighter">
                            {senhaAtual ?? '---'}
                        </div>
                    </div>

                    {/* BOTÃO REPETIR (NOVO) */}
                    <div className="mt-4">
                        <button 
                            onClick={repetirChamada}
                            disabled={loading || senhaAtual === null}
                            className="inline-flex items-center gap-2 text-slate-500 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Chamar Novamente
                        </button>
                    </div>

                    {feedback && (
                        <div className="mt-4 inline-flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full text-sm font-medium animate-fadeIn">
                            <CheckCircle className="w-4 h-4" /> {feedback}
                        </div>
                    )}
                </div>

                {/* Botões Principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        onClick={() => chamarProxima(false)}
                        disabled={loading || !usuario?.fe_guiches}
                        className="group relative flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-8 rounded-2xl transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Megaphone className="w-8 h-8 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xl font-bold">PRÓXIMO</span>
                        <span className="text-blue-200 text-xs">Chamar Normal</span>
                    </button>

                    <button 
                        onClick={() => chamarProxima(true)}
                        disabled={loading || !usuario?.fe_guiches}
                        className="group relative flex flex-col items-center justify-center gap-2 bg-white border-2 border-orange-400 hover:bg-orange-50 text-orange-600 p-8 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Megaphone className="w-8 h-8 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xl font-bold">PRIORIDADE</span>
                        <span className="text-orange-400 text-xs">Atendimento Preferencial</span>
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}