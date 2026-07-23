declare module 'sortablejs' {
  export interface SortableEvent {
    oldIndex: number | null
    newIndex: number | null
    item: HTMLElement
    from: HTMLElement
    to: HTMLElement
  }

  export interface Options {
    [key: string]: unknown
    animation?: number
    handle?: string
    onEnd?: (evt: SortableEvent) => void
  }

  export class Sortable {
    constructor (el: HTMLElement, options?: Options)
    destroy (): void
    static create (el: HTMLElement, options?: Options): Sortable
  }

  export default Sortable
}
