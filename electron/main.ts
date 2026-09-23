import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { clearAllData, deleteCatalogItem, deleteClient, deleteInvoice, getArchivePath, getCatalogItems, getClients, getExportData, getInvoice, getSettings, initDb, listInvoices, saveCatalogItem, saveClient, saveInvoice, saveSettings } from './db.js'
import type { BusinessProfile, CatalogItem, Client, Invoice } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
let mainWindow: BrowserWindow

function registerIpc() {
  ipcMain.handle('clients:list', () => getClients())
  ipcMain.handle('clients:save', (_event, client: Omit<Client, 'id'> & { id?: number }) => saveClient(client))
  ipcMain.handle('clients:delete', (_event, id: number) => deleteClient(id))
  ipcMain.handle('invoices:list', (_event, search?: string) => listInvoices(search))
  ipcMain.handle('invoices:get', (_event, id: number) => getInvoice(id))
  ipcMain.handle('invoices:save', (_event, invoice: Invoice) => saveInvoice(invoice))
  ipcMain.handle('invoices:delete', (_event, id: number) => deleteInvoice(id))
  ipcMain.handle('catalog:list', () => getCatalogItems())
  ipcMain.handle('catalog:save', (_event, item: Omit<CatalogItem, 'id'> & { id?: number }) => saveCatalogItem(item))
  ipcMain.handle('catalog:delete', (_event, id: number) => deleteCatalogItem(id))
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:save', (_event, settings: BusinessProfile) => saveSettings(settings))
  ipcMain.handle('archive:choose-folder', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, { title: 'Choose invoice archive folder', properties: ['openDirectory'] })
      if (result.canceled || !result.filePaths[0]) return { success: false, canceled: true }
      const settings = getSettings()
      saveSettings({ ...settings, archive_path: result.filePaths[0] })
      return { success: true, path: result.filePaths[0] }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
  ipcMain.handle('archive:open-folder', async () => {
    try { const archivePath = getArchivePath(); const error = await shell.openPath(archivePath); return error ? { success: false, error } : { success: true, path: archivePath } } catch (error) { return { success: false, error: String(error) } }
  })
  ipcMain.handle('archive:invoice-pdf', async (_event, id: number) => {
    const invoice = getInvoice(id)
    const archivePath = getSettings().archive_path
    if (!invoice || !archivePath) return { success: false, error: 'Choose an invoice archive folder in Settings first.' }
    const date = new Date(`${invoice.date}T12:00:00`)
    const year = Number.isNaN(date.getTime()) ? String(new Date().getFullYear()) : String(date.getFullYear())
    const month = Number.isNaN(date.getTime()) ? new Date().toLocaleString('en-US', { month: 'long' }) : date.toLocaleString('en-US', { month: 'long' })
    const kind = invoice.invoice_kind === 'dispatch' ? 'Dispatch invoices' : 'Invoices'
    const safeName = `${invoice.client?.name?.trim() || 'Walk-in customer'} - ${invoice.invoice_no || 'invoice'}`.replace(/[<>:"/\\|?*]+/g, '-').replace(/\s+/g, ' ').trim()
    const filePath = path.join(archivePath, kind, year, month, `${safeName}.pdf`)
    try { await requirePdf(mainWindow, filePath); return { success: true, path: filePath } } catch (error) { return { success: false, error: String(error) } }
  })
  ipcMain.handle('data:clear', () => clearAllData())
  ipcMain.handle('data:export', async () => {
    const result = await dialog.showSaveDialog(mainWindow, { title: 'Export Billfold data', defaultPath: 'billfold-data.csv', filters: [{ name: 'Excel-compatible CSV', extensions: ['csv'] }] })
    if (result.canceled || !result.filePath) return { success: false, canceled: true }
    const data = getExportData()
    const rows: string[][] = [['Section', 'ID', 'Name / Invoice', 'Address / Date', 'GSTIN', 'State code', 'Phone / Status', 'Description', 'HSN', 'Qty', 'Unit', 'Rate', 'Amount']]
    rows.push(['Settings', '1', data.settings.name, data.settings.address, data.settings.gstin, data.settings.state_code, data.settings.phone, data.settings.tagline, '', '', '', String(data.settings.default_tax_rate), ''])
    for (const client of data.clients) rows.push(['Client', String(client.id), client.name, client.address, client.gstin, client.state_code, client.phone, '', '', '', '', '', ''])
    for (const invoice of data.invoices) {
      rows.push(['Invoice', String(invoice.id || ''), invoice.invoice_no, invoice.date, invoice.client?.gstin || '', invoice.client?.state_code || '', invoice.status, '', '', '', '', '', ''])
      for (const item of invoice.items) rows.push(['Invoice item', String(invoice.id || ''), invoice.invoice_no, invoice.date, '', '', '', item.description, item.hsn, String(item.qty), item.unit, String(item.rate), String(item.amount)])
    }
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    try { const { writeFile } = await import('node:fs/promises'); await writeFile(result.filePath, '\ufeff' + csv, 'utf8'); return { success: true, path: result.filePath } } catch (error) { return { success: false, error: String(error) } }
  })
  ipcMain.handle('print-invoice', async () => new Promise((resolve) => {
    try {
      mainWindow.webContents.print({ silent: false, printBackground: true }, (success, errorType) => resolve(success ? { success: true } : { success: false, error: errorType || 'The print dialog was canceled or unavailable.' }))
    } catch (error) { resolve({ success: false, error: String(error) }) }
  }))
  ipcMain.handle('export-pdf', async (_event, id: number) => {
    try {
      const invoice = getInvoice(id)
      const clientName = invoice?.client?.name?.trim() || 'Walk-in customer'
      const invoiceNumber = invoice?.invoice_no || 'invoice'
      const fileName = `${clientName} - ${invoiceNumber}`.replace(/[<>:"/\\|?*]+/g, '-').replace(/\s+/g, ' ').trim() + '.pdf'
      const result = await dialog.showSaveDialog(mainWindow, { title: 'Save invoice PDF', defaultPath: fileName, filters: [{ name: 'PDF document', extensions: ['pdf'] }] })
      if (result.canceled || !result.filePath) return { success: false, canceled: true }
      await requirePdf(mainWindow, result.filePath)
      return { success: true, path: result.filePath }
    } catch (error) { return { success: false, error: String(error) } }
  })
}

async function requirePdf(window: BrowserWindow, filePath: string) {
  const pdf = await window.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })
  const { mkdir, writeFile } = await import('node:fs/promises')
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, pdf)
}

function createWindow() {
  mainWindow = new BrowserWindow({ width: 1440, height: 960, minWidth: 1000, minHeight: 700, webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.cjs') } })
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5175'
  if (!app.isPackaged) mainWindow.loadURL(devUrl)
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
}

app.whenReady().then(() => { initDb(); registerIpc(); createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() }) })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
