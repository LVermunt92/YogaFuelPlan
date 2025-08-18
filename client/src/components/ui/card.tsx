import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* Root: vlak (default), elevated, outline; optioneel interactive (hover/focus) en padding-varianten */
const cardVariants = cva(
  "bg-card text-card-foreground rounded-[var(--radius)] shadow-none",
  {
    variants: {
      variant: {
        flat:    "shadow-none",
        elevated:"shadow-sm",
        outline: "bg-transparent",
      },
      interactive: {
        true:  "transition-colors cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
        false: "",
      },
      padding: {
        none: "p-0",
        sm:   "p-4",
        md:   "p-6",
        lg:   "p-8",
      },
    },
    defaultVariants: {
      variant: "flat",
      interactive: false,
      padding: "md",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, padding, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div"
    return (
      <Comp
        ref={ref}
        className={cn(cardVariants({ variant, interactive, padding }), className)}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

/* Header: optionele divider & inset (zonder eigen padding als root al padding heeft) */
const headerVariants = cva("flex flex-col gap-1.5", {
  variants: {
    inset:   { true: "p-0", false: "p-6" },
    divider: { true: "border-b", false: "" },
  },
  defaultVariants: { inset: false, divider: false },
})
export interface CardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof headerVariants> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, inset, divider, ...props }, ref) => (
    <div ref={ref} className={cn(headerVariants({ inset, divider }), className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

/* Titel: serif, strakke tracking, responsive maat */
const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("font-serif text-xl sm:text-2xl font-semibold leading-tight tracking-tight", className)}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

/* Omschrijving */
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
)
CardDescription.displayName = "CardDescription"

/* Content: optioneel inset (geen eigen padding) */
const contentVariants = cva("", {
  variants: { inset: { true: "p-0", false: "p-6 pt-0" } },
  defaultVariants: { inset: false },
})
export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof contentVariants> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, inset, ...props }, ref) => (
    <div ref={ref} className={cn(contentVariants({ inset }), className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

/* Footer: optionele divider & inset */
const footerVariants = cva("flex items-center", {
  variants: {
    inset:   { true: "p-0", false: "p-6 pt-0" },
    divider: { true: "border-t", false: "" },
  },
  defaultVariants: { inset: false, divider: false },
})
export interface CardFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof footerVariants> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, inset, divider, ...props }, ref) => (
    <div ref={ref} className={cn(footerVariants({ inset, divider }), className)} {...props} />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
