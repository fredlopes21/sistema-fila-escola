'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Lock, Mail, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    if (error || !data.user) {
      setErro('E-mail ou senha inválidos.')
      setLoading(false)
      return
    }

    const { data: perfil, error: perfilError } = await supabase
      .from('profiles')
      .select('id, full_name, email, can_access_fila, fila_role, fila_guiche_id')
      .eq('id', data.user.id)
      .single()

    if (perfilError || !perfil?.can_access_fila) {
      await supabase.auth.signOut()
      setErro('Seu usuário não possui acesso ao Sistema de Filas.')
      setLoading(false)
      return
    }

    router.replace(perfil.fila_role === 'admin' ? '/admin' : '/atendente')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-1">Acesso Restrito</h1>
          <p className="text-blue-100 text-sm">Sistema de Filas • Apps Marista</p>
        </div>
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">E-mail institucional</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="nome@maristabrasil.org" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Senha do Apps Marista</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input type="password" required autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••" />
            </div>
          </div>
          {erro && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 font-medium text-center">{erro}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-70">
            {loading ? 'Entrando...' : 'Acessar Sistema'} {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100">
          Use o mesmo e-mail e senha dos demais Apps Marista.
        </div>
      </div>
    </div>
  )
}
