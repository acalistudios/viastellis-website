import { useNavigate } from 'react-router-dom'

export function OnboardingPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-cosmos-950">
      <h1 className="text-5xl font-display text-stardust-300 mb-3">ViaStellis</h1>
      <p className="text-slate-400 mb-2">Your path through the stars</p>
      <p className="text-stardust-400 text-sm mb-12">Guided by Stella, your personal astrologer</p>

      <div className="w-24 h-24 rounded-full bg-cosmos-800 border-2 border-stardust-400 flex items-center justify-center mb-12">
        <span className="text-4xl">✦</span>
      </div>

      <button
        onClick={() => navigate('/auth')}
        className="bg-stardust-400 hover:bg-stardust-300 text-cosmos-950 font-semibold px-8 py-3 rounded-full transition-colors"
      >
        Begin Your Journey
      </button>

      <p className="mt-8 text-xs text-slate-600 max-w-xs">
        All insights are for entertainment purposes only.
      </p>
    </div>
  )
}
