import { useEffect } from 'react'
import { useControls } from 'leva'
import { useStudioStore } from '../store/studioStore'

export function useGenerator() {
  const generator = useStudioStore((s) => s.generator)
  const genId = generator?.id ?? 'none'

  // Use function form with dependency key for dynamic schema switching
  const [params, set] = useControls(
    () => (generator ? generator.getControlsSchema() : {}),
    [genId],
  )

  useEffect(() => {
    if (generator) {
      generator.setParams(params)
    }
  }, [params, generator])

  return { generator, params, setParams: set }
}
