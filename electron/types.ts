export type TaxMode = 'igst' | 'split'
export type InvoiceKind = 'gst' | 'dispatch'

export interface BusinessProfile {
  name: string
  tagline: string
  address: string
  gstin: string
  state_code: string
  state_name: string
  phone: string
  bank_name: string
  acc_no: string
  ifsc: string
  branch: string
  default_tax_rate: number
  invoice_prefix: string
  invoice_start_number: number
  dispatch_invoice_start_number: number
  archive_path?: string
}

export interface Client {
  id: number
  name: string
  address: string
  gstin: string
  state_code: string
  phone: string
}

export interface InvoiceItem {
  id?: number
  description: string
  hsn: string
  qty: number
  unit: string
  rate: number
  amount: number
}
export interface CatalogItem { id: number; description: string; hsn: string; unit: string; rate: number }

export interface Invoice {
  id?: number
  invoice_kind: InvoiceKind
  invoice_no: string
  date: string
  client_id: number | null
  place_of_supply: string
  tax_mode: TaxMode
  tax_rate: number
  notes: string
  status: 'draft' | 'finalized'
  client?: Client
  items: InvoiceItem[]
}

export interface ApiBridge {
  getClients: () => Promise<Client[]>
  saveClient: (client: Omit<Client, 'id'> & { id?: number }) => Promise<Client>
  deleteClient: (id: number) => Promise<void>
  listInvoices: (search?: string) => Promise<Invoice[]>
  getInvoice: (id: number) => Promise<Invoice | null>
  saveInvoice: (invoice: Invoice) => Promise<Invoice>
  deleteInvoice: (id: number) => Promise<void>
  getCatalogItems: () => Promise<CatalogItem[]>
  saveCatalogItem: (item: Omit<CatalogItem, 'id'> & { id?: number }) => Promise<CatalogItem>
  deleteCatalogItem: (id: number) => Promise<void>
  getSettings: () => Promise<BusinessProfile & { dataPath: string }>
  saveSettings: (settings: BusinessProfile) => Promise<BusinessProfile>
  clearAllData: () => Promise<void>
  chooseArchiveFolder: () => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>
  openArchiveFolder: () => Promise<{ success: boolean; path?: string; error?: string }>
  archiveInvoicePdf: (id: number) => Promise<{ success: boolean; path?: string; error?: string }>
  exportData: () => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>
  printInvoice: (id: number) => Promise<{ success: boolean; error?: string }>
  exportInvoicePdf: (id: number) => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>
}
