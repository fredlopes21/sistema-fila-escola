'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Settings, Trash2, Plus, Save, Monitor, Newspaper, Users, LogOut, X, Volume2 } from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'geral' | 'guiches' | 'noticias' | 'usuarios'>('geral')
  const [loading, setLoading] = useState(true)

  // DADOS GERAIS
  const [senhaAtual, setSenhaAtual] = useState<number | null>(null)
  const [novaConfigSenha, setNovaConfigSenha] = useState('')

  // DADOS GUICHÊS
  const [guiches, setGuiches] = useState<any[]>([])
  const [novoGuicheNome, setNovoGuicheNome] = useState('')
  const [novoGuicheNumero, setNovoGuicheNumero] = useState('')

  // DADOS NOTÍCIAS & TV
  const [exibirNoticias, setExibirNoticias] = useState(true)
  const [tempoRotacao, setTempoRotacao] = useState<number>(20)
  const [listaFontes, setListaFontes] = useState<string[]>([])
  const [novaFonteUrl, setNovaFonteUrl] = useState('')
  const [tipoAlerta, setTipoAlerta] = useState('completo') // NOVO: completo, apenas_som, apenas_voz, mudo

  // DADOS USUÁRIOS
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [novoUserNome, setNovoUserNome] = useState('')
  const [novoUserLogin, setNovoUserLogin] = useState('')
  const [novoUserSenha, setNovoUserSenha] = useState('')
  const [novoUserGuiche, setNovoUserGuiche] = useState('')

  useEffect(() => {
    verificarAcesso()
  }, [])

  function verificarAcesso() {
    const sessao = localStorage.getItem('fila_usuario')
    if (!sessao) { router.push('/login'); return }
    const usuario = JSON.parse(sessao)
    if (usuario.perfil !== 'admin') { router.push('/atendente'); return }
    carregarTudo()
  }

  function logout() {
    localStorage.removeItem('fila_usuario')
    router.push('/login')
  }

  async function carregarTudo() {
    setLoading(true)
    
    // 1. Configs
    const { data: configs } = await supabase.from('fe_config').select('*')
    if (configs) {
      const cSenha = configs.find(c => c.chave === 'contador_atual')
      if (cSenha) setSenhaAtual(cSenha.valor)
      
      const cExibir = configs.find(c => c.chave === 'exibir_noticias')
      if (cExibir) setExibirNoticias(cExibir.valor === 1)
      
      const cTempo = configs.find(c => c.chave === 'tempo_rotacao_noticias')
      if (cTempo) setTempoRotacao(cTempo.valor)
      
      const cFontes = configs.find(c => c.chave === 'lista_fontes_noticias')
      if (cFontes && cFontes.valor_texto) {
        try { setListaFontes(JSON.parse(cFontes.valor_texto)) } catch (e) { setListaFontes([]) }
      }

      // NOVO: Carrega tipo de alerta
      const cAlerta = configs.find(c => c.chave === 'tipo_alerta')
      if (cAlerta && cAlerta.valor_texto) setTipoAlerta(cAlerta.valor_texto)
    }

    // 2. Guichês e Usuários
    const { data: g } = await supabase.from('fe_guiches').select('*').order('numero')
    if (g) setGuiches(g)
    const { data: u } = await supabase.from('fe_usuarios').select('*, fe_guiches(nome)').order('nome')
    if (u) setUsuarios(u)

    setLoading(false)
  }

  // AÇÕES
  async function salvarSenha() {
    const val = parseInt(novaConfigSenha)
    if (!isNaN(val)) {
        await supabase.from('fe_config').update({ valor: val }).eq('chave', 'contador_atual')
        setSenhaAtual(val); setNovaConfigSenha(''); alert('Contador atualizado!')
    }
  }

  async function adicionarGuiche() {
    if (!novoGuicheNome || !novoGuicheNumero) return alert('Preencha dados.')
    await supabase.from('fe_guiches').insert({ nome: novoGuicheNome, numero: parseInt(novoGuicheNumero), ativo: true })
    setNovoGuicheNome(''); setNovoGuicheNumero(''); carregarTudo()
  }

  async function excluirGuiche(id: number) {
    if (confirm('Excluir?')) { await supabase.from('fe_guiches').delete().eq('id', id); carregarTudo() }
  }

  async function salvarConfigsTV() {
    await supabase.from('fe_config').upsert([
        { chave: 'exibir_noticias', valor: exibirNoticias ? 1 : 0 },
        { chave: 'tempo_rotacao_noticias', valor: tempoRotacao },
        { chave: 'lista_fontes_noticias', valor: 0, valor_texto: JSON.stringify(listaFontes) },
        { chave: 'tipo_alerta', valor: 0, valor_texto: tipoAlerta } // Salva o novo campo
    ])
    alert('Configurações da TV salvas!')
  }

  function adicionarFonte() { if(novaFonteUrl) { setListaFontes([...listaFontes, novaFonteUrl]); setNovaFonteUrl('') } }
  function removerFonte(idx: number) { const n = [...listaFontes]; n.splice(idx, 1); setListaFontes(n) }

  async function adicionarUsuario() {
    if (!novoUserNome || !novoUserLogin || !novoUserSenha) return alert('Dados incompletos.')
    const guicheId = novoUserGuiche ? parseInt(novoUserGuiche) : null
    const { error } = await supabase.from('fe_usuarios').insert({
        nome: novoUserNome, login: novoUserLogin, senha: novoUserSenha, perfil: 'atendente', guiche_id: guicheId
    })
    if (!error) {
        setNovoUserNome(''); setNovoUserLogin(''); setNovoUserSenha(''); setNovoUserGuiche('')
        carregarTudo()
    } else alert('Erro: ' + error.message)
  }

  async function excluirUsuario(id: number) { if(confirm('Remover usuário?')) { await supabase.from('fe_usuarios').delete().eq('id', id); carregarTudo() } }

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Carregando...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="bg-slate-900 text-white p-6 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="text-emerald-400"/> Administração</h1>
            <button onClick={logout} className="flex items-center gap-2 text-xs bg-slate-800 hover:bg-red-600 px-3 py-2 rounded transition-colors"><LogOut className="w-3 h-3" /> Sair</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex gap-4 mb-8 border-b border-slate-200 overflow-x-auto">
            <button onClick={() => setActiveTab('geral')} className={`pb-3 px-4 font-bold whitespace-nowrap ${activeTab === 'geral' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Geral</button>
            <button onClick={() => setActiveTab('guiches')} className={`pb-3 px-4 font-bold whitespace-nowrap ${activeTab === 'guiches' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Guichês</button>
            <button onClick={() => setActiveTab('usuarios')} className={`pb-3 px-4 font-bold whitespace-nowrap ${activeTab === 'usuarios' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Equipe</button>
            <button onClick={() => setActiveTab('noticias')} className={`pb-3 px-4 font-bold whitespace-nowrap ${activeTab === 'noticias' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Notícias & TV</button>
        </div>

        {activeTab === 'geral' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold mb-4">Controle do Contador</h2>
                <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-50 p-6 rounded-lg">
                    <div className="text-5xl font-mono font-bold text-blue-900">{senhaAtual ?? '---'}</div>
                    <div className="flex-1 w-full flex gap-2">
                        <input type="number" placeholder="Nova Senha" value={novaConfigSenha} onChange={(e) => setNovaConfigSenha(e.target.value)} className="border p-2 rounded w-full"/>
                        <button onClick={salvarSenha} className="bg-blue-600 text-white px-4 rounded font-bold">Salvar</button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'guiches' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold mb-6">Locais de Atendimento</h2>
                <div className="space-y-2 mb-8">
                    {guiches.map((g) => (
                        <div key={g.id} className="flex justify-between bg-slate-50 p-3 rounded border border-slate-100">
                            <span className="font-medium">Guichê {g.numero} - {g.nome}</span>
                            <button onClick={() => excluirGuiche(g.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-3 bg-blue-50 p-4 rounded-lg">
                    <input type="number" placeholder="Nº" className="w-20 p-2 rounded border" value={novoGuicheNumero} onChange={e => setNovoGuicheNumero(e.target.value)}/>
                    <input type="text" placeholder="Nome" className="flex-1 p-2 rounded border" value={novoGuicheNome} onChange={e => setNovoGuicheNome(e.target.value)}/>
                    <button onClick={adicionarGuiche} className="bg-blue-600 text-white px-4 rounded font-bold">Adicionar</button>
                </div>
            </div>
        )}

        {activeTab === 'usuarios' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold mb-6">Equipe</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {usuarios.map((u) => (
                        <div key={u.id} className="border p-4 rounded flex justify-between items-center">
                            <div>
                                <div className="font-bold">{u.nome}</div>
                                <div className="text-sm text-slate-500">{u.login} | {u.fe_guiches?.nome || 'Sem Guichê'}</div>
                            </div>
                            {u.perfil !== 'admin' && <button onClick={() => excluirUsuario(u.id)} className="text-red-500"><Trash2 className="w-5 h-5"/></button>}
                        </div>
                    ))}
                </div>
                <div className="bg-emerald-50 p-5 rounded-lg border border-emerald-100 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input type="text" placeholder="Nome" className="p-2 rounded border" value={novoUserNome} onChange={e => setNovoUserNome(e.target.value)}/>
                    <input type="text" placeholder="Login" className="p-2 rounded border" value={novoUserLogin} onChange={e => setNovoUserLogin(e.target.value)}/>
                    <input type="text" placeholder="Senha" className="p-2 rounded border" value={novoUserSenha} onChange={e => setNovoUserSenha(e.target.value)}/>
                    <select className="p-2 rounded border bg-white" value={novoUserGuiche} onChange={e => setNovoUserGuiche(e.target.value)}>
                        <option value="">Guichê...</option>
                        {guiches.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                    </select>
                    <button onClick={adicionarUsuario} className="col-span-full md:col-span-4 bg-emerald-600 text-white py-2 rounded font-bold">Cadastrar</button>
                </div>
            </div>
        )}

        {activeTab === 'noticias' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-8">
                <div className="flex justify-between border-b pb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Monitor className="w-5 h-5"/> Layout TV</h2>
                    <button onClick={() => setExibirNoticias(!exibirNoticias)} className={`w-14 h-8 rounded-full p-1 transition-colors ${exibirNoticias ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`bg-white w-6 h-6 rounded-full shadow transition-transform ${exibirNoticias ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>

                {/* NOVO: SELETOR DE ÁUDIO */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Volume2 className="w-4 h-4"/> Modo de Áudio</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { id: 'completo', label: 'Som + Voz (Padrão)' },
                            { id: 'apenas_som', label: 'Apenas Som (Ding)' },
                            { id: 'apenas_voz', label: 'Apenas Voz' },
                            { id: 'mudo', label: 'Silencioso' },
                        ].map((opt) => (
                            <button 
                                key={opt.id}
                                onClick={() => setTipoAlerta(opt.id)}
                                className={`p-3 rounded-lg border text-sm font-medium transition-all ${tipoAlerta === opt.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {exibirNoticias && (
                    <div className="space-y-4 pt-4 border-t">
                        <div>
                            <label className="font-bold text-sm">Tempo Rotação (seg)</label>
                            <input type="number" value={tempoRotacao} onChange={e => setTempoRotacao(Number(e.target.value))} className="border p-2 rounded w-24 block mt-1"/>
                        </div>
                        <div>
                            <label className="font-bold text-sm mb-2 block">Fontes (WordPress)</label>
                            {listaFontes.map((url, idx) => (
                                <div key={idx} className="flex gap-2 mb-2 items-center text-xs bg-slate-50 p-2 rounded border">
                                    <span className="truncate flex-1">{url}</span>
                                    <button onClick={() => removerFonte(idx)} className="text-red-500"><X className="w-4 h-4"/></button>
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <input type="text" placeholder="https://..." className="flex-1 border p-2 rounded text-sm" value={novaFonteUrl} onChange={e => setNovaFonteUrl(e.target.value)}/>
                                <button onClick={adicionarFonte} className="bg-slate-700 text-white px-3 rounded text-sm">Add</button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="text-right pt-4">
                    <button onClick={salvarConfigsTV} className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-emerald-700 flex gap-2 ml-auto items-center"><Save className="w-5 h-5"/> Salvar Configurações</button>
                </div>
            </div>
        )}

      </div>
    </div>
  )
}