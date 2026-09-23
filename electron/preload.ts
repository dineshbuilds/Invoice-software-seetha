import { contextBridge, ipcRenderer } from 'electron'
import type { ApiBridge, BusinessProfile } from './types.js'

const api: ApiBridge = {
  getClients: () => ipcRenderer.invoke('clients:list'),
  saveClient: (client) => ipcRenderer.invoke('clients:save', client),
  deleteClient: (id) => ipcRenderer.invoke('clients:delete', id),
  listInvoices: (search) => ipcRenderer.invoke('invoices:list', search),
  getInvoice: (id) => ipcRenderer.invoke('invoices:get', id),
  saveInvoice: (invoice) => ipcRenderer.invoke('invoices:save', invoice),
  deleteInvoice: (id) => ipcRenderer.invoke('invoices:delete', id),
  getCatalogItems: () => ipcRenderer.invoke('catalog:list'),
  saveCatalogItem: (item) => ipcRenderer.invoke('catalog:save', item),
  deleteCatalogItem: (id) => ipcRenderer.invoke('catalog:delete', id),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: BusinessProfile) => ipcRenderer.invoke('settings:save', settings),
  chooseArchiveFolder: () => ipcRenderer.invoke('archive:choose-folder'),
  openArchiveFolder: () => ipcRenderer.invoke('archive:open-folder'),
  archiveInvoicePdf: (id) => ipcRenderer.invoke('archive:invoice-pdf', id),
  clearAllData: () => ipcRenderer.invoke('data:clear'),
  exportData: () => ipcRenderer.invoke('data:export'),
  printInvoice: (id) => ipcRenderer.invoke('print-invoice', id),
  exportInvoicePdf: (id) => ipcRenderer.invoke('export-pdf', id),
}
contextBridge.exposeInMainWorld('api', api)

declare global { interface Window { api: ApiBridge } }
