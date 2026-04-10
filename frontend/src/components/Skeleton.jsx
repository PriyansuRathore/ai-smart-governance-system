export function SkeletonRow() {
  return (
    <tr className="skeleton-row">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i}><div className="skeleton-cell" /></td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return <div className="skeleton-card" />;
}
