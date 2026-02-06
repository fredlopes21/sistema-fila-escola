import Link from 'next/link'
import { Tv, Lock } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Sistema de Filas</h1>
          <p className="text-blue-200 text-lg">Selecione o módulo de acesso</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Card TV - Público */}
          <Link href="/tv" className="group bg-white/10 backdrop-blur-md border border-white/10 p-10 rounded-2xl hover:bg-white/20 transition-all cursor-pointer flex flex-col items-center text-center">
            <div className="bg-blue-500 p-5 rounded-full mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/30">
              <Tv className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Painel da TV</h2>
            <p className="text-blue-200">Exibição para o público</p>
          </Link>

          {/* Card Acesso Restrito - Login */}
          <Link href="/login" className="group bg-white/10 backdrop-blur-md border border-white/10 p-10 rounded-2xl hover:bg-white/20 transition-all cursor-pointer flex flex-col items-center text-center">
            <div className="bg-emerald-500 p-5 rounded-full mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/30">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Área Restrita</h2>
            <p className="text-blue-200">Acesso para Atendentes e Admin</p>
          </Link>
        </div>
        
        <div className="text-center mt-12 text-white/20 text-sm">v3.0 • Marista Escolas Sociais</div>
      </div>
    </div>
  )
}