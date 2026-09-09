import { useEffect, useRef, useState } from 'react';
import Button from './Button.jsx';
import { TrashIcon } from './Icons.jsx';

/**
 * Button that requires a second click to confirm the destructive action.
 * The confirmation state resets automatically after 3 seconds.
 */
export default function ConfirmButton({
  label,
  confirmLabel = 'Confirm',
  icon,
  onConfirm,
  className = '',
  disabled = false,
  ...props
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function handleClick() {
    if (armed) {
      clearTimeout(timer.current);
      setArmed(false);
      onConfirm();
    } else {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 3000);
    }
  }

  return (
    <Button
      variant={armed ? 'danger' : 'secondary'}
      size="sm"
      onClick={handleClick}
      disabled={disabled}
      className={className}
      {...props}
    >
      {icon ?? <TrashIcon className="h-4 w-4" />}
      {armed ? confirmLabel : label}
    </Button>
  );
}
