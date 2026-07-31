import type { BirthData } from '@/types'
import { birthDetails } from '@/lib/chartExport'

interface Props {
  birthData: BirthData
  system: 'Vedic' | 'Western'
}

export function PrintChartHeader({ birthData, system }: Props) {
  return (
    <header className="hidden print:flex print-brand-header">
      <div className="print-brand-lockup">
        <img src="/logo.svg" alt="ViaStellis" className="print-brand-logo" />
        <div>
          <p className="print-brand-name">ViaStellis</p>
          <p className="print-brand-url">viastellis.com</p>
          <p className="print-brand-powered">Powered by ViaStellis</p>
        </div>
      </div>
      <div className="print-chart-meta">
        <p className="print-chart-title">{birthData.name}'s Birth Chart</p>
        <p className="print-chart-details">{system} astrology | {birthDetails(birthData)}</p>
      </div>
    </header>
  )
}
