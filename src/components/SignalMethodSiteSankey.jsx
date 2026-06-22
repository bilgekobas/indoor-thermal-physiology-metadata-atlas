import { useMemo } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Signal → sensing method → body site Sankey. Complements the existing
// signal → sensor type → brand Sankey: that one is about market/instrument
// choice, this one is about measurement validity context — which mechanism
// (ECG vs. OHR/PPG, thermocouple vs. infrared) is used at which body site.
// Brand is deliberately excluded here; sensing-method-and-site is the more
// direct lens for agreeability concerns (two devices from one brand can
// differ in validation tier; ECG-vs-PPG is a real mechanistic difference).
const DOMAIN_ORDER = [
  'PERIPHERAL THERMAL EXCHANGE', 'CARDIOVASCULAR HEAT TRANSPORT', 'CENTRAL THERMAL STATE',
  'SUDOMOTOR / ELECTRODERMAL', 'NEURO-MUSCULAR ELECTROPHYSIOLOGY', 'METABOLIC & BIOCHEMICAL',
]
const DOMAIN_GROUPS = {
  'PERIPHERAL THERMAL EXCHANGE': { color: '#005EF5', signals: ['Skin temperature', 'Near body temperature', 'Heat flux', 'Skin blood flow'] },
  'CARDIOVASCULAR HEAT TRANSPORT': { color: '#31393C', signals: ['Heart/Pulse rate', 'Blood pressure', 'Oxygen saturation'] },
  'CENTRAL THERMAL STATE': { color: '#FF5964', signals: ['Core/Body temperature', 'Exhaled breath temperature'] },
  'SUDOMOTOR / ELECTRODERMAL': { color: '#8A8783', signals: ['Sweat indicators', 'Skin conductance'] },
  'NEURO-MUSCULAR ELECTROPHYSIOLOGY': { color: '#5C6166', signals: ['EEG', 'EMG', 'EOG', 'Movement', 'Respiration'] },
  'METABOLIC & BIOCHEMICAL': { color: '#BBBBBB', signals: ['Metabolic rate/Gas exchange', 'Biomarkers'] },
}
function layoutColumn(entries, { x, gap, pxPerUnit, minH }) {
  let y = 0
  const nodes = entries.map((e) => {
    const h = Math.max(minH, e.total * pxPerUnit)
    const n = { ...e, x, y, h }
    y += h + gap
    return n
  })
  return { nodes, totalHeight: y - gap }
}

const SIGNAL_MIN = 5   // signals need >=5 studies to get their own column-1 node
const METHOD_MIN = 2   // sensing methods need >=2 occurrences to get their own column-2 node
const SITE_MIN = 3     // sites need >=3 total occurrences (among active signals) for their own column-3 node

