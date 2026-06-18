import { useState, useEffect } from 'react'

let cache = null

export function useCorpusData() {
  const [data, setData] = useState(cache)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (cache) return
    const base = import.meta.env.BASE_URL
    fetch(`${base}data/bundle.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load corpus data (${res.status})`)
        return res.json()
      })
      .then((json) => {
        cache = json
        setData(json)
      })
      .catch((err) => setError(err.message))
  }, [])

  return { data, error, loading: !data && !error }
}
