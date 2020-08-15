/* eslint-disable @typescript-eslint/no-explicit-any */
import { Subject, Observable } from 'rxjs'

type Drivers = {
  readonly [name: string]: (sinks: Observable<any>) => any
}

type So<D extends Drivers> = {
  [name in keyof D]: ReturnType<D[name]>
}

type Si<D extends Drivers> = {
  readonly [name in keyof D]: Observable<any>
}

type SiProxy<D extends Drivers> = {
  [name in keyof D]: Subject<any>
}

export const run = <D extends Drivers>(app: (sources: So<D>) => Si<D>, drivers: D): void => {
  const sinkProxies = {} as SiProxy<D>
  const sources = {} as So<D>

  Object.keys(drivers).forEach((key: keyof D) => {
    const sinkProxy = new Subject()
    sinkProxies[key] = sinkProxy
    sources[key] = drivers[key](sinkProxy)
  })

  const sinks: Si<D> = app(sources)
  Object.keys(sinks).forEach((key) => {
    sinks[key].subscribe(sinkProxies[key])
  })
}
