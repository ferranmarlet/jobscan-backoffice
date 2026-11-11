import { useEffect, useState, type ReactNode } from 'react'

// reload refetches the current page, for cells that change the row on the server
export type Column<T> = { header: string; render: (row: T, reload: () => void) => ReactNode }
export type Filter = { param: string; label: string; options: { value: string; label: string }[] }

type Page<T> = {
  elements: T[]
  page: number
  totalPages: number
  totalElements: number
}

type Props<T> = {
  path: string
  columns: Column<T>[]
  rowKey: (row: T) => string
  filters?: Filter[]
}

export function PagedTable<T>({ path, columns, rowKey, filters = [] }: Props<T>) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [page, setPage] = useState(0)
  const [data, setData] = useState<Page<T> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloads, setReloads] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({
      ...Object.fromEntries(Object.entries(values).filter(([, value]) => value)),
      page: String(page),
    })
    setLoading(true)
    fetch(`/api${path}?${params}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
        return res.json()
      })
      .then((body: Page<T>) => {
        setData(body)
        setError(null)
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [path, values, page, reloads])

  const reload = () => setReloads((count) => count + 1)

  const setFilter = (param: string, value: string) => {
    setValues({ ...values, [param]: value })
    setPage(0)
  }

  const { page: number = 0, totalPages = 0, totalElements = 0 } = data ?? {}

  return (
    <>
      {filters.length > 0 && (
        <div className="filters">
          {filters.map(({ param, label, options }) => (
            <label key={param}>
              {label}
              <select value={values[param] ?? ''} onChange={(e) => setFilter(param, e.target.value)}>
                <option value="">All</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <div className="table-wrapper" aria-busy={loading}>
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.header}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.elements.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.header}>{column.render(row, reload) ?? '—'}</td>
                ))}
              </tr>
            ))}
            {!data?.elements.length && (
              <tr>
                <td className="empty" colSpan={columns.length}>
                  {loading ? 'Loading…' : error ? 'Could not load data' : 'No results'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <nav className="pagination" aria-label="Pagination">
        <span>{totalElements} results</span>
        <button disabled={loading || number === 0} onClick={() => setPage(number - 1)}>
          Previous
        </button>
        <span>
          Page {totalPages ? number + 1 : 0} of {totalPages}
        </span>
        <button disabled={loading || number + 1 >= totalPages} onClick={() => setPage(number + 1)}>
          Next
        </button>
      </nav>
    </>
  )
}
