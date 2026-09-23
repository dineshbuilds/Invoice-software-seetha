import type { ApiBridge, BusinessProfile, CatalogItem, Client, Invoice } from './types'

const settingsKey = 'billfold.settings'
const clientsKey = 'billfold.clients'
const invoicesKey = 'billfold.invoices'
const catalogKey = 'billfold.catalog'

const defaultSettings: BusinessProfile = {
  name: 'G. VIJAYASAMUNDESWARI',
  tagline: 'HANDLOOM YARN DESIGNER JOB WORKS',
  address: '15/32-A.3, Lakshmana Naicker Street, NEIKARAPATTI - 624 615.\nPALANI (Tk), DINDIGUL (Dt), TAMILNADU.',
  gstin: '33BGOPG1646D1ZN',
  state_code: '33',
  state_name: 'Tamil Nadu',
  phone: '094427 50948\n95855 46429, 94425 93708',
  bank_name: '',
  acc_no: '',
  ifsc: '',
  branch: '',
  default_tax_rate: 5,
  invoice_prefix: '',
  archive_path: '',
}

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function csvValue(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function getStoredSettings(): BusinessProfile {
  const stored = read<Partial<BusinessProfile>>(settingsKey, {})
  if (stored.name === 'Your Business Name') {
    write(settingsKey, defaultSettings)
    return defaultSettings
  }
  return { ...defaultSettings, ...stored }
}

export const browserApi: ApiBridge = {
  getClients: async () => read<Client[]>(clientsKey, []),
  saveClient: async (client) => {
    const clients = read<Client[]>(clientsKey, [])
    const saved = { ...client, id: client.id || Date.now() } as Client
    write(clientsKey, client.id ? clients.map((item) => item.id === saved.id ? saved : item) : [...clients, saved])
    return saved
  },
  deleteClient: async (id) => write(clientsKey, read<Client[]>(clientsKey, []).filter((client) => client.id !== id)),
  listInvoices: async (search = '') => read<Invoice[]>(invoicesKey, []).filter((invoice) => `${invoice.invoice_no} ${invoice.date} ${invoice.client?.name || ''}`.toLowerCase().includes(search.toLowerCase())),
  getInvoice: async (id) => read<Invoice[]>(invoicesKey, []).find((invoice) => invoice.id === id) || null,
  getCatalogItems: async () => read<CatalogItem[]>(catalogKey, []),
  saveCatalogItem: async (item) => {
    const catalog = read<CatalogItem[]>(catalogKey, [])
    const saved = { ...item, id: item.id || Date.now() } as CatalogItem
    write(catalogKey, item.id ? catalog.map((entry) => entry.id === saved.id ? saved : entry) : [...catalog, saved])
    return saved
  },
  deleteCatalogItem: async (id) => write(catalogKey, read<CatalogItem[]>(catalogKey, []).filter((item) => item.id !== id)),
  saveInvoice: async (invoice) => {
    const invoices = read<Invoice[]>(invoicesKey, [])
    const usedNumbers = invoices.map((entry) => Number(String(entry.invoice_no).replace(/\D/g, ''))).filter(Number.isFinite)
    const nextNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1
    const client = invoice.client_id ? read<Client[]>(clientsKey, []).find((entry) => entry.id === invoice.client_id) : undefined
    const saved = { ...invoice, id: invoice.id || Date.now(), invoice_no: invoice.invoice_no || `${getStoredSettings().invoice_prefix}${nextNumber}`, ...(client ? { client } : {}) }
    write(invoicesKey, invoice.id ? invoices.map((item) => item.id === saved.id ? saved : item) : [...invoices, saved])
    return saved
  },
  deleteInvoice: async (id) => write(invoicesKey, read<Invoice[]>(invoicesKey, []).filter((invoice) => invoice.id !== id)),
  getSettings: async () => ({ ...getStoredSettings(), dataPath: 'Browser localStorage' }),
  saveSettings: async (settings) => { const saved = { ...defaultSettings, ...settings }; write(settingsKey, saved); return saved },
  chooseArchiveFolder: async () => ({ success: false, error: 'Folder selection is available in the desktop app.' }),
  openArchiveFolder: async () => ({ success: false, error: 'Opening the archive folder is available in the desktop app.' }),
  archiveInvoicePdf: async () => ({ success: false, error: 'Automatic PDF archiving is available in the desktop app.' }),
  clearAllData: async () => { localStorage.removeItem(clientsKey); localStorage.removeItem(invoicesKey); localStorage.removeItem(catalogKey); write(settingsKey, defaultSettings) },
  exportData: async () => {
    const settings = getStoredSettings()
    const clients = read<Client[]>(clientsKey, [])
    const invoices = read<Invoice[]>(invoicesKey, [])
    const rows: unknown[][] = [['Section', 'ID', 'Name / Invoice', 'Address / Date', 'GSTIN', 'State code', 'Phone / Status', 'Description', 'HSN', 'Qty', 'Unit', 'Rate', 'Amount']]
    rows.push(['Settings', '1', settings.name, settings.address, settings.gstin, settings.state_code, settings.phone, settings.tagline, '', '', '', settings.default_tax_rate, ''])
    for (const client of clients) rows.push(['Client', client.id, client.name, client.address, client.gstin, client.state_code, client.phone, '', '', '', '', '', ''])
    for (const invoice of invoices) {
      rows.push(['Invoice', invoice.id || '', invoice.invoice_no, invoice.date, invoice.client?.gstin || '', invoice.client?.state_code || '', invoice.status, '', '', '', '', '', ''])
      for (const item of invoice.items) rows.push(['Invoice item', invoice.id || '', invoice.invoice_no, invoice.date, '', '', '', item.description, item.hsn, item.qty, item.unit, item.rate, item.amount])
    }
    const blob = new Blob([`\ufeff${rows.map((row) => row.map(csvValue).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `billfold-data-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    return { success: true, path: link.download }
  },
  printInvoice: async () => { window.print(); return { success: true } },
  exportInvoicePdf: async () => { window.print(); return { success: true } },
}

export function getAppApi(): ApiBridge {
  return window.api || browserApi
}
