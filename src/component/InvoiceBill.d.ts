import type { ComponentType } from 'react'
import type { BusinessProfile, Client, Invoice, InvoiceItem } from '../types'

interface InvoiceBillProps {
  initialBuyer?: Partial<Client>
  initialRows?: InvoiceItem[]
  initialInvoice?: Invoice
  sellerProfile?: BusinessProfile & { dataPath?: string }
  clients?: Client[]
  savedInvoices?: Invoice[]
  itemCatalog?: InvoiceItem[]
  onSave?: (invoice: Invoice) => void | Promise<Invoice>
  onPrint?: (invoice?: Invoice) => void | Promise<unknown>
  onExportPdf?: (invoice?: Invoice) => void | Promise<unknown>
}
declare const InvoiceBill: ComponentType<InvoiceBillProps>
export default InvoiceBill
