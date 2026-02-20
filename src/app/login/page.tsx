'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Lock, User, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    try {
      // Busca o usuário no banco pelo login
      const { data: usuario, error } = await supabase
        .from('fe_usuarios')
        .select('*, fe_guiches(nome)') // Já traz o nome do guichê se tiver
        .eq('login', login)
        .single()

      if (error || !usuario) {
        setErro('Usuário não encontrado.')
        setLoading(false)
        return
      }

      // Verificação simples de senha (Case sensitive)
      if (usuario.senha !== senha) {
        setErro('Senha incorreta.')
        setLoading(false)
        return
      }

      // SUCESSO! Salva no LocalStorage para persistir a sessão
      // Removemos a senha antes de salvar por segurança
      const sessao = { ...usuario, senha: '' } 
      localStorage.setItem('fila_usuario', JSON.stringify(sessao))

      // Redireciona baseado no perfil
      if (usuario.perfil === 'admin') {
        router.push('/admin')
      } else {
        router.push('/atendente')
      }

    } catch (err) {
      setErro('Erro ao conectar.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="bg-blue-600 p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-1">Acesso Restrito</h1>
          <p className="text-blue-100 text-sm">Sistema de Filas Escolar</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Usuário</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input 
              type="text" 
              required
              value={login}
              onChange={e => setLogin(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Seu login"
            />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input 
                type="password" 
                required
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••"
              />
            </div>
          </div>

          {erro && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 font-medium text-center">
              {erro}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
          >
            {loading ? 'Entrando...' : 'Acessar Sistema'} 
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100">
          Caso tenha esquecido a senha, contate a Direção.
        </div>
      </div>
    </div>
  )
}