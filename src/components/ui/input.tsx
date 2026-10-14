"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

const FloatingLabelInput = React.forwardRef<
  HTMLInputElement,
  FloatingLabelInputProps
>(({ className, label, error, icon, type, id, ...props }, ref) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const isError = !!error;
  const errorId = isError ? `${inputId}-error` : undefined;

  return (
    <div className="relative w-full">
      <input
        ref={ref}
        id={inputId}
        type={type}
        placeholder=" "
        className={cn(
          "peer flex h-10 w-full rounded-md border border-[#D0D0FD] bg-background px-4 py-2 text-[14px] text-[#667085] placeholder:text-transparent focus:outline-none focus:ring-1 focus:ring-[#7141F8] focus:border-[#7141F8] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150",
          isError &&
            "border-[#F81404] focus:ring-[#F81404] focus:border-[#F81404]",
          icon && "pr-10",
          className
        )}
        {...props}
        aria-invalid={isError ? true : props["aria-invalid"]}
        aria-errormessage={isError ? errorId : props["aria-errormessage"]}
      />
      <Label
        htmlFor={inputId}
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] transition-all duration-150 ease-out pointer-events-none peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[14px] peer-focus:top-[-8px] peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:text-[#7141F8] peer-[&:not(:placeholder-shown)]:top-[-8px] peer-[&:not(:placeholder-shown)]:-translate-y-0 peer-[&:not(:placeholder-shown)]:text-[11px] peer-[&:not(:placeholder-shown)]:text-[#7141F8] data-[error=true]:text-[#F81404]",
          className
        )}
      >
        {label}
      </Label>
      {icon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085]">
          {icon}
        </div>
      )}
      {error && (
        <p
          id={errorId}
          className="mt-1.5 text-[12px] text-[#F81404]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
});
FloatingLabelInput.displayName = "FloatingLabelInput";

export { Input, Label, FloatingLabelInput };
