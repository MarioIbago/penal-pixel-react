export interface ScreenReaderStatusProps {
  message: string;
  assertive?: boolean;
  id?: string;
}

export function ScreenReaderStatus({
  message,
  assertive = false,
  id,
}: ScreenReaderStatusProps) {
  return (
    <div
      className="screen-reader-status"
      id={id}
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {message}
    </div>
  );
}
