import { useEffect, useState } from 'react'
import InvoiceBill from './component/InvoiceBill'
import type { BusinessProfile, CatalogItem, Client, Invoice, InvoiceKind } from './types'
import { getAppApi } from './storage'
import logoImage from './assets/logo.png'
import './App.css'

type View = 'invoices' | 'invoice' | 'clients' | 'items' | 'settings'
const blankClient = { name: '', address: '', gstin: '', state_code: '', phone: '' }
const blankItem = { description: '', hsn: '', unit: 'Kg', rate: 0 }
const LOGIN_USERNAME = 'VIJAYASAMUNDESWARI'
const DEFAULT_LOGIN_PASSWORD = 'guruvijaya'
const LOGIN_PASSWORD_KEY = 'billfold.login.password'
const LOGIN_SESSION_KEY = 'billfold.login.session'

function getLoginPassword() {
  return localStorage.getItem(LOGIN_PASSWORD_KEY) || DEFAULT_LOGIN_PASSWORD
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (username.trim().toLowerCase() === LOGIN_USERNAME.toLowerCase() && password === getLoginPassword()) {
      localStorage.setItem(LOGIN_SESSION_KEY, 'active')
      setLoggingIn(true)
      window.setTimeout(onLogin, 800)
      return
    }
    setError('Username or password is incorrect.')
  }

  return <main className="login-screen"><section className="login-card"><img className="login-logo" src={logoImage} alt="Billing software logo" /><p className="eyebrow">Offline billing workspace</p><h1>Welcome back</h1><p className="login-subtitle">Sign in to continue to Billing software.</p><form onSubmit={submit} className="login-form"><label>Username<input autoFocus value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" disabled={loggingIn} /></label><label>Password<span className="password-input"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" disabled={loggingIn} /><button type="button" className="view-password" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} disabled={loggingIn}>{showPassword ? '◉' : '👁'}</button></span></label>{error && <p className="login-error" role="alert">{error}</p>}<button className="solid-button" type="submit" disabled={loggingIn}>{loggingIn ? <span className="login-loader"><span /> Signing in...</span> : 'Sign in'}</button></form></section></main>
}

