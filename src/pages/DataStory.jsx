import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function DataStory() {
  const { hash } = useLocation()
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Measuring the human · Indoor Thermal Physiology Metadata Atlas'
    return () => { document.title = previousTitle }
  }, [])

  return (
    <iframe
      title="Measuring the human — Atlas data story"
      src={`${import.meta.env.BASE_URL}datastory/reading.html${hash}`}
      className="block h-[100dvh] w-full border-0 bg-paper"
    />
  )
}
