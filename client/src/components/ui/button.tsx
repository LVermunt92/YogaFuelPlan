import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Sem-achtige, minimal editorial button
 * Vereist HSL-triple tokens in :root (zoals eerder gedeeld):
 * --primary, --accent, --accent-foreground, --muted, --ring, --radius, etc.
 */
const buttonVariants = cva(
  // base
  "inline-flex items-center justify-center gap-2 whitespace-nowrap " +
    "rounded-[var(--radius)] text-sm font-medium " +
    "transition-colors focus-visible:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background " +
    "disabled:pointer-events-none disabled:opacity-50 " +
    "data-[state=open]:bg-muted " +
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // primair: inky zwart
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        // subtiele rand, transparante bg
        outline: "border bg-transparent text-foreground hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // ghost: geen rand, zachte hover
        ghost: "bg-transparent text-foreground hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // accentkleur uit tokens (let op: HSL var)
        accent: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:bg-[hsl(var(--accent)/0.9)]"
      },
      size: {
        sm: "h-9 px-3",
        default: "h-11 px-4",   // 44px min-tap
        lg: "h-12 px-6",
        icon: "h-11 w-11"       // 44x44 icon-only
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