function App() {
  const api = getAppApi()
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem(LOGIN_SESSION_KEY) === 'active')
  const [view, setView] = useState<View>('invoices')
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([])
  const [settings, setSettings] = useState<(BusinessProfile & { dataPath: string }) | null>(null)
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null)
  const [search, setSearch] = useState('')
  const [clientDraft, setClientDraft] = useState(blankClient)
  const [editingClient, setEditingClient] = useState<number | undefined>()
  const [message, setMessage] = useState('')
  const [invoiceChooserOpen, setInvoiceChooserOpen] = useState(false)
  const [itemDraft, setItemDraft] = useState(blankItem)
  const [editingItem, setEditingItem] = useState<number | undefined>()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    document.title = 'Billing software'
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (favicon) favicon.href = logoImage
  }, [])

  const refresh = async () => {
    const [loadedClients, loadedInvoices, loadedAllInvoices, loadedSettings, loadedItems] = await Promise.all([api.getClients(), api.listInvoices(search), api.listInvoices(), api.getSettings(), api.getCatalogItems()])
    setClients(loadedClients); setInvoices(loadedInvoices); setAllInvoices(loadedAllInvoices); setSettings(loadedSettings); setCatalogItems(loadedItems)
  }
  useEffect(() => { void refresh() }, [search])

  const newInvoice = (invoice_kind: InvoiceKind) => {
    setInvoiceChooserOpen(false)
    setCurrentInvoice({ invoice_kind, invoice_no: '', date: new Date().toISOString().slice(0, 10), client_id: null, place_of_supply: '', tax_mode: 'igst', tax_rate: settings?.default_tax_rate || 5, notes: '', status: 'draft', items: [] })
    setView('invoice')
  }
  const openInvoice = async (id: number) => { setCurrentInvoice(await api.getInvoice(id)); setView('invoice') }
  const saveClient = async (event: React.FormEvent) => { event.preventDefault(); if (!clientDraft.name.trim()) return; await api.saveClient({ ...clientDraft, ...(editingClient ? { id: editingClient } : {}) }); setClientDraft(blankClient); setEditingClient(undefined); await refresh() }
  const saveItem = async (event: React.FormEvent) => { event.preventDefault(); if (!itemDraft.description.trim()) return; await api.saveCatalogItem({ ...itemDraft, ...(editingItem ? { id: editingItem } : {}) }); setItemDraft(blankItem); setEditingItem(undefined); await refresh() }
  const editItem = (item: CatalogItem) => { setItemDraft({ description: item.description, hsn: item.hsn, unit: item.unit, rate: item.rate }); setEditingItem(item.id) }
  const editClient = (client: Client) => { setClientDraft({ name: client.name, address: client.address, gstin: client.gstin, state_code: client.state_code, phone: client.phone }); setEditingClient(client.id) }
  const saveSettings = async (event: React.FormEvent) => { event.preventDefault(); if (settings) { const saved = await api.saveSettings(settings); setSettings({ ...saved, dataPath: settings.dataPath }); setMessage('Settings saved'); setTimeout(() => setMessage(''), 2200) } }
  const changePassword = (event: React.FormEvent) => {
    event.preventDefault()
    if (currentPassword !== getLoginPassword()) { setMessage('Current password is incorrect'); return }
    if (!newPassword.trim() || newPassword !== confirmPassword) { setMessage('New passwords do not match'); return }
    localStorage.setItem(LOGIN_PASSWORD_KEY, newPassword)
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setMessage('Password changed'); setTimeout(() => setMessage(''), 2200)
  }
  const exportData = async () => { const result = await api.exportData(); setMessage(result.success ? 'Data exported' : result.error || 'Export canceled'); setTimeout(() => setMessage(''), 2200) }
  const clearAllData = async () => { if (!window.confirm('Delete all clients, invoices, and reset business settings? This cannot be undone.')) return; await api.clearAllData(); setClientDraft(blankClient); setEditingClient(undefined); setCurrentInvoice(null); await refresh(); setMessage('All stored data deleted'); setTimeout(() => setMessage(''), 2200) }
  const savedInvoice = async (invoice: Invoice) => { try { const saved = await api.saveInvoice(invoice); setCurrentInvoice(saved); if (settings?.archive_path) { const archiveResult = await api.archiveInvoicePdf(saved.id!); if (!archiveResult.success && archiveResult.error) setMessage(`Invoice saved, but PDF archive failed: ${archiveResult.error}`) } await refresh(); if (!message) { setMessage('Invoice saved'); setTimeout(() => setMessage(''), 2200) } return saved } catch (error) { setMessage(`Invoice save failed: ${String(error)}`); setTimeout(() => setMessage(''), 3200); throw error } }
  const openArchiveFolder = async () => { try { const result = await api.openArchiveFolder(); if (!result.success && result.error) { setMessage(result.error); setTimeout(() => setMessage(''), 3200) } } catch (error) { setMessage(`Archive folder failed: ${String(error)}`); setTimeout(() => setMessage(''), 3200) } }
  const saveAndPrint = async (invoice?: Invoice) => { try { if (!invoice) return; const saved = invoice.id ? invoice : await savedInvoice(invoice); const result = await api.printInvoice(saved.id!); if (!result.success && result.error) setMessage(`Print failed: ${result.error}`); return result } catch (error) { setMessage(`Print failed: ${String(error)}`); setTimeout(() => setMessage(''), 3200) } }
  const saveAndExportPdf = async (invoice?: Invoice) => { try { if (!invoice) return; const saved = invoice.id ? invoice : await savedInvoice(invoice); const result = await api.exportInvoicePdf(saved.id!); if (!result.success && result.error) setMessage(`PDF save failed: ${result.error}`); return result } catch (error) { setMessage(`PDF save failed: ${String(error)}`); setTimeout(() => setMessage(''), 3200) } }
  const deleteInvoice = async (invoice: Invoice) => { if (!invoice.id || !window.confirm(`Permanently delete invoice ${invoice.invoice_no || ''}? This cannot be undone.`)) return; await api.deleteInvoice(invoice.id); if (currentInvoice?.id === invoice.id) { setCurrentInvoice(null); setView('invoices') }; await refresh(); setMessage('Invoice permanently deleted'); setTimeout(() => setMessage(''), 2200) }
  const invoiceRows = (kind: InvoiceKind) => invoices.filter((invoice) => (invoice.invoice_kind || 'gst') === kind)
  const renderInvoiceRows = (kind: InvoiceKind) => {
    const rows = invoiceRows(kind)
    return rows.length === 0 ? <div className="empty-state compact-empty">No {kind === 'dispatch' ? 'dispatch notes' : 'GST invoices'} yet.</div> : <div className="invoice-list">{rows.map((invoice) => <div className="invoice-list-row" role="button" tabIndex={0} key={invoice.id} onClick={() => void openInvoice(invoice.id!)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') void openInvoice(invoice.id!) }}><span><strong>{invoice.invoice_no || 'Unnumbered'}</strong><small>{invoice.client?.name || 'Walk-in customer'}</small></span><span>{invoice.date}</span><span className={`status ${invoice.status}`}>{invoice.status}</span><span>₹ {invoice.items.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-IN')}</span><button className="invoice-delete" type="button" onClick={(event) => { event.stopPropagation(); void deleteInvoice(invoice) }}>Delete</button></div>)}</div>
  }

  if (!authenticated) return <LoginScreen onLogin={() => setAuthenticated(true)} />

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand-lockup"><img className="app-logo" src={logoImage} alt="Billing software logo" /><span>Billing software</span></div><p className="workspace-label">Offline workspace</p><nav className="nav-list">
      <button className={view === 'invoices' ? 'nav-item active' : 'nav-item'} onClick={() => setView('invoices')}><span>▤</span> Invoices</button>
      <button className={view === 'clients' ? 'nav-item active' : 'nav-item'} onClick={() => setView('clients')}><span>♙</span> Clients <strong>{clients.length}</strong></button>
      <button className={view === 'items' ? 'nav-item active' : 'nav-item'} onClick={() => setView('items')}><span>▦</span> Items <strong>{catalogItems.length}</strong></button>
      <button className={view === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => setView('settings')}><span>⚙</span> Settings</button><button className="nav-item archive-nav" onClick={() => void openArchiveFolder()}><span>▣</span> Open archive</button>
    </nav><div className="offline-note"><span className="status-dot" /> All data stays on this device<button className="logout-button" type="button" onClick={() => { localStorage.removeItem(LOGIN_SESSION_KEY); setAuthenticated(false) }}>Log out</button></div></aside>
    <main className="main-content"><header className="topbar"><div><p className="eyebrow">Workspace / {view === 'invoice' ? 'Invoice editor' : view}</p><h1>{view === 'invoice' ? (currentInvoice?.id ? `${currentInvoice.invoice_kind === 'dispatch' ? 'Dispatch note' : 'Invoice'} ${currentInvoice.invoice_no}` : currentInvoice?.invoice_kind === 'dispatch' ? 'New dispatch note' : 'New invoice') : view === 'invoices' ? 'Invoices' : view === 'clients' ? 'Clients' : view === 'items' ? 'Items' : 'Settings'}</h1></div><div className="topbar-actions"><span className="local-badge"><span className="status-dot" /> Local only</span><span className="avatar">{settings?.name?.slice(0, 2).toUpperCase() || 'B'}</span></div></header>
      {message && <div className="toast">{message}</div>}
      {view === 'invoices' && <section className="library-panel invoices-workspace"><div className="panel-heading"><div><span className="section-kicker">SQLite archive</span><h2>Past invoices</h2></div><button className="solid-button" onClick={() => setInvoiceChooserOpen(true)}>+ New invoice</button></div><input className="search-input" placeholder="Search invoice number, client, or date" value={search} onChange={(event) => setSearch(event.target.value)} /><div className="invoice-split-grid"><section className="invoice-type-panel"><div className="invoice-type-heading"><span className="invoice-type-icon">₹</span><div><strong>GST invoices</strong><small>Tax invoices and billing records</small></div><b>{invoiceRows('gst').length}</b></div>{renderInvoiceRows('gst')}</section><section className="invoice-type-panel dispatch-panel"><div className="invoice-type-heading"><span className="invoice-type-icon dispatch-icon">↗</span><div><strong>Dispatch notes</strong><small>Goods dispatched and pending bills</small></div><b>{invoiceRows('dispatch').length}</b></div>{renderInvoiceRows('dispatch')}</section></div></section>}
      {view === 'invoice' && currentInvoice && <div className="invoice-wrap"><InvoiceBill key={currentInvoice.id || 'new'} initialInvoice={currentInvoice} sellerProfile={settings || undefined} clients={clients} savedInvoices={allInvoices} itemCatalog={catalogItems} onSave={savedInvoice} onPrint={saveAndPrint} onExportPdf={saveAndExportPdf} /></div>}
      {view === 'items' && <section className="library-panel items-workspace"><div className="panel-heading"><div><span className="section-kicker">Local catalog</span><h2>Item manager</h2></div><span className="catalog-count">{catalogItems.length} saved</span></div><p className="panel-subtitle">Save common goods and services once, then reuse them in your invoices.</p><form className="client-form item-form manager-form" onSubmit={saveItem}><input placeholder="Item description *" value={itemDraft.description} onChange={(event) => setItemDraft({ ...itemDraft, description: event.target.value })} /><input placeholder="HSN code" value={itemDraft.hsn} onChange={(event) => setItemDraft({ ...itemDraft, hsn: event.target.value })} /><input placeholder="Unit (Kg, Job, Day)" value={itemDraft.unit} onChange={(event) => setItemDraft({ ...itemDraft, unit: event.target.value })} /><input type="number" placeholder="Rate" value={itemDraft.rate} onChange={(event) => setItemDraft({ ...itemDraft, rate: Number(event.target.value) })} /><button className="solid-button" type="submit">{editingItem ? 'Update item' : 'Add item'}</button></form>{catalogItems.length === 0 ? <div className="empty-state">No saved items yet. Add common goods or services here.</div> : <div className="catalog-grid">{catalogItems.map((item) => <article className="catalog-card" key={item.id}><div className="item-symbol">#</div><div className="catalog-card-body"><strong>{item.description}</strong><span>{item.hsn || 'No HSN'} <i>·</i> {item.unit}</span><b>₹ {item.rate.toLocaleString('en-IN')}</b></div><div className="catalog-card-actions"><button className="text-button" onClick={() => editItem(item)}>Edit</button><button className="danger-button" onClick={async () => { await api.deleteCatalogItem(item.id); await refresh() }}>Delete</button></div></article>)}</div>}</section>}
      {view === 'clients' && <section className="library-panel"><div className="panel-heading"><div><span className="section-kicker">Local archive</span><h2>Client manager</h2></div></div><form className="client-form manager-form" onSubmit={saveClient}><input placeholder="Client name *" value={clientDraft.name} onChange={(event) => setClientDraft({ ...clientDraft, name: event.target.value })} /><input placeholder="Address" value={clientDraft.address} onChange={(event) => setClientDraft({ ...clientDraft, address: event.target.value })} /><input placeholder="GSTIN" value={clientDraft.gstin} onChange={(event) => setClientDraft({ ...clientDraft, gstin: event.target.value })} /><input placeholder="State code" value={clientDraft.state_code} onChange={(event) => setClientDraft({ ...clientDraft, state_code: event.target.value })} /><input placeholder="Contact number" value={clientDraft.phone} onChange={(event) => setClientDraft({ ...clientDraft, phone: event.target.value })} /><button className="solid-button" type="submit">{editingClient ? 'Update client' : 'Add client'}</button></form>{clients.map((client) => <div className="library-row" key={client.id}><div className="row-avatar">{client.name.slice(0, 1)}</div><div><strong>{client.name}</strong><p>{client.address || 'No address'} {client.gstin && `· ${client.gstin}`} {client.phone && `· ${client.phone}`}</p></div><button className="text-button" onClick={() => editClient(client)}>Edit</button><button className="danger-button" onClick={async () => { await api.deleteClient(client.id); await refresh() }}>Delete</button></div>)}</section>}
      {view === 'settings' && settings && <section className="library-panel settings-panel"><div className="panel-heading"><div><span className="section-kicker">Stored locally</span><h2>Business profile</h2></div></div><form className="settings-form" onSubmit={saveSettings}>{(['name', 'tagline', 'address', 'gstin', 'state_code', 'state_name', 'phone', 'bank_name', 'acc_no', 'ifsc', 'branch', 'invoice_prefix'] as const).map((field) => <label key={field}>{field.replace('_', ' ')}<input value={settings[field]} onChange={(event) => setSettings({ ...settings, [field]: event.target.value })} /></label>)}<label>GST rate (%)<input type="number" min="0" max="100" step="0.01" value={settings.default_tax_rate} onChange={(event) => setSettings({ ...settings, default_tax_rate: Number(event.target.value) })} /></label><button className="solid-button" type="submit">Save settings</button></form><form className="password-form" onSubmit={changePassword}><div><span className="section-kicker">Account security</span><h2>Change password</h2><p>Update the password used to open this app.</p></div><label>Current password<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label><label>New password<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" /></label><label>Confirm new password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /></label><button className="solid-button" type="submit">Change password</button></form><div className="data-tools"><div><strong>Data tools</strong><p>Export a spreadsheet backup or reset this device.</p></div><div className="data-tool-actions"><button className="outline-button" type="button" onClick={() => void exportData()}>Export Excel data</button><button className="danger-button danger-action" type="button" onClick={() => void clearAllData()}>Delete all stored data</button></div></div><p className="data-path">Data stored at: <strong>{settings.dataPath}</strong></p></section>}
      {invoiceChooserOpen && <div className="modal-backdrop" role="presentation" onClick={() => setInvoiceChooserOpen(false)}><div className="invoice-chooser" role="dialog" aria-modal="true" aria-labelledby="invoice-type-title" onClick={(event) => event.stopPropagation()}><span className="section-kicker">New document</span><h2 id="invoice-type-title">Choose a form</h2><p>Select the document you want to prepare.</p><div className="invoice-choice-grid"><button onClick={() => newInvoice('gst')}><strong>GST invoice</strong><span>Tax invoice with itemized rates and totals.</span></button><button onClick={() => newInvoice('dispatch')}><strong>Dispatch note</strong><span>Dispatch record styled after the attached paper form.</span></button></div><button className="text-button chooser-close" onClick={() => setInvoiceChooserOpen(false)}>Cancel</button></div></div>}
      {view === 'settings' && settings && <section className="library-panel archive-settings"><div><span className="section-kicker">Automatic PDF archive</span><h2>Invoice storage folder</h2><p>New invoices and dispatch notes are saved automatically inside the application data folder.</p><small>{settings.archive_path}</small></div><button className="outline-button" type="button" onClick={() => void openArchiveFolder()}>Open folder</button></section>}
    </main>
  </div>
}
export default App
