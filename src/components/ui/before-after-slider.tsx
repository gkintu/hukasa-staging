'use client'

import { forwardRef, type ReactNode } from 'react'
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
  type ReactCompareSliderDetailedProps,
  type ReactCompareSliderImageProps,
  type UseReactCompareSliderRefReturn,
} from 'react-compare-slider'

import { cn } from '@/lib/utils'

type SliderContentBase = {
  alt: string
  label?: ReactNode
  contentClassName?: string
}

type ImageContent = SliderContentBase &
  Required<Pick<ReactCompareSliderImageProps, 'src'>> &
  Pick<ReactCompareSliderImageProps, 'sizes' | 'srcSet'> & {
    content?: undefined
  }

type CustomContent = SliderContentBase & {
  src?: undefined
  srcSet?: undefined
  sizes?: undefined
  content: ReactNode
}

type SliderContent = ImageContent | CustomContent

export interface BeforeAfterSliderProps
  extends Omit<ReactCompareSliderDetailedProps, 'itemOne' | 'itemTwo' | 'ref'> {
  before: SliderContent
  after: SliderContent
  /**
   * Classes applied to the outer wrapper that maintains aspect ratio
   * and visual framing.
   */
  wrapperClassName?: string
  /**
   * Classes applied to the overlay badge that surfaces the label for
   * each side of the comparison.
   */
  overlayClassName?: string
}

function renderOverlay(label: ReactNode | undefined, className: string) {
  if (!label) {
    return null
  }

  return (
    <span
      className={cn(
        'pointer-events-none absolute bottom-3 left-3 rounded-md bg-background/80 px-2 py-1 text-xs font-medium uppercase tracking-wide text-foreground shadow-sm backdrop-blur',
        className,
      )}
    >
      {label}
    </span>
  )
}

function renderItem(
  item: SliderContent,
  labelClassName: string,
): ReactNode {
  if ('content' in item && item.content) {
    return (
      <div className={cn('relative h-full w-full cursor-pointer', item.contentClassName)}>
        {item.content}
        {renderOverlay(item.label, labelClassName)}
      </div>
    )
  }

  return (
    <div className={cn('relative h-full w-full cursor-pointer', item.contentClassName)}>
      <ReactCompareSliderImage
        alt={item.alt}
        src={item.src}
        sizes={item.sizes}
        srcSet={item.srcSet}
        className="h-full w-full object-cover"
      />
      {renderOverlay(item.label, labelClassName)}
    </div>
  )
}

export const BeforeAfterSlider = forwardRef<
  UseReactCompareSliderRefReturn,
  BeforeAfterSliderProps
>(function BeforeAfterSlider(
  {
    before,
    after,
    wrapperClassName,
    overlayClassName,
    className,
    handle,
    ...props
  },
  ref,
) {
  return (
    <div
      className={cn(
        'relative aspect-[4/3] overflow-hidden rounded-lg border border-border/40 bg-muted/30 shadow-sm',
        wrapperClassName,
      )}
    >
      <ReactCompareSlider
        ref={ref}
        className={cn('h-full w-full', className)}
        itemOne={renderItem(before, overlayClassName ?? '')}
        itemTwo={renderItem(after, overlayClassName ?? '')}
        handle={handle}
        {...props}
      />
    </div>
  )
})

BeforeAfterSlider.displayName = 'BeforeAfterSlider'
