'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { CloudSun, Play } from 'lucide-react'

interface Chamada { id: number; senha_numero: number; guiche_nome: string; tipo: string; }
interface Noticia { id: number; title: { rendered: string }; jetpack_featured_media_url?: string; link: string; _embedded?: { 'wp:featuredmedia'?: Array<{ source_url?: string }> } }
function getImagemNoticia(post: Noticia): string | null {
  if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
    // A CORREÇÃO ESTÁ AQUI: Adicionamos "|| null" ao final
    return post._embedded['wp:featuredmedia'][0].source_url || null;
  }
  return post.jetpack_featured_media_url || null;
}

export default function TvPage() {
  const [ultimaChamada, setUltimaChamada] = useState<Chamada | null>(null)
  const [historico, setHistorico] = useState<Chamada[]>([])
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [clima, setClima] = useState<string>('--°C')
  const [indiceNoticia, setIndiceNoticia] = useState(0)
  const [tempoRotacao, setTempoRotacao] = useState(20000)
  const [audioHabilitado, setAudioHabilitado] = useState(false)
  const [exibirNoticias, setExibirNoticias] = useState(true)
  const [listaFontes, setListaFontes] = useState<string[]>([])
  const [tipoAlerta, setTipoAlerta] = useState('completo') // NOVO
  
  const ultimoIdProcessado = useRef<number>(0)
  const indiceFonteAtual = useRef<number>(0);

  useEffect(() => {
    async function carregarDados() {
      try {
        const { data: configs } = await supabase.from('fe_config').select('*')
        let fontes = ['https://maristaescolassociais.org.br/wp-json/wp/v2/posts?per_page=5&_embed']

        if (configs) {
           const cTempo = configs.find(c => c.chave === 'tempo_rotacao_noticias')
           if (cTempo) setTempoRotacao(cTempo.valor * 1000)
           const cExibir = configs.find(c => c.chave === 'exibir_noticias')
           if (cExibir) setExibirNoticias(cExibir.valor === 1)
           const cFontes = configs.find(c => c.chave === 'lista_fontes_noticias')
           if (cFontes && cFontes.valor_texto) { try { const p = JSON.parse(cFontes.valor_texto); if(p.length) fontes = p } catch (e) {} }
           // NOVO: Carregar Config de Som
           const cAlerta = configs.find(c => c.chave === 'tipo_alerta')
           if (cAlerta && cAlerta.valor_texto) setTipoAlerta(cAlerta.valor_texto)
        }
        setListaFontes(fontes)
        
        // CORREÇÃO: Pega sempre a primeira fonte da lista ao iniciar
        indiceFonteAtual.current = 0;
        buscarNoticias(fontes[0]);
        
        buscarUltimaChamada(false)
      } catch (e) { console.error(e) }
    }
    carregarDados()
    fetchClima()
  }, [])

  async function buscarNoticias(url: string) {
      try { const res = await fetch(url); const data = await res.json(); if(Array.isArray(data)) setNoticias(data) } catch (e) {}
  }
  async function fetchClima() {
      try { const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-21.17&longitude=-47.81&current_weather=true'); const data = await res.json(); setClima(`${Math.round(data.current_weather.temperature)}°C`) } catch (e) {}
  }

  // --- LÓGICA INTELIGENTE DE ÁUDIO ---
  const processarNovaChamada = (chamada: Chamada, tocarSom: boolean) => {
    if (chamada.id <= ultimoIdProcessado.current) return;
    ultimoIdProcessado.current = chamada.id
    
    setUltimaChamada(chamada)
    setHistorico((prev) => { if (prev.find(c => c.id === chamada.id)) return prev; return [chamada, ...prev].slice(0, 4) })

    if (tocarSom && audioHabilitado) {
        
        // 1. Caso Mudo
        if (tipoAlerta === 'mudo') return;

        const audioBeep = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg') 
        
        // 2. Caso Apenas Som ou Completo: Toca o beep
        if (tipoAlerta === 'completo' || tipoAlerta === 'apenas_som') {
            audioBeep.play().catch(() => {})
        }

        // 3. Caso Apenas Voz ou Completo: Fala a senha
        if (tipoAlerta === 'apenas_voz') {
            falarSenha(`Senha ${chamada.senha_numero}, ${chamada.guiche_nome}`)
        } else if (tipoAlerta === 'completo') {
            // Espera 1s (tempo do beep) para falar
            setTimeout(() => falarSenha(`Senha ${chamada.senha_numero}, ${chamada.guiche_nome}`), 1000)
        }
    }
  }

  async function buscarUltimaChamada(tocarSom: boolean) {
    const { data } = await supabase.from('fe_chamadas').select('*').order('id', { ascending: false }).limit(1).single()
    if (data) processarNovaChamada(data, tocarSom)
  }

  useEffect(() => {
    if (!exibirNoticias || noticias.length === 0) return
    const intervalo = setInterval(() => {
      setIndiceNoticia((prev) => {
          const proximo = prev + 1
          
          // CORREÇÃO: Alterna sequencialmente entre as fontes cadastradas
          if (proximo >= noticias.length) { 
              indiceFonteAtual.current = (indiceFonteAtual.current + 1) % listaFontes.length;
              buscarNoticias(listaFontes[indiceFonteAtual.current]); 
              return 0;
          }
          
          return proximo
      })
    }, tempoRotacao)
    return () => clearInterval(intervalo)
  }, [noticias, tempoRotacao, exibirNoticias, listaFontes])

  useEffect(() => {
    const channel = supabase.channel('chamadas-tv-v4').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fe_chamadas' }, (payload) => processarNovaChamada(payload.new as Chamada, true)).subscribe()
    const polling = setInterval(() => { if(audioHabilitado) buscarUltimaChamada(true) }, 3000)
    return () => { supabase.removeChannel(channel); clearInterval(polling) }
  }, [audioHabilitado, tipoAlerta]) // IMPORTANTE: Recria o listener se o tipo de alerta mudar


  const falarSenha = (texto: string) => {
    // 1. Tenta usar o Som do Fully Kiosk (Fire TV / Android)
    // @ts-ignore
    if (window.fully && typeof window.fully.textToSpeech === 'function') {
      // @ts-ignore
      window.fully.textToSpeech(texto);
      return;

    }

    // 2. Fallback: Navegador Padrão (PC / Chrome)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(texto)
      u.lang = 'pt-BR'
      window.speechSynthesis.speak(u)
    }
  }

  const iniciarSistema = () => {
    setAudioHabilitado(true)
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg')
    audio.play().catch(() => {})
  }

  const noticiaAtual = noticias[indiceNoticia]

  if (!audioHabilitado) return <div className="flex h-screen w-full bg-blue-900 items-center justify-center flex-col text-white font-sans p-4 text-center"><h1 className="text-4xl font-bold mb-8">Painel TV</h1><button onClick={iniciarSistema} className="bg-white text-blue-900 px-10 py-5 rounded-xl text-xl font-bold shadow-2xl hover:scale-105 transition-all flex items-center gap-3"><Play className="fill-blue-900"/> INICIAR APRESENTAÇÃO</button></div>

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden font-sans">
      {exibirNoticias && (
        <div className="w-[35%] relative flex flex-col bg-black text-white border-r border-gray-800 transition-all duration-500">
            <div className="absolute top-0 left-0 w-full z-20 bg-gradient-to-b from-black/90 to-transparent p-6">
            <div className="flex items-center gap-4"><CloudSun className="w-12 h-12 text-yellow-400 drop-shadow-lg" /><div><h2 className="text-lg font-bold text-gray-200">Ribeirão Preto</h2><p className="text-4xl font-light tracking-tight">{clima}</p></div></div>
            </div>
            <div className="flex-1 relative w-full h-full overflow-hidden bg-gray-900">
            {noticiaAtual && (
                (() => {
                const img = getImagemNoticia(noticiaAtual);
                return (<>{img ? <img key={noticiaAtual.id} src={img} alt="Notícia" className="absolute inset-0 w-full h-full object-cover animate-fadeIn opacity-80" /> : <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-900 to-blue-950 flex items-center justify-center"><span className="text-white/10 font-bold text-5xl -rotate-12 select-none">INFO</span></div>}<div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div><div className="absolute bottom-0 w-full p-8 pb-12 bg-blue-900/40 backdrop-blur-md border-t border-white/10"><div className="mb-2"><span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Informativo</span></div><h3 className="text-white font-bold text-xl leading-snug drop-shadow-lg font-serif" dangerouslySetInnerHTML={{ __html: noticiaAtual.title.rendered }} /></div></>);
                })()
            )}
            <div className="absolute bottom-4 right-6 flex gap-2 z-30">{noticias.map((_, idx) => <div key={idx} className={`h-1.5 rounded-full transition-all duration-500 shadow-sm ${idx === indiceNoticia ? 'w-8 bg-blue-400' : 'w-2 bg-white/30'}`} />)}</div>
            </div>
        </div>
      )}
      <div className={`${exibirNoticias ? 'w-[65%]' : 'w-full'} flex flex-col bg-white transition-all duration-500`}>
        <div className="flex-1 flex flex-col items-center justify-center p-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-[0.03] text-blue-900 pointer-events-none"><svg width="400" height="400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg></div>
            {ultimaChamada ? (
                <div className="text-center z-10 animate-pulse-once">
                    <h2 className="text-3xl text-gray-400 uppercase tracking-[0.3em] mb-6 font-semibold">Senha Atual</h2>
                    <div className={`${exibirNoticias ? 'text-[12rem] md:text-[14rem]' : 'text-[18rem] md:text-[22rem]'} font-bold text-blue-900 leading-none tracking-tighter drop-shadow-2xl transition-all duration-500`}>{ultimaChamada.senha_numero}</div>
                    <div className="mt-8 inline-block bg-blue-50 text-blue-900 px-16 py-6 rounded-2xl text-4xl md:text-6xl font-bold border-2 border-blue-100 shadow-sm">{ultimaChamada.guiche_nome}</div>
                    {ultimaChamada.tipo === 'preferencial' && <div className="mt-8 text-yellow-600 font-bold text-3xl uppercase tracking-widest animate-bounce bg-yellow-50 px-8 py-3 rounded-full border border-yellow-200">Atendimento Preferencial</div>}
                </div>
            ) : <div className="flex flex-col items-center text-gray-300"><div className="text-9xl mb-4 opacity-20">...</div><div className="text-3xl font-light uppercase tracking-widest">Aguardando chamada</div></div>}
        </div>
        <div className="h-40 bg-gray-50 flex items-center px-10 gap-8 border-t border-gray-200 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col border-r border-gray-300 pr-8"><span className="text-gray-400 font-bold uppercase text-xs tracking-widest">Últimas</span><span className="text-gray-400 font-bold uppercase text-xs tracking-widest">Chamadas</span></div>
            <div className="flex gap-4 overflow-x-auto pb-2 w-full">{historico.slice(1).map((chamada) => (<div key={chamada.id} className="bg-white border border-gray-200 px-6 py-4 rounded-lg shadow-sm flex flex-col items-center min-w-[150px] opacity-70"><span className="text-4xl font-bold text-gray-600">{chamada.senha_numero}</span><span className="text-xs uppercase font-bold text-gray-400 mt-1 truncate max-w-[120px]">{chamada.guiche_nome}</span></div>))}</div>
        </div>
      </div>
    </div>
  )
}