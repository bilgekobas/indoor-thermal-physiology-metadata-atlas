import { useState, useEffect } from 'react'

let cache = null

export function useCorpusData() {
  const [data, setData] = useState(cache)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (cache) return
    const base = import.meta.env.BASE_URL
    // The open-data artifact carries the resource-level metadata used by the
    // context chapter, so it is loaded independently rather than reducing it
    // to the compact copy embedded in bundle.json.
    Promise.all([
      fetch(`${base}data/bundle.json`, { cache: 'no-cache' }),
      fetch(`${base}data/open_data.json`, { cache: 'no-cache' }),
    ])
      .then(async ([bundleResponse, openDataResponse]) => {
        if (!bundleResponse.ok) throw new Error(`Failed to load corpus data (${bundleResponse.status})`)
        if (!openDataResponse.ok) throw new Error(`Failed to load open-data records (${openDataResponse.status})`)
        const [bundle, open_data] = await Promise.all([bundleResponse.json(), openDataResponse.json()])
        return { ...bundle, open_data }
      })
      .then((json) => {
        cache = json
        setData(json)
      })
      .catch((err) => setError(err.message))
  }, [])

  return { data, error, loading: !data && !error }
}
