/** 可复用的文本搜索工具, 支持标准匹配、模糊匹配和高亮片段生成. */
export interface SearchHighlightPart {
  text: string
  matched: boolean
}

export class Search {
  /** 统一全半角和大小写, 使中文及英文搜索结果保持一致. */
  static normalize (value: string): string {
    return value.normalize('NFKC').toLocaleLowerCase()
  }

  /** 将输入拆分为已规范化的非空搜索词. */
  static getTerms (query: string): string[] {
    return this.normalize(query).split(/\s+/).filter(Boolean)
  }

  /** 所有搜索词必须至少命中一个字段, 每项支持连续和模糊匹配. */
  static matches (terms: readonly string[], fields: Iterable<string | null | undefined>): boolean {
    if (terms.length === 0) {
      return true
    }

    const normalizedFields = Array.from(fields, field => this.normalize(field ?? ''))
    return terms.every(term => normalizedFields.some(field =>
      field.includes(term) || this.isFuzzyMatch(field, term),
    ))
  }

  /** 将连续或模糊匹配的字符拆分为可安全渲染的高亮片段. */
  static highlight (value: string, terms: readonly string[]): SearchHighlightPart[] {
    if (!value || terms.length === 0) {
      return [{ text: value, matched: false }]
    }

    const characters = Array.from(value)
    const normalized = characters.map(char => this.normalize(char))
    const matched = new Set<number>()
    for (const searchTerm of terms) {
      const term = Array.from(searchTerm).map(char => this.normalize(char))
      const start = this.matchStart(normalized, term)
      const indexes = start === -1
        ? this.fuzzyMatchIndexes(normalized, term)
        : term.map((_, index) => start + index)
      for (const index of indexes) {
        matched.add(index)
      }
    }

    const parts: SearchHighlightPart[] = []
    for (const [index, character] of characters.entries()) {
      const isMatched = matched.has(index)
      const last = parts.at(-1)
      if (last && last.matched === isMatched) {
        last.text += character
      } else {
        parts.push({ text: character, matched: isMatched })
      }
    }
    return parts
  }

  private static isFuzzyMatch (text: string, query: string): boolean {
    let index = 0
    for (const char of query) {
      index = text.indexOf(char, index)
      if (index === -1) {
        return false
      }
      index++
    }
    return true
  }

  private static matchStart (characters: string[], term: string[]): number {
    if (term.length === 0 || term.length > characters.length) {
      return -1
    }
    for (let start = 0; start <= characters.length - term.length; start++) {
      if (term.every((char, index) => characters[start + index] === char)) {
        return start
      }
    }
    return -1
  }

  private static fuzzyMatchIndexes (characters: string[], term: string[]): number[] {
    const indexes: number[] = []
    let offset = 0
    for (const char of term) {
      const found = characters.indexOf(char, offset)
      if (found === -1) {
        return []
      }
      indexes.push(found)
      offset = found + 1
    }
    return indexes
  }
}
