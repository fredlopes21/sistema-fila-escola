'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Settings, Trash2, Plus, Save, Monitor, Newspaper, Users, LogOut, X, Volume2, Ticket, Printer, Edit } from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'geral' | 'guiches' | 'noticias' | 'usuarios'>('geral')
  const [loading, setLoading] = useState(true)

  // DADOS GERAIS
  const [senhaAtual, setSenhaAtual] = useState<number | null>(null)
  const [novaConfigSenha, setNovaConfigSenha] = useState('')
  const [modoOperacao, setModoOperacao] = useState('manual')

  // DADOS GUICHÊS
  const [guiches, setGuiches] = useState<any[]>([])
  const [novoGuicheNome, setNovoGuicheNome] = useState('')
  const [novoGuicheNumero, setNovoGuicheNumero] = useState('')
  const [editandoGuicheId, setEditandoGuicheId] = useState<number | null>(null) // Controle de Edição

  // DADOS NOTÍCIAS & TV
  const [exibirNoticias, setExibirNoticias] = useState(true)
  const [tempoRotacao, setTempoRotacao] = useState<number>(20)
  const [listaFontes, setListaFontes] = useState<string[]>([])
  const [novaFonteUrl, setNovaFonteUrl] = useState('')
  const [tipoAlerta, setTipoAlerta] = useState('completo')

  // DADOS USUÁRIOS
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [novoUserNome, setNovoUserNome] = useState('')
  const [novoUserLogin, setNovoUserLogin] = useState('')
  const [novoUserSenha, setNovoUserSenha] = useState('')
  const [novoUserGuiche, setNovoUserGuiche] = useState('')
  const [editandoUserId, setEditandoUserId] = useState<number | null>(null) // Controle de Edição

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

      const cAlerta = configs.find(c => c.chave === 'tipo_alerta')
      if (cAlerta && cAlerta.valor_texto) setTipoAlerta(cAlerta.valor_texto)

      const cModo = configs.find(c => c.chave === 'modo_operacao')
      if (cModo && cModo.valor_texto) setModoOperacao(cModo.valor_texto)
    }

    // 2. Guichês e Usuários
    const { data: g } = await supabase.from('fe_guiches').select('*').order('numero')
    if (g) setGuiches(g)
    const { data: u } = await supabase.from('fe_usuarios').select('*, fe_guiches(nome)').order('nome')
    if (u) setUsuarios(u)

    setLoading(false)
  }

  // --- AÇÕES GERAIS ---
  async function salvarSenha() {
    const val = parseInt(novaConfigSenha)
    if (!isNaN(val)) {
        await supabase.from('fe_config').update({ valor: val }).eq('chave', 'contador_atual')
        setSenhaAtual(val); setNovaConfigSenha(''); alert('Contador atualizado!')
    }
  }

  async function mudarModoOperacao(novoModo: string) {
      await supabase.from('fe_config').upsert({ chave: 'modo_operacao', valor_texto: novoModo, valor: 0 })
      setModoOperacao(novoModo)
  }

  async function resetarFila() {
      if(confirm('Tem certeza? Isso vai zerar o contador para 0.')) {
        await supabase.from('fe_config').update({ valor: 0 }).eq('chave', 'contador_atual')
        setSenhaAtual(0)
        alert('Fila reiniciada!')
      }
  }

  // --- AÇÕES DE GUICHÊS ---
  function iniciarEdicaoGuiche(g: any) {
      setEditandoGuicheId(g.id)
      setNovoGuicheNumero(g.numero.toString())
      setNovoGuicheNome(g.nome)
  }

  function cancelarEdicaoGuiche() {
      setEditandoGuicheId(null)
      setNovoGuicheNumero('')
      setNovoGuicheNome('')
  }

  async function salvarGuiche() {
    if (!novoGuicheNome || !novoGuicheNumero) return alert('Preencha os dados.')
    
    if (editandoGuicheId) {
        // Atualizar
        await supabase.from('fe_guiches').update({ 
            nome: novoGuicheNome, 
            numero: parseInt(novoGuicheNumero) 
        }).eq('id', editandoGuicheId)
        alert('Guichê atualizado com sucesso!')
    } else {
        // Criar Novo
        await supabase.from('fe_guiches').insert({ 
            nome: novoGuicheNome, 
            numero: parseInt(novoGuicheNumero), 
            ativo: true 
        })
    }
    
    cancelarEdicaoGuiche()
    carregarTudo()
  }

  async function excluirGuiche(id: number) {
    if (confirm('Excluir este guichê?')) { await supabase.from('fe_guiches').delete().eq('id', id); carregarTudo() }
  }

  // --- AÇÕES DE USUÁRIOS ---
  function iniciarEdicaoUsuario(u: any) {
      setEditandoUserId(u.id)
      setNovoUserNome(u.nome)
      setNovoUserLogin(u.login)
      setNovoUserSenha(u.senha)
      setNovoUserGuiche(u.guiche_id ? u.guiche_id.toString() : '')
  }

  function cancelarEdicaoUsuario() {
      setEditandoUserId(null)
      setNovoUserNome('')
      setNovoUserLogin('')
      setNovoUserSenha('')
      setNovoUserGuiche('')
  }

  async function salvarUsuario() {
    if (!novoUserNome || !novoUserLogin || !novoUserSenha) return alert('Dados incompletos.')
    const guicheId = novoUserGuiche ? parseInt(novoUserGuiche) : null
    
    if (editandoUserId) {
        // Atualizar
        const { error } = await supabase.from('fe_usuarios').update({
            nome: novoUserNome, login: novoUserLogin, senha: novoUserSenha, guiche_id: guicheId
        }).eq('id', editandoUserId)
        
        if (!error) {
            alert('Usuário atualizado com sucesso!')
            cancelarEdicaoUsuario()
            carregarTudo()
        } else alert('Erro ao atualizar: ' + error.message)
    } else {
        // Criar Novo
        const { error } = await supabase.from('fe_usuarios').insert({
            nome: novoUserNome, login: novoUserLogin, senha: novoUserSenha, perfil: 'atendente', guiche_id: guicheId
        })
        
        if (!error) {
            cancelarEdicaoUsuario()
            carregarTudo()
        } else {
            if (error.code === '23505') alert('Este login já existe!')
            else alert('Erro: ' + error.message)
        }
    }
  }

  async function excluirUsuario(id: number) { 
      if(confirm('Remover usuário?')) { await supabase.from('fe_usuarios').delete().eq('id', id); carregarTudo() } 
  }

  // --- AÇÕES DA TV ---
  async function salvarConfigsTV() {
    await supabase.from('fe_config').upsert([
        { chave: 'exibir_noticias', valor: exibirNoticias ? 1 : 0 },
        { chave: 'tempo_rotacao_noticias', valor: tempoRotacao },
        { chave: 'lista_fontes_noticias', valor: 0, valor_texto: JSON.stringify(listaFontes) },
        { chave: 'tipo_alerta', valor: 0, valor_texto: tipoAlerta }
    ])
    alert('Configurações da TV salvas!')
  }

  function adicionarFonte() { if(novaFonteUrl) { setListaFontes([...listaFontes, novaFonteUrl]); setNovaFonteUrl('') } }
  function removerFonte(idx: number) { const n = [...listaFontes]; n.splice(idx, 1); setListaFontes(n) }

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

        {/* ABA GERAL */}
        {activeTab === 'geral' && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">Modo de Operação</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={() => mudarModoOperacao('manual')} className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${modoOperacao === 'manual' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 hover:border-blue-200'}`}>
                            <Ticket className="w-8 h-8 mb-2"/><span className="font-bold">Senhas de Papel (Manual)</span><span className="text-xs text-center mt-1">O admin define o número inicial baseado no rolo físico.</span>
                        </button>
                        <button onClick={() => mudarModoOperacao('totem')} className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${modoOperacao === 'totem' ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-slate-200 hover:border-purple-200'}`}>
                            <Printer className="w-8 h-8 mb-2"/><span className="font-bold">Totem / Digital (Futuro)</span><span className="text-xs text-center mt-1">O sistema gera as senhas automaticamente (1, 2, 3...) via tablet.</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold mb-4">Controle do Contador</h2>
                    <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-50 p-6 rounded-lg">
                        <div>
                            <div className="text-sm text-slate-500 uppercase font-bold">Senha Atual</div>
                            <div className="text-5xl font-mono font-bold text-blue-900">{senhaAtual ?? '---'}</div>
                        </div>
                        <div className="h-px w-full md:w-px md:h-16 bg-slate-300"></div>
                        <div className="flex-1 w-full">
                            {modoOperacao === 'manual' ? (
                                <>
                                    <label className="block text-sm font-medium mb-1 text-blue-800">Definir senha do rolo físico:</label>
                                    <div className="flex gap-2">
                                        <input type="number" placeholder="Ex: 499" value={novaConfigSenha} onChange={(e) => setNovaConfigSenha(e.target.value)} className="border p-2 rounded w-full md:w-32"/>
                                        <button onClick={salvarSenha} className="bg-blue-600 text-white px-4 rounded font-bold hover:bg-blue-700">Definir</button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Digite o número anterior ao que está na ponta do rolo.</p>
                                </>
                            ) : (
                                <>
                                    <label className="block text-sm font-medium mb-1 text-purple-800">Controle Automático (Totem)</label>
                                    <div className="flex items-center gap-4">
                                        <button onClick={resetarFila} className="bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded font-bold hover:bg-red-200 w-full md:w-auto">Zerar Fila do Dia (Reiniciar)</button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">No modo Totem, você apenas zera o sistema no início do dia.</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ABA GUICHÊS */}
        {activeTab === 'guiches' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold mb-6">Locais de Atendimento</h2>
                <div className="space-y-2 mb-8">
                    {guiches.map((g) => (
                        <div key={g.id} className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100">
                            <span className="font-medium">Guichê {g.numero} - {g.nome}</span>
                            <div className="flex gap-2">
                                <button onClick={() => iniciarEdicaoGuiche(g)} className="text-blue-500 hover:text-blue-700 p-2" title="Editar"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => excluirGuiche(g.id)} className="text-red-400 hover:text-red-600 p-2" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* FORMULÁRIO DE GUICHÊ */}
                <div className={`${editandoGuicheId ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'} p-4 rounded-lg border`}>
                    <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${editandoGuicheId ? 'text-amber-800' : 'text-blue-800'}`}>
                        {editandoGuicheId ? <Edit className="w-4 h-4"/> : <Plus className="w-4 h-4"/>} 
                        {editandoGuicheId ? 'Editando Guichê' : 'Novo Guichê'}
                    </h3>
                    <div className="flex gap-3">
                        <input type="number" placeholder="Nº" className="w-20 p-2 rounded border" value={novoGuicheNumero} onChange={e => setNovoGuicheNumero(e.target.value)}/>
                        <input type="text" placeholder="Nome" className="flex-1 p-2 rounded border" value={novoGuicheNome} onChange={e => setNovoGuicheNome(e.target.value)}/>
                        <button onClick={salvarGuiche} className={`${editandoGuicheId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 rounded font-bold`}>
                            {editandoGuicheId ? 'Atualizar' : 'Adicionar'}
                        </button>
                        {editandoGuicheId && (
                            <button onClick={cancelarEdicaoGuiche} className="bg-slate-300 text-slate-700 px-4 rounded font-bold hover:bg-slate-400">Cancelar</button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* ABA USUÁRIOS */}
        {activeTab === 'usuarios' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold mb-6">Equipe</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {usuarios.map((u) => (
                        <div key={u.id} className="border p-4 rounded flex justify-between items-center">
                            <div>
                                <div className="font-bold flex items-center gap-2">
                                    {u.nome}
                                    {u.perfil === 'admin' && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full uppercase">Admin</span>}
                                </div>
                                <div className="text-sm text-slate-500">{u.login} | {u.fe_guiches?.nome || 'Sem Guichê'}</div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => iniciarEdicaoUsuario(u)} className="text-blue-500 hover:text-blue-700 p-2"><Edit className="w-5 h-5"/></button>
                                {u.perfil !== 'admin' && (
                                    <button onClick={() => excluirUsuario(u.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 className="w-5 h-5"/></button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* FORMULÁRIO DE USUÁRIO */}
                <div className={`${editandoUserId ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-100'} p-5 rounded-lg border`}>
                    <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${editandoUserId ? 'text-amber-800' : 'text-emerald-800'}`}>
                        {editandoUserId ? <Edit className="w-4 h-4"/> : <Plus className="w-4 h-4"/>} 
                        {editandoUserId ? 'Editando Usuário' : 'Cadastrar Novo Atendente'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input type="text" placeholder="Nome" className="p-2 rounded border" value={novoUserNome} onChange={e => setNovoUserNome(e.target.value)}/>
                        <input type="text" placeholder="Login" className="p-2 rounded border" value={novoUserLogin} onChange={e => setNovoUserLogin(e.target.value)}/>
                        <input type="text" placeholder="Senha" className="p-2 rounded border" value={novoUserSenha} onChange={e => setNovoUserSenha(e.target.value)}/>
                        <select className="p-2 rounded border bg-white" value={novoUserGuiche} onChange={e => setNovoUserGuiche(e.target.value)}>
                            <option value="">Guichê...</option>
                            {guiches.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                        </select>
                        <div className="col-span-full md:col-span-4 flex gap-2 mt-2">
                            <button onClick={salvarUsuario} className={`flex-1 text-white py-2 rounded font-bold ${editandoUserId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                                {editandoUserId ? 'Atualizar Usuário' : 'Cadastrar Usuário'}
                            </button>
                            {editandoUserId && (
                                <button onClick={cancelarEdicaoUsuario} className="bg-slate-300 text-slate-700 px-6 py-2 rounded font-bold hover:bg-slate-400">Cancelar</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ABA NOTÍCIAS & TV */}
        {activeTab === 'noticias' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-8">
                <div className="flex justify-between border-b pb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Monitor className="w-5 h-5"/> Layout TV</h2>
                    <button onClick={() => setExibirNoticias(!exibirNoticias)} className={`w-14 h-8 rounded-full p-1 transition-colors ${exibirNoticias ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`bg-white w-6 h-6 rounded-full shadow transition-transform ${exibirNoticias ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Volume2 className="w-4 h-4"/> Modo de Áudio</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[{ id: 'completo', label: 'Som + Voz' }, { id: 'apenas_som', label: 'Apenas Som' }, { id: 'apenas_voz', label: 'Apenas Voz' }, { id: 'mudo', label: 'Silencioso' }].map((opt) => (
                            <button key={opt.id} onClick={() => setTipoAlerta(opt.id)} className={`p-3 rounded-lg border text-sm font-medium transition-all ${tipoAlerta === opt.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{opt.label}</button>
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