export default function SignalMethodSiteSankey({ data }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()

  const layout = useMemo(() => {
    const sigTotals = {}
    data.forEach((r) => { sigTotals[r.signal] = (sigTotals[r.signal] || 0) + r.count })
    const activeSignalNames = Object.keys(sigTotals).filter((s) => sigTotals[s] >= SIGNAL_MIN)

    const signalEntries = []
    DOMAIN_ORDER.forEach((domain) => {
      const group = DOMAIN_GROUPS[domain]
      group.signals.filter((s) => activeSignalNames.includes(s)).sort((a, b) => sigTotals[b] - sigTotals[a])
        .forEach((s) => signalEntries.push({ name: s, total: sigTotals[s], color: group.color, domain }))
    })

    const methodTotalsAll = {}
    data.forEach((r) => { if (sigTotals[r.signal] >= SIGNAL_MIN) methodTotalsAll[r.sensing_method] = (methodTotalsAll[r.sensing_method] || 0) + r.count })
    const methodTotals = Object.fromEntries(Object.entries(methodTotalsAll).filter(([, v]) => v >= METHOD_MIN))
    const nSmallMethods = Object.keys(methodTotalsAll).length - Object.keys(methodTotals).length
    const methodDomain = {}
    data.forEach((r) => {
      const sig = signalEntries.find((s) => s.name === r.signal)
      if (!sig) return
      const key = r.sensing_method
      if (!methodDomain[key]) methodDomain[key] = {}
      methodDomain[key][sig.domain] = (methodDomain[key][sig.domain] || 0) + r.count
    })
    const methodEntries = Object.entries(methodTotals).map(([name, total]) => {
      const domainCounts = methodDomain[name] || {}
      const primaryDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
      return { name, total, color: '#5F5E58', domain: primaryDomain }
    }).sort((a, b) => {
      const da = DOMAIN_ORDER.indexOf(a.domain), db = DOMAIN_ORDER.indexOf(b.domain)
      return da !== db ? da - db : b.total - a.total
    })

    const activeMethodNames = methodEntries.map((m) => m.name)
    const siteTotalsAll = {}
    data.forEach((r) => { if (activeMethodNames.includes(r.sensing_method)) siteTotalsAll[r.site] = (siteTotalsAll[r.site] || 0) + r.count })
    const siteTotals = Object.fromEntries(Object.entries(siteTotalsAll).filter(([, v]) => v >= SITE_MIN))
    const nSmallSites = Object.keys(siteTotalsAll).length - Object.keys(siteTotals).length

    const methodOfSite = {}
    data.forEach((r) => {
      if (!activeMethodNames.includes(r.sensing_method)) return
      const s = r.site
      if (!methodOfSite[s]) methodOfSite[s] = {}
      methodOfSite[s][r.sensing_method] = (methodOfSite[s][r.sensing_method] || 0) + r.count
    })
    const methodOrderIndex = {}
    methodEntries.forEach((m, i) => { methodOrderIndex[m.name] = i })
    const siteEntries = Object.entries(siteTotals).map(([name, total]) => {
      const methods = methodOfSite[name] || {}
      const primaryMethod = Object.entries(methods).sort((a, b) => b[1] - a[1])[0]?.[0]
      return { name, total, primaryMethod }
    }).sort((a, b) => {
      const ia = methodOrderIndex[a.primaryMethod] ?? 999, ib = methodOrderIndex[b.primaryMethod] ?? 999
      return ia !== ib ? ia - ib : b.total - a.total
    })

    const COL_SIGNAL = 230, COL_METHOD = 560, COL_SITE = 860
    const sigLayout = layoutColumn(signalEntries, { x: COL_SIGNAL, gap: 6, pxPerUnit: 0.62, minH: 8 })
    const methodLayout = layoutColumn(methodEntries, { x: COL_METHOD, gap: 5, pxPerUnit: 0.62, minH: 7 })
    const siteLayout = layoutColumn(siteEntries, { x: COL_SITE, gap: 5, pxPerUnit: 0.62, minH: 7 })
    const H = Math.max(sigLayout.totalHeight, methodLayout.totalHeight, siteLayout.totalHeight) + 40

    const domainLayout = []
    DOMAIN_ORDER.forEach((domain) => {
      const sigsInDomain = sigLayout.nodes.filter((n) => n.domain === domain)
      if (sigsInDomain.length === 0) return
      const top = sigsInDomain[0].y
      const bottom = sigsInDomain[sigsInDomain.length - 1].y + sigsInDomain[sigsInDomain.length - 1].h
      domainLayout.push({ name: domain, color: DOMAIN_GROUPS[domain].color, y: top, h: bottom - top })
    })

    const sigMethodLinks = []
    data.forEach((r) => {
      const sig = sigLayout.nodes.find((n) => n.name === r.signal)
      const method = methodLayout.nodes.find((n) => n.name === r.sensing_method)
      if (!sig || !method) return
      sigMethodLinks.push({ from: sig, to: method, count: r.count, label: `${r.signal} → ${r.sensing_method}` })
    })
    const methodSiteLinks = []
    data.forEach((r) => {
      const method = methodLayout.nodes.find((n) => n.name === r.sensing_method)
      const site = siteLayout.nodes.find((n) => n.name === r.site)
      if (!method || !site) return
      methodSiteLinks.push({ from: method, to: site, count: r.count, label: `${r.sensing_method} → ${r.site}` })
    })

    return {
      domain: domainLayout, signal: sigLayout.nodes, method: methodLayout.nodes, site: siteLayout.nodes,
      sigMethodLinks, methodSiteLinks, W: COL_SITE + 200, H,
      maxFlow: Math.max(...data.map((r) => r.count), 1), nSmallSites, nSmallMethods,
    }
  }, [data])

  function FlowPath({ link, color, maxFlow }) {
    const strokeW = Math.max(0.6, (link.count / maxFlow) * 22)
    const x1 = link.from.x + 14, y1 = link.from.y + link.from.h / 2
    const x2 = link.to.x, y2 = link.to.y + link.to.h / 2
    const mx = (x1 + x2) / 2
    return (
      <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} fill="none" stroke={color} strokeWidth={strokeW} opacity={0.26}
        className="cursor-default hover:opacity-70 transition-opacity"
        onMouseEnter={(e) => showTip(e, `${link.label}: ${link.count} studies`)} onMouseMove={moveTip} onMouseLeave={hideTip} />
    )
  }

  return (
    <div>
      <p className="text-[12.5px] text-inkmid mb-4">
        Sensing methods used only once ({layout.nSmallMethods} of them) and body sites used in fewer than 3
        studies ({layout.nSmallSites} of them) are omitted to keep the diagram readable. Flow width and node
        bar length are both proportional to study count (widest flow = {layout.maxFlow} studies).
      </p>
      <div className="flex flex-wrap gap-3 mb-4">
        {DOMAIN_ORDER.map((name) => (
          <div key={name} className="flex items-center gap-1.5 text-[11px] text-inkmid">
            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: DOMAIN_GROUPS[name].color }} />
            <span>{name}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg width={layout.W} height={layout.H} className="font-data block">
          {layout.domain.map((d) => (<rect key={d.name} x={0} y={d.y} width={6} height={Math.max(d.h, 4)} fill={d.color} rx={1.5} />))}
          {layout.sigMethodLinks.map((l, i) => (<FlowPath key={`sm-${i}`} link={l} color={l.from.color} maxFlow={layout.maxFlow} />))}
          {layout.methodSiteLinks.map((l, i) => (<FlowPath key={`ms-${i}`} link={l} color="#5F5E58" maxFlow={layout.maxFlow} />))}
          {layout.signal.map((n) => (
            <g key={n.name} onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} studies`)} onMouseMove={moveTip} onMouseLeave={hideTip} className="cursor-default">
              <rect x={n.x} y={n.y} width={14} height={n.h} fill={n.color} rx={2} />
              <text x={n.x + 18} y={n.y + n.h / 2 + 3.5} fontSize={10.5} fill="#1A1A18">{n.name}, {n.total}</text>
            </g>
          ))}
          {layout.method.map((n) => (
            <g key={n.name} onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} studies`)} onMouseMove={moveTip} onMouseLeave={hideTip} className="cursor-default">
              <rect x={n.x} y={n.y} width={14} height={n.h} fill="#5F5E58" rx={2} />
              <text x={n.x + 18} y={n.y + n.h / 2 + 3.5} fontSize={10} fill="#1A1A18">{n.name}</text>
            </g>
          ))}
          {layout.site.map((n) => (
            <g key={n.name} onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} studies`)} onMouseMove={moveTip} onMouseLeave={hideTip} className="cursor-default">
              <rect x={n.x} y={n.y} width={14} height={n.h} fill="#A8A59C" rx={2} />
              <text x={n.x + 18} y={n.y + n.h / 2 + 3.5} fontSize={10} fill="#1A1A18">{n.name}</text>
            </g>
          ))}
          <text x={230} y={12} fontSize={10} fill="#A8A59C" fontWeight="600">SIGNAL</text>
          <text x={560} y={12} fontSize={10} fill="#A8A59C" fontWeight="600">SENSING METHOD</text>
          <text x={860} y={12} fontSize={10} fill="#A8A59C" fontWeight="600">BODY SITE</text>
        </svg>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
