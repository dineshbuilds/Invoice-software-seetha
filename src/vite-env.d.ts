declare module '*.css'
declare module './component/InvoiceBill' {
  import type { BusinessProfile, Client, Invoice, InvoiceItem } from './types'
  interface InvoiceBillProps {
    initialBuyer?: Partial<Client>
    initialRows?: InvoiceItem[]
    initialInvoice?: Invoice
    sellerProfile?: BusinessProfile & { dataPath?: string }
    itemCatalog?: InvoiceItem[]
    onSave?: (invoice: Invoice) => void
    onPrint?: () => void | Promise<unknown>
    onExportPdf?: () => void | Promise<unknown>
  }
  const InvoiceBill: React.ComponentType<InvoiceBillProps>
  export default InvoiceBill
}
