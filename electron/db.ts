import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'node:path'
import { mkdirSync } from 'node:fs'
import type { BusinessProfile, CatalogItem, Client, Invoice, InvoiceItem } from './types.js'

let db: Database.Database

const defaultProfile: BusinessProfile = {
  name: 'G. VIJAYASAMUNDESWARI', tagline: 'HANDLOOM YARN DESIGNER JOB WORKS', address: '15/32-A.3, Lakshmana Naicker Street, NEIKARAPATTI - 624 615.\nPALANI (Tk), DINDIGUL (Dt), TAMILNADU.',
  gstin: '33BGOPG1646D1ZN', state_code: '33', state_name: 'Tamil Nadu', phone: '094427 50948 / 094425 93708', account_name: 'Vijayasamundeswari.G', bank_name: 'STATE BANK OF INDIA', acc_no: '33184314150', ifsc: 'SBIN0002241', branch: 'Neikkarapatti Branch',
  default_tax_rate: 5, invoice_prefix: '', invoice_start_number: 1, dispatch_invoice_start_number: 1, archive_path: ''
}

export function getArchivePath() { return path.join(app.getPath('userData'), 'Invoice Archive') }

export function initDb() {
  mkdirSync(getArchivePath(), { recursive: true })
  const dbPath = path.join(app.getPath('userData'), 'billfold.sqlite3')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT NOT NULL, tagline TEXT NOT NULL, address TEXT NOT NULL,
      gstin TEXT NOT NULL, state_code TEXT NOT NULL, state_name TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL, account_name TEXT NOT NULL DEFAULT '', bank_name TEXT NOT NULL,
      acc_no TEXT NOT NULL, ifsc TEXT NOT NULL, branch TEXT NOT NULL, default_tax_rate REAL NOT NULL, invoice_prefix TEXT NOT NULL, invoice_start_number INTEGER NOT NULL DEFAULT 1, dispatch_invoice_start_number INTEGER NOT NULL DEFAULT 1, archive_path TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT NOT NULL, gstin TEXT NOT NULL, state_code TEXT NOT NULL, phone TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_kind TEXT NOT NULL DEFAULT 'gst', invoice_no TEXT NOT NULL, date TEXT NOT NULL, client_id INTEGER,
      place_of_supply TEXT NOT NULL, tax_mode TEXT NOT NULL, tax_rate REAL NOT NULL, notes TEXT NOT NULL, status TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL, description TEXT NOT NULL, hsn TEXT NOT NULL,
      qty REAL NOT NULL, unit TEXT NOT NULL, rate REAL NOT NULL, amount REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS catalog_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT NOT NULL, hsn TEXT NOT NULL, unit TEXT NOT NULL, rate REAL NOT NULL
    );
  `)
  const invoiceColumns = db.prepare('PRAGMA table_info(invoices)').all() as { name: string }[]
  if (!invoiceColumns.some((column) => column.name === 'invoice_kind')) db.exec("ALTER TABLE invoices ADD COLUMN invoice_kind TEXT NOT NULL DEFAULT 'gst'")
  const clientColumns = db.prepare('PRAGMA table_info(clients)').all() as { name: string }[]
  if (!clientColumns.some((column) => column.name === 'phone')) db.exec("ALTER TABLE clients ADD COLUMN phone TEXT NOT NULL DEFAULT ''")
  const profileColumns = db.prepare('PRAGMA table_info(business_profile)').all() as { name: string }[]
  if (!profileColumns.some((column) => column.name === 'state_name')) db.exec("ALTER TABLE business_profile ADD COLUMN state_name TEXT NOT NULL DEFAULT 'Tamil Nadu'")
  if (!profileColumns.some((column) => column.name === 'account_name')) db.exec("ALTER TABLE business_profile ADD COLUMN account_name TEXT NOT NULL DEFAULT ''")
  if (!profileColumns.some((column) => column.name === 'archive_path')) db.exec("ALTER TABLE business_profile ADD COLUMN archive_path TEXT NOT NULL DEFAULT ''")
  if (!profileColumns.some((column) => column.name === 'invoice_start_number')) db.exec("ALTER TABLE business_profile ADD COLUMN invoice_start_number INTEGER NOT NULL DEFAULT 1")
  if (!profileColumns.some((column) => column.name === 'dispatch_invoice_start_number')) db.exec("ALTER TABLE business_profile ADD COLUMN dispatch_invoice_start_number INTEGER NOT NULL DEFAULT 1")
  if (!db.prepare('SELECT id FROM business_profile WHERE id = 1').get()) {
    db.prepare(`INSERT INTO business_profile (id, name, tagline, address, gstin, state_code, state_name, phone, account_name, bank_name, acc_no, ifsc, branch, default_tax_rate, invoice_prefix, invoice_start_number, dispatch_invoice_start_number, archive_path)
      VALUES (1, @name, @tagline, @address, @gstin, @state_code, @state_name, @phone, @account_name, @bank_name, @acc_no, @ifsc, @branch, @default_tax_rate, @invoice_prefix, @invoice_start_number, @dispatch_invoice_start_number, @archive_path)`).run(defaultProfile)
  } else {
    db.prepare(`UPDATE business_profile SET name=@name, tagline=@tagline, address=@address, gstin=@gstin, state_code=@state_code, state_name=@state_name, phone=@phone, account_name=@account_name, bank_name=@bank_name, acc_no=@acc_no, ifsc=@ifsc, branch=@branch, invoice_prefix=@invoice_prefix WHERE id = 1`).run(defaultProfile)
  }
  return dbPath
}

export function getClients(): Client[] { return db.prepare('SELECT * FROM clients ORDER BY name').all() as Client[] }
export function saveClient(client: Omit<Client, 'id'> & { id?: number }): Client {
  if (client.id) db.prepare('UPDATE clients SET name=@name, address=@address, gstin=@gstin, state_code=@state_code, phone=@phone WHERE id=@id').run(client)
  else client.id = Number(db.prepare('INSERT INTO clients (name, address, gstin, state_code, phone) VALUES (@name, @address, @gstin, @state_code, @phone)').run(client).lastInsertRowid)
  return db.prepare('SELECT * FROM clients WHERE id = ?').get(client.id) as Client
}
export function deleteClient(id: number) { db.prepare('DELETE FROM clients WHERE id = ?').run(id) }
export function getCatalogItems(): CatalogItem[] { return db.prepare('SELECT * FROM catalog_items ORDER BY description').all() as CatalogItem[] }
export function saveCatalogItem(item: Omit<CatalogItem, 'id'> & { id?: number }): CatalogItem {
  if (item.id) db.prepare('UPDATE catalog_items SET description=@description, hsn=@hsn, unit=@unit, rate=@rate WHERE id=@id').run(item)
  else item.id = Number(db.prepare('INSERT INTO catalog_items (description, hsn, unit, rate) VALUES (@description, @hsn, @unit, @rate)').run(item).lastInsertRowid)
  return db.prepare('SELECT * FROM catalog_items WHERE id = ?').get(item.id) as CatalogItem
}
export function deleteCatalogItem(id: number) { db.prepare('DELETE FROM catalog_items WHERE id = ?').run(id) }

function withInvoice(id: number): Invoice | null {
  type InvoiceRow = Invoice & { client_name?: string; client_address?: string; client_gstin?: string; client_state_code?: string; client_phone?: string }
  const invoice = db.prepare('SELECT i.*, c.name as client_name, c.address as client_address, c.gstin as client_gstin, c.state_code as client_state_code, c.phone as client_phone FROM invoices i LEFT JOIN clients c ON c.id = i.client_id WHERE i.id = ?').get(id) as InvoiceRow | undefined
  if (!invoice) return null
  const items = db.prepare('SELECT id, description, hsn, qty, unit, rate, amount FROM invoice_items WHERE invoice_id = ? ORDER BY id').all(id) as InvoiceItem[]
  if (invoice.client_name) invoice.client = { id: invoice.client_id!, name: invoice.client_name, address: invoice.client_address!, gstin: invoice.client_gstin!, state_code: invoice.client_state_code!, phone: invoice.client_phone || '' }
  delete invoice.client_name
  delete invoice.client_address
  delete invoice.client_gstin
  delete invoice.client_state_code
  return { ...invoice, items }
}
export function listInvoices(search = ''): Invoice[] {
  const term = `%${search}%`
  const rows = db.prepare(`SELECT i.id FROM invoices i LEFT JOIN clients c ON c.id=i.client_id WHERE i.invoice_no LIKE ? OR i.date LIKE ? OR c.name LIKE ? ORDER BY i.date DESC, i.id DESC`).all(term, term, term) as { id: number }[]
  return rows.map((row) => withInvoice(row.id)!).filter(Boolean)
}
export function getInvoice(id: number) { return withInvoice(id) }

export function saveInvoice(invoice: Invoice): Invoice {
  const transaction = db.transaction(() => {
    let id = invoice.id
    if (!invoice.invoice_no) {
      const profile = db.prepare('SELECT invoice_prefix, invoice_start_number, dispatch_invoice_start_number FROM business_profile WHERE id = 1').get() as { invoice_prefix: string; invoice_start_number: number; dispatch_invoice_start_number: number }
      const existingNumbers = db.prepare('SELECT invoice_no FROM invoices WHERE invoice_kind = ?').all(invoice.invoice_kind) as { invoice_no: string }[]
      const latest = existingNumbers.map((entry) => Number(String(entry.invoice_no).replace(/\D/g, ''))).filter(Number.isFinite)
      const startNumber = invoice.invoice_kind === 'dispatch' ? profile.dispatch_invoice_start_number : profile.invoice_start_number
      invoice.invoice_no = `${profile.invoice_prefix}${Math.max(1, startNumber || 1, ...(latest.length > 0 ? [Math.max(...latest) + 1] : []))}`
    }
    if (id) db.prepare(`UPDATE invoices SET invoice_kind=@invoice_kind, invoice_no=@invoice_no, date=@date, client_id=@client_id, place_of_supply=@place_of_supply, tax_mode=@tax_mode, tax_rate=@tax_rate, notes=@notes, status=@status WHERE id=@id`).run(invoice)
    else id = Number(db.prepare(`INSERT INTO invoices (invoice_kind, invoice_no, date, client_id, place_of_supply, tax_mode, tax_rate, notes, status) VALUES (@invoice_kind, @invoice_no, @date, @client_id, @place_of_supply, @tax_mode, @tax_rate, @notes, @status)`).run(invoice).lastInsertRowid)
    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id)
    const insert = db.prepare('INSERT INTO invoice_items (invoice_id, description, hsn, qty, unit, rate, amount) VALUES (?, ?, ?, ?, ?, ?, ?)')
    for (const item of invoice.items) insert.run(id, item.description, item.hsn, item.qty, item.unit, item.rate, item.amount)
    return id
  })()
  return withInvoice(Number(transaction))!
}
export function deleteInvoice(id: number) { db.prepare('DELETE FROM invoices WHERE id = ?').run(id) }
export function getSettings() { return { ...(db.prepare('SELECT * FROM business_profile WHERE id = 1').get() as BusinessProfile), archive_path: getArchivePath(), dataPath: path.join(app.getPath('userData'), 'billfold.sqlite3') } }
export function saveSettings(settings: BusinessProfile) { db.prepare(`UPDATE business_profile SET name=@name, tagline=@tagline, address=@address, gstin=@gstin, state_code=@state_code, state_name=@state_name, phone=@phone, account_name=@account_name, bank_name=@bank_name, acc_no=@acc_no, ifsc=@ifsc, branch=@branch, default_tax_rate=@default_tax_rate, invoice_prefix=@invoice_prefix, invoice_start_number=@invoice_start_number, dispatch_invoice_start_number=@dispatch_invoice_start_number, archive_path=@archive_path WHERE id=1`).run({ ...settings, archive_path: settings.archive_path || '' }); return db.prepare('SELECT * FROM business_profile WHERE id=1').get() as BusinessProfile }

export function clearAllData() {
  db.transaction(() => {
    db.prepare('DELETE FROM invoice_items').run()
    db.prepare('DELETE FROM invoices').run()
    db.prepare('DELETE FROM clients').run()
    db.prepare('DELETE FROM catalog_items').run()
    db.prepare('DELETE FROM business_profile').run()
    db.prepare(`INSERT INTO business_profile (id, name, tagline, address, gstin, state_code, state_name, phone, bank_name, acc_no, ifsc, branch, default_tax_rate, invoice_prefix, invoice_start_number, dispatch_invoice_start_number, archive_path)
      VALUES (1, @name, @tagline, @address, @gstin, @state_code, @state_name, @phone, @bank_name, @acc_no, @ifsc, @branch, @default_tax_rate, @invoice_prefix, @invoice_start_number, @dispatch_invoice_start_number, @archive_path)`).run(defaultProfile)
  })()
}

export function getExportData() {
  return {
    settings: getSettings(),
    clients: getClients(),
    invoices: listInvoices(),
  }
}
