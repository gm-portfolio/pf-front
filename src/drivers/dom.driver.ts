import { Observable, Observer, Subject } from 'rxjs'
import { share, map } from 'rxjs/operators'
import { render, TemplateResult, directive, NodePart, html } from 'lit-html'

export type So = {
  readonly fromEvent: (selector: string, eventName: string, root?: Element) => Observable<DomEvent>
  readonly getRoot: () => Element
  readonly select: (selector: string, root?: Element) => Element
  readonly selectAll: (selector: string, root?: Element) => Element[]
  readonly render$: Subject<number>
}

export type Si = Observable<TemplateResult>

export type DomDriver = { (sinks: Si): So }

export type DomEvent = Event & { readonly ownTarget: HTMLElement }

type VirtualEvent = {
  readonly selector: string
  readonly observer: Observer<DomEvent>
}

export const isolate = <ComponentSo extends { dom: So }, ComponentSi extends { dom: Si }>(
  scope: string,
  component: Function
): ((sources: ComponentSo) => ComponentSi) => {
  const wrapperDirective = directive((root, content) => (part: NodePart): void => {
    part.appendInto(root)
    part.setValue(content)
  })

  const isolateSo = <ComponentSo extends { dom: So }>(sources: ComponentSo, root: Element): ComponentSo => ({
    ...sources,
    dom: {
      ...sources.dom,
      fromEvent: (selector: string, eventName: string): Observable<DomEvent> => sources.dom.fromEvent(selector, eventName, root),
      getRoot: (): Element => root
    }
  })

  const isolateSi = <ComponentSi extends { dom: Si }>(sinks: ComponentSi, root: HTMLElement): ComponentSi => ({
    ...sinks,
    dom: sinks.dom.pipe(map((content) => html`${root} ${wrapperDirective(root, content)}`))
  })

  return (sources: ComponentSo): ComponentSi => {
    const root = document.createElement(scope)
    const _sources = isolateSo(sources, root)
    const sinks = component(_sources)
    const _sinks = isolateSi(sinks, root)
    return _sinks
  }
}

export const create = (rootSelector: string): DomDriver => {
  const domRoot = document.querySelector(rootSelector)
  const virtualEvents = new WeakMap<Element, VirtualEvent[]>()
  const render$ = new Subject<number>()
  let renderCount = 0

  const domDriver: DomDriver = (sinks$: Si): So => {
    sinks$.subscribe({
      next (domeToRender: TemplateResult) {
        render(domeToRender, domRoot)
        render$.next(renderCount += 1)
      },
      error (e) {
        throw e
      }
    })

    const eventDelegator = (e: Event): void => {
      const { target } = e
      const root = e.currentTarget as Element
      const rootVirtualEvents = virtualEvents.get(root)
      rootVirtualEvents.some((virtualEvent) => {
        if ((target as Element).matches(virtualEvent.selector)) {
          virtualEvent.observer.next({ ...e, ownTarget: target as HTMLElement })
          return true
        }
        return false
      })
    }

    const fromEvent = (selector: string, eventName: string, root: Element = domRoot): Observable<DomEvent> => (
      new Observable<DomEvent>((observer) => {
        let rootVirtualEvents: VirtualEvent[] = []
        root.addEventListener(eventName, eventDelegator)
        if (virtualEvents.has(root)) {
          rootVirtualEvents = virtualEvents.get(root)
        }
        rootVirtualEvents.push({ selector, observer })
        virtualEvents.set(root, rootVirtualEvents)

        return (): void => { // dispose
          const selectors = virtualEvents.get(root)
          selectors.some((_selector, _index, _selectors) => {
            if (_selector.observer === observer) {
              _selectors.splice(_index, 1)
              return true
            }
            return false
          })
        }
      }).pipe(
        share()
      )
    )

    const getRoot = (): Element => domRoot
    const select = (selector: string, root: Element = domRoot): Element => root.querySelector(selector)
    const selectAll = (selector: string, root: Element = domRoot): Element[] => Array.from(root.querySelectorAll(selector))

    return {
      fromEvent,
      getRoot,
      select,
      selectAll,
      render$
    }
  }

  return domDriver
}
