import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type PixelButtonVariant = 'primary' | 'secondary' | 'danger' | 'icon';

export interface PixelButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PixelButtonVariant;
  fullWidth?: boolean;
  iconOnly?: boolean;
}

export const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(
  function PixelButton(
    {
      variant = 'primary',
      fullWidth = false,
      iconOnly = false,
      className = '',
      type = 'button',
      children,
      ...buttonProps
    },
    ref,
  ) {
    const classes = [
      'pixel-button',
      `pixel-button--${variant}`,
      fullWidth ? 'pixel-button--full' : '',
      iconOnly ? 'pixel-button--icon-only' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} type={type} className={classes} {...buttonProps}>
        <span className="pixel-button__content">{children}</span>
      </button>
    );
  },
);

