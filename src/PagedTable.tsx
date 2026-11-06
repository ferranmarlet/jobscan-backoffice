import { useEffect, useState, type ReactNode } from 'react'

export type Column<T> = { header: string; render: (row: T) => ReactNode }
export type Filter = { param: string; label: string; options: { value: string; label: string }[] }

type Page<T> = {
  content: T[]
  page: { number: number; totalElements: number; totalPages: number }
}

type Props<T> = {
  path: string
  columns: Column<T>[]
  rowKey: (row: T) => string
  filters?: Filter[]
  pageSize?: number
}

export function PagedTable<T>({ path, columns, rowKey, filters = [], pageSize = 20 }: Props<T>) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [page, setPage] = useState(0)
  const [data, setData] = useState<Page<T> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({
      ...Object.fromEntries(Object.entries(values).filter(([, value]) => value)),
      page: String(page),
      size: String(pageSize),
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
  }, [path, values, page, pageSize])

  const setFilter = (param: string, value: string) => {
    setValues({ ...values, [param]: value })
    setPage(0)
  }

  const { number = 0, totalPages = 0, totalElements = 0 } = data?.page ?? {}

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
            {data?.content.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.header}>{column.render(row) ?? '—'}</td>
                ))}
              </tr>
            ))}
            {!data?.content.length && (
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
