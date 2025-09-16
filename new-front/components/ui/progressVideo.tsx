"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

export interface AppSliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  trackClassName?: string
  thumbClassName?: string
}

const ProgressVideo = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  AppSliderProps
>(({ className, trackClassName, thumbClassName, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "top-[32px] relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className={cn("relative h-4 w-full grow overflow-hidden rounded-full bg-zinc-700/50 ring-1 ring-zinc-800/60", trackClassName)}>
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className={cn("hidden", thumbClassName)} />
  </SliderPrimitive.Root>
))
ProgressVideo.displayName = SliderPrimitive.Root.displayName

export { ProgressVideo }


