import type { TableBlock } from '@framework/types'

export function TableBlockView({ block }: { block: TableBlock }) {
  return (
    <table className="fw-bbook__table">
      <tbody>
        {block.rows.map((row, i) => (
          <tr key={i}>
            <th>{row.key}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
