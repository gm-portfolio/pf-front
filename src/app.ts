import './app.styl'
import { Subject, of } from 'rxjs'
import { html } from 'lit-html'
import { create as createDomDriver, So as DomSo, Si as DomSi, DomDriver } from './drivers/dom.driver'
import { create as createWindowDriver, So as WindowSo, Si as WindowSi, WindowDriver } from './drivers/window.driver'
import { run } from './helpers/runner'

export type So = {
  readonly dom: DomSo
  readonly window: WindowSo
}

export type Si = {
  readonly dom: DomSi
  readonly window: WindowSi
}

type Drivers = {
  readonly dom: DomDriver
  readonly window: WindowDriver
}

const app = (sources: So): Si => {
  console.log(sources)
  return {
    dom: of(html`<h1 class="app__logo">Yeeeee</h1>`),
    window: new Subject()
  }
}

run<Drivers>(app, {
  dom: createDomDriver('#app'),
  window: createWindowDriver()
})
