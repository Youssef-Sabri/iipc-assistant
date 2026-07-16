import { useState, useEffect } from 'react'
import { supabase, IIPCData } from '@/lib/supabase'
import type { ItemType } from '@/lib/types'
import { MAX_INITIAL_ITEMS } from '@/lib/constants'

export const useIIPCData = () => {
  const [data, setData] = useState<IIPCData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const { data: iipcData, error: fetchError } = await supabase
          .from('iipc_data')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(MAX_INITIAL_ITEMS)

        if (fetchError) throw fetchError
        setData(iipcData || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
        console.error('Error fetching IIPC data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, loading, error }
}

export const useItemTypes = () => {
  const [itemTypes, setItemTypes] = useState<ItemType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchItemTypes = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data: items, error: fetchError } = await supabase
          .from('iipc_data')
          .select('item_type')
          .not('item_type', 'is', null)

        if (fetchError) throw fetchError

        const typeCounts = new Map<string, number>()
        items?.forEach(item => {
          const type = item.item_type?.toLowerCase() || 'unknown'
          typeCounts.set(type, (typeCounts.get(type) || 0) + 1)
        })

        const sortedTypes = Array.from(typeCounts.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)

        setItemTypes(sortedTypes)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch item types')
        console.error('Error fetching item types:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchItemTypes()
  }, [])

  return { itemTypes, loading, error }
}
