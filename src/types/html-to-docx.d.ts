declare module 'html-to-docx' {
  type Margins = {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }

  type Options = {
    title?: string
    margins?: Margins
    table?: { row?: { cantSplit?: boolean } }
    footer?: boolean
    pageNumber?: boolean
  }

  export default function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString?: string | null,
    documentOptions?: Options,
    footerHTMLString?: string | null
  ): Promise<Buffer | ArrayBuffer | Blob>
}
