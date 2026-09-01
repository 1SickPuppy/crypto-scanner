'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Alert = {
  id: number
  symbol: string
  market: string
  price: number
  change_24h: number
  volume_24h: number
  relative_volume: number
  triggered_at: string
}

function playAlert() {
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  oscillator.frequency.value = 880
  oscillator.type = 'sine'
  gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.5)
}

function AlertRow({ alert, isNew }: { alert: Alert; isNew: boolean }) {
  const isPositive = alert.change_24h > 0
  const bybitUrl = 'https://www.bybit.com/trade/usdt/' + alert.symbol.replace('USDT', '')

  return (
      <tr className={`border-b border-gray-800 transition-colors ${isNew ? 'bg-cyan-950' : 'hover:bg-gray-800'}`}>
        <td className="p-4 font-bold text-white">{alert.symbol}</td>
        <td className="p-4">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            alert.market === 'Futures' ? 'bg-purple-900 text-purple-300' : 'bg-blue-900 text-blue-300'
        }`}>
          {alert.market}
        </span>
        </td>
        <td className="p-4 text-right font-mono">${alert.price.toLocaleString()}</td>
        <td className={`p-4 text-right font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{alert.change_24h}%
        </td>
        <td className="p-4 text-right text-cyan-400 font-bold">{alert.relative_volume}x</td>
        <td className="p-4 text-right text-gray-400 font-mono text-sm">
          {new Date(alert.triggered_at).toLocaleTimeString('da-DK')}
        </td>
        <td className="p-4 text-center">
          <a href={bybitUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-cyan-600 px-3 py-1 rounded-lg">
            Bybit
          </a>
        </td>
      </tr>
  )
}

export default function Dashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [newAlertId, setNewAlertId] = useState<number | null>(null)

  async function fetchAlerts() {
    const { data } = await supabase
        .from('scanner_alerts')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(50)

    if (data) {
      setAlerts(data)
      setLastUpdate(new Date().toLocaleTimeString('da-DK'))
    }
  }

  useEffect(() => {
    fetchAlerts()

    const channel = supabase
        .channel('scanner_alerts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scanner_alerts' }, (payload) => {
          const newAlert = payload.new as Alert
          setAlerts(prev => [newAlert, ...prev].slice(0, 50))
          setLastUpdate(new Date().toLocaleTimeString('da-DK'))
          setNewAlertId(newAlert.id)
          playAlert()
          setTimeout(() => setNewAlertId(null), 3000)
        })
        .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
      <main className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-6xl mx-auto">

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-cyan-400">Crypto Scanner</h1>
              <p className="text-gray-400 mt-1">Bybit USDT Spot + Futures</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Sidst opdateret</div>
              <div className="text-cyan-400 font-mono">{lastUpdate || '—'}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-sm">Min. bevægelse</div>
              <div className="text-2xl font-bold text-green-400">10%</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-sm">Min. relativt volumen</div>
              <div className="text-2xl font-bold text-cyan-400">5x</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-sm">Alerts i dag</div>
              <div className="text-2xl font-bold text-purple-400">{alerts.length}</div>
            </div>
          </div>

          {alerts.length === 0 ? (
              <div className="bg-gray-900 rounded-xl p-12 text-center border border-gray-800">
                <div className="text-4xl mb-4">⏳</div>
                <div className="text-gray-400 text-lg">Ingen alerts endnu</div>
                <div className="text-gray-600 text-sm mt-2">Scanneren samler volumendata — alerts kommer efter 7 dage</div>
              </div>
          ) : (
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full">
                  <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-4 text-gray-400 font-medium">Symbol</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Marked</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Pris</th>
                    <th className="text-right p-4 text-gray-400 font-medium">24h %</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Rel. Vol</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Tidspunkt</th>
                    <th className="text-center p-4 text-gray-400 font-medium">Handel</th>
                  </tr>
                  </thead>
                  <tbody>
                  {alerts.map((alert) => (
                      <AlertRow key={alert.id} alert={alert} isNew={alert.id === newAlertId} />
                  ))}
                  </tbody>
                </table>
              </div>
          )}

        </div>
      </main>
  )
}