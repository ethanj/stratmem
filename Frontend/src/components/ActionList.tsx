//components/ActionList.tsx
type Props = { actions: string[] };

export default function ActionList({ actions }: Props) {
  return (
    <ul>
      {actions.map((a, i) => (
        <li key={i}>{a}</li>
      ))}
    </ul>
  );
}