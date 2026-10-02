import { useState, useEffect } from 'react'

const STEPS = [
  'Analyzing code structure…',
  'Finding undocumented logic…',
  'Generating documentation…',
  'Validating result…',
]

export default function LoadingState() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < STEPS.length - 1) return prev + 1
        return prev
      })
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="spinner" />

      <div className="flex flex-col gap-2">
        {STEPS.map((step, idx) => {
          let status = 'pending'
          if (idx < activeStep) status = 'done'
          else if (idx === activeStep) status = 'active'

          return (
            <div key={idx} className={`loading-step ${status}`}>
              <span className={`step-icon ${status}`}>
                {status === 'done' ? '✓' : ''}
              </span>
              <span>{step}</span>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        This may take 10–30 seconds depending on code size.
      </p>
    </div>
  )
}
