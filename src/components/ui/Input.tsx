interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="w-full">
      {label ? <label className="field-label">{label}</label> : null}
      <input
        className={`input ${error ? "border-[var(--bad)] focus:border-[var(--bad)]" : ""} ${className}`.trim()}
        {...props}
      />
      {error ? <p className="mt-1 text-sm text-[var(--bad)]">{error}</p> : null}
    </div>
  );
}
