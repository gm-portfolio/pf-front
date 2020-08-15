import { Observable, fromEvent } from 'rxjs'
import { animationFrame } from 'rxjs/internal/scheduler/animationFrame'
import { map, throttleTime, startWith, shareReplay } from 'rxjs/operators'

export type So = {
  readonly load$: Observable<Event>
  readonly scroll$: Observable<number>
  readonly resize$: Observable<ViewPortSize>
  readonly getElementStyles: (element: Element) => CSSStyleDeclaration
  readonly getScrollPosition: () => number
}

export type Si = Observable<ScrollAction>

export type WindowDriver = { (sinks$: Si): So }

export type ViewPortSize = {
  readonly w: number
  readonly h: number
}

type ScrollAction = {
  readonly action: 'scrollToElement'
  readonly element: Element
}

export const create = (): WindowDriver => {
  const windowDriver = (sinks$: Si): So => {
    sinks$.subscribe((sink) => {
      if (sink.action === 'scrollToElement') {
        sink.element.scrollIntoView()
      }
    })

    const getViewPortSize = (): ViewPortSize => ({
      w: window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth,
      h: window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight
    })

    const getElementStyles = (element: Element): CSSStyleDeclaration => window.getComputedStyle(element)
    const getScrollPosition = (): number => window.pageYOffset

    const load$ = fromEvent(window, 'load').pipe(
      shareReplay(1)
    )

    const resize$ = fromEvent(window, 'resize').pipe(
      throttleTime(0, animationFrame),
      map(() => getViewPortSize()),
      startWith(getViewPortSize()),
      shareReplay(1)
    )

    const scroll$ = fromEvent(window, 'scroll').pipe(
      throttleTime(0, animationFrame),
      map(() => window.pageYOffset),
      startWith(window.pageYOffset),
      shareReplay(1)
    )

    return {
      load$,
      scroll$,
      resize$,
      getScrollPosition,
      getElementStyles
    }
  }

  return windowDriver
}
