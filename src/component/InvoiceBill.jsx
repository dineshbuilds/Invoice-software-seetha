 import React, { useState, useMemo, useRef } from "react";
import logoImage from "../assets/image.png";

/**
 * InvoiceBill.jsx
 * A self-contained, editable GST-style invoice/bill builder.
 * Modeled on a handwritten job-works ledger invoice: ruled sheet,
 * letterhead band, itemised table, tax block, bank + signature footer.
 *
 * No external UI libraries required — plain React + inline <style>.
 * Drop this component anywhere in a React app:
 *    import InvoiceBill from "./InvoiceBill";
 *    <InvoiceBill />
 */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}

function threeDigits(n) {
  if (n < 100) return twoDigits(n);
  return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + twoDigits(n % 100) : "");
}

function numberToWordsIndian(num) {
  const n = Math.round(num);
  if (n === 0) return "Zero";
  let remainder = n;
  const crore = Math.floor(remainder / 10000000);
  remainder %= 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  const thousand = Math.floor(remainder / 1000);
  remainder %= 1000;
  const hundred = remainder;

  const parts = [];
  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh) parts.push(threeDigits(lakh) + " Lakh");
  if (thousand) parts.push(threeDigits(thousand) + " Thousand");
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(" ").trim();
}

function formatINR(n) {
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPhoneLines(phone) {
  const numbers = phone.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean);
  return [numbers.slice(0, 2).join(" / "), numbers.slice(2).join(" / ")].filter(Boolean);
}

let rowSeed = 1;
function newRow() {
  rowSeed += 1;
  return { id: rowSeed, description: "", hsn: "", qty: "", unit: "Kg", rate: "" };
}

const defaultSeller = {
  name: "Your Business Name",
  tagline: "Line of business / trade name",
  address: "Address line, City - PIN",
  gstin: "",
  stateCode: "",
  stateName: "",
  phone: "",
  bankName: "",
  accNo: "",
  ifsc: "",
  branch: "",
};

const defaultBuyer = {
  name: "",
  address: "",
  gstin: "",
  stateCode: "",
  phone: "",
};

function DispatchNote({ initialInvoice, sellerProfile, clients, savedInvoices, onSave, onPrint }) {
  const [seller] = useState({ ...defaultSeller, ...sellerProfile, stateCode: sellerProfile?.state_code || "", stateName: sellerProfile?.state_name || "" });
  const [buyer, setBuyer] = useState({ ...defaultBuyer, ...(initialInvoice.client || {}) });
  const [invoiceNo, setInvoiceNo] = useState(initialInvoice.invoice_no || "");
  const [invoiceDate, setInvoiceDate] = useState(initialInvoice.date || new Date().toISOString().slice(0, 10));
  const savedDispatch = (() => { try { return JSON.parse(initialInvoice.notes || "{}"); } catch { return {}; } })();
  const [dispatch, setDispatch] = useState({ bobbins: "", bobbinMeters: "", totalBobbins: "", kondies: "", flower: "", totalKondies: "", totalBundle: "", through: "", lrNo: "", lrDate: "", bNo: "", bDate: "", ...savedDispatch.dispatch });
  const [pending, setPending] = useState(savedDispatch.pending || [{ bill: "", date: "", amount: "" }, { bill: "", date: "", amount: "" }, { bill: "", date: "", amount: "" }, { bill: "", date: "", amount: "" }, { bill: "", date: "", amount: "" }]);
  const [activePendingPicker, setActivePendingPicker] = useState(null);
  const pastInvoices = (savedInvoices || []).filter((entry) => !initialInvoice.id || String(entry.id) !== String(initialInvoice.id));
  const pendingTotal = pending.reduce((total, row) => total + (parseFloat(row.amount) || 0), 0);
  const pendingAmountInWords = `Rupees ${numberToWordsIndian(pendingTotal)} Only`;
  const updatePending = (index, changes) => setPending((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  const selectPendingInvoice = (index, invoiceId) => {
    const selected = pastInvoices.find((entry) => entry.id === Number(invoiceId));
    if (!selected) return;
    const amount = selected.items.reduce((total, item) => total + (Number(item.amount) || 0), 0);
    updatePending(index, { bill: selected.invoice_no || "", date: selected.date || "", amount: amount.toFixed(2) });
    setActivePendingPicker(null);
  };
  const updateDispatch = (field, value) => setDispatch((current) => ({ ...current, [field]: value }));
  const buildInvoice = () => ({ ...initialInvoice, invoice_kind: "dispatch", invoice_no: invoiceNo, date: invoiceDate, client_id: buyer.id || null, notes: JSON.stringify({ dispatch, pending }), items: [{ description: "Babbins", hsn: "", qty: Number(dispatch.bobbins) || 0, unit: "Nos", rate: 0, amount: 0 }, { description: "Kondies", hsn: "", qty: Number(dispatch.kondies) || 0, unit: "Nos", rate: 0, amount: 0 }] });
  const save = () => onSave?.(buildInvoice());
  const print = async () => { const saved = await onSave?.(buildInvoice()); if (onPrint) await onPrint(saved || buildInvoice()); else window.print(); };
  const field = (name, placeholder = "") => <input value={dispatch[name]} placeholder={placeholder} onChange={(event) => updateDispatch(name, event.target.value)} />;
  const multiLineField = (name) => <textarea className="dispatch-value-field" rows={3} maxLength={48} value={dispatch[name]} onChange={(event) => updateDispatch(name, event.target.value)} />;

  return <div className="ib-root dispatch-root">
    <style>{` .dispatch-root { background: #e6e5e1; padding: 24px 14px 56px; font-family: Arial, Helvetica, sans-serif; color: #1e397f; } .dispatch-toolbar { max-width: 760px; margin: 0 auto 12px; display: flex; justify-content: flex-end; gap: 7px; } .dispatch-toolbar button { padding: 9px 16px; border: 1px solid #1e397f; background: #fff; color: #1e397f; cursor: pointer; } .dispatch-sheet { width: min(100%, 760px); min-height: 1060px; margin: 0 auto; border: 2px solid #1e397f; background: #fff; } .dispatch-head { position: relative; padding: 18px 18px 12px 125px; min-height: 138px; border-bottom: 2px solid #1e397f; text-align: center; } .dispatch-logo { position: absolute; left: 14px; top: 22px; width: 95px; height: 90px; object-fit: contain; } .dispatch-gstin { position: absolute; left: 14px; top: 7px; font-size: 11px; font-weight: 700; } .dispatch-phone { position: absolute; right: 12px; top: 7px; font-size: 11px; font-weight: 700; } .dispatch-head h2 { display: inline-block; margin: 16px 0 4px; padding: 3px 13px; border: 2px solid #1e397f; border-radius: 4px; font: 700 25px Georgia, serif; } .dispatch-head h3 { margin: 0 0 6px; font: 700 16px Georgia, serif; } .dispatch-head p { margin: 0; white-space: pre-line; font-size: 12px; font-weight: 700; } .dispatch-meta { display: grid; grid-template-columns: 1fr 180px; gap: 18px; padding: 10px 13px; border-bottom: 2px solid #1e397f; font-size: 12px; } .dispatch-meta label { display: block; margin-bottom: 7px; } .dispatch-meta input, .dispatch-head input, .dispatch-table input, .dispatch-pending input { min-width: 0; border: 0; border-bottom: 1px dotted #7180a7; background: transparent; color: #1e397f; font: inherit; } .dispatch-section-title { margin: 0; padding: 7px 13px; font-size: 15px; } .dispatch-table { width: 100%; border-collapse: collapse; table-layout: fixed; } .dispatch-table th, .dispatch-table td { padding: 7px 8px; border: 1px solid #1e397f; font-size: 12px; text-align: center; } .dispatch-table th { height: 43px; font-size: 11px; } .dispatch-table td { height: 72px; vertical-align: top; } .dispatch-table th:first-child, .dispatch-table td:first-child { width: 28%; } .dispatch-table th:nth-child(2), .dispatch-table td:nth-child(2) { width: 28%; } .dispatch-table th:nth-child(3), .dispatch-table td:nth-child(3) { width: 22%; } .dispatch-reference { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 12px 13px; border-bottom: 2px solid #1e397f; font-size: 12px; } .dispatch-reference > div { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 6px; align-items: center; } .dispatch-reference input { min-width: 0; border: 0; border-bottom: 1px dotted #7180a7; background: transparent; color: #1e397f; font: inherit; } .dispatch-pending { padding: 8px 13px 12px; } .dispatch-pending > strong { display: block; margin-bottom: 6px; } .dispatch-pending-row { display: grid; grid-template-columns: 25px 1.2fr 1fr 1fr; gap: 6px; padding: 5px 0; font-size: 12px; } .dispatch-total { padding: 6px 13px; text-align: right; border-top: 1px solid #1e397f; font-size: 12px; } .dispatch-footer { min-height: 145px; display: flex; align-items: flex-end; justify-content: flex-end; padding: 18px 28px; border-top: 2px solid #1e397f; } .dispatch-footer strong { margin-bottom: 35px; } .dispatch-sheet input:focus { outline: none; background: #f1f4fb; } @media print { .dispatch-root { width: 210mm; min-height: 297mm; padding: 0; background: #fff; } .dispatch-toolbar { display: none; } .dispatch-sheet { width: 210mm; min-height: 297mm; border: 2px solid #1e397f; box-shadow: none; } } @media (max-width: 640px) { .dispatch-head { padding: 104px 12px 12px; } .dispatch-logo { top: 26px; left: 12px; width: 72px; height: 72px; } .dispatch-gstin, .dispatch-phone { top: 7px; } .dispatch-meta, .dispatch-reference { grid-template-columns: 1fr; } .dispatch-pending-row { grid-template-columns: 25px 1fr 1fr; } .dispatch-pending-row input:last-child { grid-column: 2 / -1; } } `}</style>
    <style>{`.dispatch-section-title { text-align: center; font-weight: 700; } .dispatch-column-title { display: block; font-weight: 700; line-height: 1.15; white-space: nowrap; } .dispatch-value-field { display: block; width: 100%; height: 58px; min-height: 58px; padding: 0; border: 0; background: transparent; color: #1e397f; font: inherit; line-height: 1.25; resize: none; overflow: hidden; white-space: pre-wrap; overflow-wrap: anywhere; text-align: center; } .dispatch-table td { height: 72px; vertical-align: top; } @media print { .dispatch-root { width: 202mm !important; height: auto !important; min-height: 0 !important; padding: 0 !important; background: #fff; } .dispatch-sheet { width: 202mm !important; max-width: 202mm !important; height: 275mm !important; min-height: 0 !important; border: 2px solid #1e397f; box-shadow: none; font-size: 12.5px; overflow: hidden; } .dispatch-table th { height: 48px; } .dispatch-value-field { height: 58px; min-height: 58px; } }`}</style>
    <style>{` .dispatch-meta { grid-template-columns: minmax(0, 1fr) 180px; font-size: 13px; font-weight: 700; } .dispatch-meta label { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px; align-items: start; } .dispatch-meta label > div { min-width: 0; display: grid; gap: 3px; } .dispatch-buyer-name, .dispatch-buyer-address { width: 100%; min-width: 0; border: 0; border-bottom: 1px dotted #7180a7; background: transparent; color: #1e397f; font: inherit; font-weight: 700; } .dispatch-buyer-address { height: 42px; resize: none; line-height: 1.35; } .dispatch-meta select { width: fit-content; max-width: 100%; } .dispatch-section-title { font-size: 16px; } .dispatch-table th, .dispatch-table td { font-size: 13px; font-weight: 700; } .dispatch-reference, .dispatch-pending, .dispatch-total, .dispatch-footer { font-size: 13px; font-weight: 700; } .dispatch-pending-row { display: grid; grid-template-columns: 28px minmax(230px, 1.3fr) minmax(130px, .75fr) minmax(150px, .9fr); gap: 10px; align-items: center; padding: 5px 0; } .dispatch-pending-row > span { min-width: 0; } .dispatch-pending-row input, .dispatch-pending-row select { max-width: 100%; } .dispatch-total { text-align: right; } .dispatch-footer { min-height: 130px; padding: 58px 28px 12px; display: flex; justify-content: space-between; align-items: flex-start; } .dispatch-footer strong { margin-left: auto; } @media print { .dispatch-head { min-height: 112px; padding-top: 14px; } .dispatch-logo { top: 17px; width: 78px; height: 75px; } .dispatch-head h2 { margin-top: 10px; font-size: 21px; } .dispatch-head h3 { font-size: 14px; } .dispatch-head p { font-size: 10px; } .dispatch-meta { padding: 7px 11px; font-size: 11px; } .dispatch-section-title { padding: 5px 11px; font-size: 13px; } .dispatch-table th, .dispatch-table td { padding: 5px 6px; font-size: 11px; } .dispatch-table td { height: 62px; } .dispatch-value-field { height: 50px; min-height: 50px; } .dispatch-reference, .dispatch-pending, .dispatch-total, .dispatch-footer { font-size: 11px; } .dispatch-reference { padding: 7px 11px; } .dispatch-pending { padding: 7px 11px 3px; } .dispatch-pending-row { grid-template-columns: 22px minmax(205px, 1.3fr) minmax(110px, .75fr) minmax(125px, .9fr); gap: 7px; padding: 3px 0; } .dispatch-total { padding: 5px 11px; } .dispatch-footer { min-height: 95px; padding: 38px 22px 8px; } }`}</style>
    <div className="dispatch-toolbar"><button onClick={save}>Save invoice</button><button onClick={print}>Print</button></div>
    <div className="dispatch-sheet">
      <header className="dispatch-head"><img className="dispatch-logo" src={logoImage} alt="Business logo" /><span className="dispatch-gstin">GSTIN : {seller.gstin}</span><span className="dispatch-phone">{formatPhoneLines(seller.phone).join(", ")}</span><h2>{seller.name}</h2><h3>{seller.tagline}</h3><p>{seller.address}</p></header>
      <div className="dispatch-meta"><label><span>To: M/s</span><div><input className="dispatch-buyer-name" value={buyer.name} onChange={(event) => setBuyer({ ...buyer, name: event.target.value })} /><textarea className="dispatch-buyer-address" rows={2} value={buyer.address || ""} onChange={(event) => setBuyer({ ...buyer, address: event.target.value })} />{clients.length > 0 && <select className="ib-print-hide" value={buyer.id || ""} onChange={(event) => { const client = clients.find((entry) => entry.id === Number(event.target.value)); if (client) setBuyer(client); }}><option value="">Select saved client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>}</div></label><label><span>Dispatch No.</span><input value={invoiceNo} onChange={(event) => setInvoiceNo(event.target.value)} /><span>Date</span><input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} /></label></div>
      <h3 className="dispatch-section-title">To day we have dispatched</h3>
      <h4 className="dispatch-section-title">1. BABBINS</h4><table className="dispatch-table"><thead><tr><th><span className="dispatch-column-title">ILAI</span></th><th><span className="dispatch-column-title">MTRS</span></th><th><span className="dispatch-column-title">TOTAL<br />BABBINS Nos</span></th></tr></thead><tbody><tr><td>{multiLineField("bobbins")}</td><td>{multiLineField("bobbinMeters")}</td><td>{multiLineField("totalBobbins")}</td></tr></tbody></table>
      <h4 className="dispatch-section-title">2. KONDIES</h4><table className="dispatch-table"><thead><tr><th><span className="dispatch-column-title">KONDIES</span></th><th><span className="dispatch-column-title">FLOWER</span></th><th><span className="dispatch-column-title">TOTAL<br />KONDIES</span></th><th><span className="dispatch-column-title">TOTAL BUNDLE</span></th></tr></thead><tbody><tr><td>{multiLineField("kondies")}</td><td>{multiLineField("flower")}</td><td>{multiLineField("totalKondies")}</td><td>{multiLineField("totalBundle")}</td></tr></tbody></table>
      <div className="dispatch-reference"><div><span>Through L.R.No</span>{field("lrNo")}<span>Date</span>{field("lrDate")}</div><div><span>B.No.</span>{field("bNo")}<span>Date</span>{field("bDate")}</div></div>
      <div className="dispatch-pending"><strong>Pending Bills</strong>{pending.map((row, index) => <div className="dispatch-pending-row" key={index}><span>{index + 1}.</span><span>Bill No. {activePendingPicker === index && <select className="dispatch-invoice-picker" autoFocus value="" onChange={(event) => selectPendingInvoice(index, event.target.value)}><option value="">Select saved invoice</option>{pastInvoices.map((entry) => <option key={entry.id} value={entry.id}>{entry.invoice_no || "Unnumbered"} - {entry.date}</option>)}</select>}<input value={row.bill} onClick={() => setActivePendingPicker(index)} onFocus={() => setActivePendingPicker(index)} onChange={(event) => updatePending(index, { bill: event.target.value })} /></span><span>Date <input value={row.date} onChange={(event) => updatePending(index, { date: event.target.value })} /></span><span>Amount <input value={row.amount} onChange={(event) => updatePending(index, { amount: event.target.value })} /></span></div>)}</div>
      <div className="dispatch-total">Total Amount ₹ {formatINR(pendingTotal)}</div><div className="dispatch-footer"><span>Rupees in words: {pendingAmountInWords}</span><strong>Signature</strong></div>
    </div>
  </div>;
}

export default function InvoiceBill({ initialBuyer, initialRows, initialInvoice, sellerProfile, clients = [], savedInvoices = [], itemCatalog = [], onSave, onPrint, onExportPdf }) {
  const invoice = initialInvoice || {};
  const [seller, setSeller] = useState(sellerProfile ? { ...defaultSeller, ...sellerProfile, stateCode: sellerProfile.state_code, stateName: sellerProfile.state_name, bankName: sellerProfile.bank_name, accNo: sellerProfile.acc_no } : defaultSeller);
  const buyerSource = invoice.client || initialBuyer || {};
  const [buyer, setBuyer] = useState({ ...defaultBuyer, ...buyerSource, stateCode: buyerSource.stateCode || buyerSource.state_code || "" });
  const [invoiceNo, setInvoiceNo] = useState(invoice.invoice_no || "");
  const [invoiceDate, setInvoiceDate] = useState(invoice.date || new Date().toISOString().slice(0, 10));
  const placeOfSupply = invoice.place_of_supply || "";
  const taxMode = invoice.tax_mode || "igst";
  const taxRate = invoice.tax_rate ?? sellerProfile?.default_tax_rate ?? 5;
  const notes = invoice.notes || "";
  const [rows, setRows] = useState(invoice.items?.length ? invoice.items.map((row) => ({ ...row, id: row.id || ++rowSeed })) : initialRows?.length ? initialRows : [newRow(), newRow()]);
  const [activeItemSuggestion, setActiveItemSuggestion] = useState(null);
  const [clientSuggestionsOpen, setClientSuggestionsOpen] = useState(false);
  const printRef = useRef(null);

  const updateRow = (id, field, value) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };
  const addRow = () => setRows((rs) => [...rs, newRow()]);
  const removeRow = (id) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  const matchingClients = clients
    .filter((client) => client.name.toLowerCase().includes((buyer.name || '').toLowerCase()))
    .sort((a, b) => {
      const search = (buyer.name || '').toLowerCase();
      const aStarts = a.name.toLowerCase().startsWith(search);
      const bStarts = b.name.toLowerCase().startsWith(search);
      return Number(bStarts) - Number(aStarts) || a.name.localeCompare(b.name);
    })
    .slice(0, 6);
  const selectClient = (client) => { setBuyer({ ...client, stateCode: client.state_code }); setClientSuggestionsOpen(false); };
  const getItemSearchTerm = (description) => description.split(",").pop().trim().toLowerCase();
  const matchingItems = (description) => {
    const search = getItemSearchTerm(description);
    return itemCatalog
      .filter((item) => item.description.toLowerCase().includes(search))
      .sort((a, b) => {
        const aStarts = a.description.toLowerCase().startsWith(search);
        const bStarts = b.description.toLowerCase().startsWith(search);
        return Number(bStarts) - Number(aStarts) || a.description.localeCompare(b.description);
      })
      .slice(0, 6);
  };
  const selectItem = (rowId, item) => {
    setRows((current) => {
      const next = current.map((row) => {
        if (row.id !== rowId) return row;
        const description = row.description.trim();
        const prefix = description.includes(",") ? `${description.slice(0, description.lastIndexOf(",") + 1).trim()} ` : "";
        return { ...row, description: `${prefix}${item.description}`, hsn: item.hsn, unit: item.unit, rate: item.rate, qty: row.qty || 1 };
      });
      const selectedIndex = next.findIndex((row) => row.id === rowId);
      return selectedIndex === next.length - 1 ? [...next, newRow()] : next;
    });
    setActiveItemSuggestion(null);
  };

  const lineAmounts = useMemo(
    () =>
      rows.map((r) => {
        const qty = parseFloat(r.qty) || 0;
        const rate = parseFloat(r.rate) || 0;
        return qty * rate;
      }),
    [rows]
  );

  const subtotal = lineAmounts.reduce((a, b) => a + b, 0);

  const taxBreakup = useMemo(() => {
    const rate = parseFloat(taxRate) || 0;
    if (taxMode === "igst") {
      const igst = (subtotal * rate) / 100;
      return { igst, cgst: 0, sgst: 0, total: igst };
    }
    const half = rate / 2;
    const cgst = (subtotal * half) / 100;
    const sgst = (subtotal * half) / 100;
    return { igst: 0, cgst, sgst, total: cgst + sgst };
  }, [subtotal, taxRate, taxMode]);

  const grandTotalRaw = subtotal + taxBreakup.total;
  const grandTotal = Math.round(grandTotalRaw);
  const roundOff = grandTotal - grandTotalRaw;
  const amountInWords = `Rupees ${numberToWordsIndian(grandTotal)} Only`;

  const buildInvoice = () => ({ id: invoice.id, invoice_kind: "gst", invoice_no: invoiceNo, date: invoiceDate, client_id: buyer.id || null, place_of_supply: placeOfSupply, tax_mode: taxMode, tax_rate: Number(taxRate) || 0, notes, status: invoice.status || "draft", items: rows.map((row, index) => ({ id: row.id, description: row.description, hsn: row.hsn, qty: parseFloat(row.qty) || 0, unit: row.unit, rate: parseFloat(row.rate) || 0, amount: lineAmounts[index] || 0 })) });
  const handleSave = () => onSave?.(buildInvoice());
  const handlePrint = async () => {
    const saved = await onSave?.(buildInvoice());
    if (onPrint) await onPrint(saved || buildInvoice());
    else window.print();
  };
  const handleExportPdf = async () => {
    const saved = await onSave?.(buildInvoice());
    if (onExportPdf) await onExportPdf(saved || buildInvoice());
    else window.print();
  };

  if (invoice.invoice_kind === "dispatch") {
    return <DispatchNote initialInvoice={invoice} sellerProfile={sellerProfile} clients={clients} savedInvoices={savedInvoices} onSave={onSave} onPrint={onPrint} />;
  }

  return (
    <div className="ib-root">
      <style>{`
        .ib-root {
          --ink: #1b1d1f;
          --rule: #b9bcc2;
          --rule-strong: #1b1d1f;
          --paper: #fdfdfb;
          --muted: #63666d;
          --accent: #7a2e22;
          --field-bg: #f6f5f2;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: var(--ink);
          background: #e9e8e4;
          min-height: 100vh;
          padding: 32px 16px 64px;
          box-sizing: border-box;
        }
        .ib-root *, .ib-root *::before, .ib-root *::after { box-sizing: border-box; }

        .ib-toolbar {
          max-width: 820px;
          margin: 0 auto 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .ib-toolbar-title {
          font-size: 13px;
          letter-spacing: 0.02em;
          color: var(--muted);
        }
        .ib-btn {
          font-family: inherit;
          font-size: 14px;
          padding: 9px 18px;
          border-radius: 3px;
          border: 1px solid var(--rule-strong);
          background: var(--ink);
          color: var(--paper);
          cursor: pointer;
        }
        .ib-btn:hover { background: #000; }
        .ib-btn.ib-secondary {
          background: transparent;
          color: var(--ink);
        }

        .ib-sheet {
          max-width: 820px;
          margin: 0 auto;
          background: var(--paper);
          border: 1.5px solid var(--rule-strong);
          font-size: 13.5px;
          line-height: 1.45;
        }

        .ib-letterhead {
          display: grid;
          grid-template-columns: 1fr auto;
          border-bottom: 1.5px solid var(--rule-strong);
        }
        .ib-brand {
          padding: 20px 22px 16px;
          border-right: 1.5px solid var(--rule-strong);
        }
        .ib-brand-name {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: var(--accent);
          border: none;
          background: transparent;
          width: 100%;
          padding: 0;
        }
        .ib-brand-tagline {
          margin-top: 3px;
          font-size: 12.5px;
          color: var(--muted);
          border: none;
          background: transparent;
          width: 100%;
          padding: 0;
        }
        .ib-brand-address {
          margin-top: 8px;
          font-size: 12px;
          color: var(--ink);
          border: none;
          background: transparent;
          width: 100%;
          resize: none;
          padding: 0;
          font-family: inherit;
        }
        .ib-brand-row {
          margin-top: 6px;
          display: flex;
          gap: 6px;
          font-size: 12px;
          align-items: baseline;
        }
        .ib-brand-row label { color: var(--muted); white-space: nowrap; }

        .ib-meta {
          padding: 20px 18px 16px;
          min-width: 210px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ib-meta-row { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; }
        .ib-meta-row label { color: var(--muted); }

        .ib-field {
          border: none;
          border-bottom: 1px dotted var(--rule);
          background: transparent;
          font-family: inherit;
          font-size: inherit;
          color: var(--ink);
          padding: 1px 2px;
          text-align: right;
        }
        .ib-field:focus, .ib-brand-name:focus, .ib-brand-tagline:focus,
        .ib-brand-address:focus, .ib-party-field:focus, .ib-notes:focus {
          outline: none;
          background: var(--field-bg);
        }

        .ib-parties {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1.5px solid var(--rule-strong);
        }
        .ib-party { padding: 14px 18px; }
        .ib-party + .ib-party { border-left: 1.5px solid var(--rule-strong); }
        .ib-party-label {
          font-size: 11px;
          color: var(--muted);
          margin-bottom: 6px;
        }
        .ib-party-field {
          display: block;
          width: 100%;
          border: none;
          background: transparent;
          font-family: inherit;
          padding: 2px 0;
        }
        .ib-party-field.ib-name { font-size: 14.5px; font-weight: 600; }
        .ib-party-inline { display: flex; gap: 14px; margin-top: 4px; }
        .ib-party-inline .ib-inline-item { display: flex; gap: 4px; align-items: baseline; font-size: 12px; }
        .ib-party-inline label { color: var(--muted); }
        .ib-party-inline input { width: 90px; }

        table.ib-items { width: 100%; border-collapse: collapse; }
        .ib-items thead th {
          font-size: 11px;
          font-weight: 600;
          text-align: left;
          color: var(--muted);
          padding: 8px 10px;
          border-bottom: 1.5px solid var(--rule-strong);
        }
        .ib-items thead th.ib-num { text-align: right; }
        .ib-items tbody td {
          padding: 6px 10px;
          border-bottom: 0;
          vertical-align: top;
        }
        .ib-items tbody tr:last-child td { border-bottom: 1.5px solid var(--rule-strong); }
        .ib-cell-input {
          width: 100%;
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: inherit;
          padding: 2px;
        }
        textarea.ib-cell-input { display: block; min-height: 22px; height: auto; resize: none; overflow: hidden; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.35; }
        .ib-num-col {
          font-variant-numeric: tabular-nums;
          font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
          text-align: right;
        }
        .ib-desc-col { min-width: 220px; }
        .ib-amount { font-weight: 600; }
        .ib-row-remove {
          border: none;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          font-size: 15px;
          line-height: 1;
        }
        .ib-row-remove:hover { color: var(--accent); }
        .ib-add-row {
          padding: 8px 10px;
          font-size: 12px;
          color: var(--muted);
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          border-bottom: 1.5px solid var(--rule-strong);
          width: 100%;
        }
        .ib-add-row:hover { color: var(--ink); }
        .ib-item-actions { display: flex; align-items: stretch; border-bottom: 1.5px solid var(--rule-strong); }
        .ib-item-actions .ib-add-row { border-bottom: none; }
        .ib-item-select { margin: 6px 10px; border: 1px solid var(--rule); background: var(--paper); color: var(--muted); font-family: inherit; font-size: 12px; padding: 4px 8px; }

        .ib-summary-block {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .ib-words {
          padding: 14px 18px;
          border-right: 1.5px solid var(--rule-strong);
          font-size: 12.5px;
        }
        .ib-words-label { color: var(--muted); font-size: 11px; margin-bottom: 4px; }
        .ib-words-value { font-style: italic; }
        .ib-notes {
          margin-top: 12px;
          width: 100%;
          border: none;
          border-top: 1px dotted var(--rule);
          background: transparent;
          font-family: inherit;
          font-size: 12px;
          color: var(--muted);
          resize: none;
          padding-top: 8px;
        }

        .ib-totals { padding: 0; }
        .ib-totals-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 18px;
          font-size: 12.5px;
          border-bottom: 1px solid var(--rule);
        }
        .ib-totals-row.ib-grand {
          border-top: 1.5px solid var(--rule-strong);
          border-bottom: none;
          font-size: 15px;
          font-weight: 700;
          padding: 10px 18px;
        }
        .ib-totals-row label { color: var(--muted); }
        .ib-totals-row .ib-totals-val {
          font-variant-numeric: tabular-nums;
          font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
        }
        .ib-tax-toggle {
          display: flex;
          gap: 10px;
          padding: 8px 18px;
          font-size: 11px;
          color: var(--muted);
          border-bottom: 1px solid var(--rule);
        }
        .ib-tax-toggle button {
          border: 1px solid var(--rule);
          background: transparent;
          padding: 3px 9px;
          border-radius: 20px;
          cursor: pointer;
          color: var(--muted);
        }
        .ib-tax-toggle button.ib-active {
          border-color: var(--ink);
          color: var(--ink);
          font-weight: 600;
        }
        .ib-rate-input {
          width: 34px;
          border: none;
          border-bottom: 1px dotted var(--rule);
          background: transparent;
          font-family: inherit;
          text-align: right;
        }

        .ib-footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-top: 1.5px solid var(--rule-strong);
        }
        .ib-bank { padding: 14px 18px; border-right: 1.5px solid var(--rule-strong); }
        .ib-bank-label { font-size: 11px; color: var(--muted); margin-bottom: 6px; }
        .ib-bank-row { display: flex; gap: 6px; font-size: 12px; margin-bottom: 3px; }
        .ib-bank-row label { color: var(--muted); min-width: 78px; }
        .ib-bank-row input {
          border: none;
          border-bottom: 1px dotted var(--rule);
          background: transparent;
          font-family: inherit;
          font-size: inherit;
          flex: 1;
        }
        .ib-sign {
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: flex-end;
          text-align: right;
        }
        .ib-sign-for { font-size: 12.5px; margin-bottom: 40px; }
        .ib-sign-line { font-size: 11px; color: var(--muted); border-top: 1px solid var(--rule); padding-top: 4px; width: 180px; }

        @media (max-width: 640px) {
          .ib-letterhead, .ib-parties, .ib-summary-block, .ib-footer { grid-template-columns: 1fr; }
          .ib-brand { border-right: none; border-bottom: 1.5px solid var(--rule-strong); }
          .ib-party + .ib-party { border-left: none; border-top: 1.5px solid var(--rule-strong); }
          .ib-words { border-right: none; border-bottom: 1.5px solid var(--rule-strong); }
          .ib-bank { border-right: none; border-bottom: 1.5px solid var(--rule-strong); }
          .ib-sign { align-items: flex-start; text-align: left; }
        }

        @media print {
          .ib-root { background: #fff; padding: 0; }
          .ib-toolbar { display: none; }
          .ib-sheet { border: none; max-width: 100%; }
          input, textarea { border-color: transparent !important; }
          .ib-row-remove, .ib-add-row { display: none; }
          .ib-print-hide { display: none !important; }
        }

        /* Printed ledger layout: keep the editing controls, but make the sheet match the paper bill. */
        .ib-root { background: #e6e5e1; padding: 24px 14px 56px; font-family: Arial, Helvetica, sans-serif; color: #111; }
        .ib-toolbar { max-width: 760px; }
        .ib-toolbar-actions { display: flex; gap: 7px; }
        .ib-sheet { width: min(100%, 760px); min-height: 1060px; max-width: 760px; border: 2px solid #171717; background: #fff; font-size: 12.5px; line-height: 1.25; box-shadow: 0 8px 22px rgba(0, 0, 0, .12); }
        .ib-letterhead { min-height: 240px; display: block; position: relative; border-bottom: 2px solid #171717; }
        .ib-brand { min-height: 238px; padding: 48px 18px 84px; border: 0; text-align: center; }
        .ib-brand-name { display: block; width: min(100%, 570px); margin: 0 auto 5px; padding: 5px 12px 4px; border: 3px solid #1e397f; border-radius: 5px; color: #1e397f; text-align: center; font-family: Georgia, "Times New Roman", serif; font-size: 27px; font-weight: 800; letter-spacing: .01em; }
        .ib-brand-tagline { display: block; margin: 0 auto 5px; color: #111; text-align: center; font-family: Georgia, "Times New Roman", serif; font-size: 16px; font-weight: 700; text-transform: uppercase; }
        .ib-brand-address { display: block; width: 100%; height: 34px; margin: 0 auto; color: #111; text-align: center; font-size: 12px; line-height: 1.35; }
        .ib-brand-row { position: absolute; top: 9px; margin: 0; gap: 5px; font-size: 11px; }
        .ib-brand-row:first-of-type { left: 12px; }
        .ib-brand-row:last-of-type { right: 12px; }
        .ib-brand-row label { color: #111; font-weight: 700; }
        .ib-phone-row { align-items: flex-start; }
        .ib-phone-values { display: grid; gap: 2px; text-align: right; white-space: nowrap; }
        .ib-brand-row .ib-field { color: #111; }
        .ib-meta { position: absolute; right: 0; bottom: 0; width: 41%; min-width: 0; padding: 8px 11px; gap: 5px; border-top: 1px solid #171717; border-left: 1.5px solid #171717; background: #fff; }
        .ib-meta-row { font-size: 12px; }
        .ib-meta-row label { color: #111; font-weight: 700; }
        .ib-meta-row .ib-field { width: 112px !important; color: #111; text-align: left !important; }
        .ib-parties { grid-template-columns: 59% 41%; border-bottom: 2px solid #171717; }
        .ib-party { min-height: 112px; padding: 10px 13px; }
        .ib-party + .ib-party { border-left: 1.5px solid #171717; }
        .ib-party-label { margin-bottom: 4px; color: #111; font-size: 10px; font-weight: 700; text-transform: uppercase; }
        .ib-party-field { color: #111; font-size: 13px; }
        .ib-party-field.ib-name { font-size: 15px; font-weight: 500; text-transform: uppercase; }
        .ib-party-inline { gap: 10px; margin-top: 6px; }
        .ib-party-inline .ib-inline-item { font-size: 11px; }
        .ib-party-inline label { color: #111; font-weight: 700; }
        table.ib-items { table-layout: fixed; }
        .ib-items thead th { height: 43px; padding: 5px 7px; border-right: 1px solid #171717; border-bottom: 1.5px solid #171717; color: #111; font-size: 11px; text-align: center; vertical-align: middle; }
        .ib-items thead th:nth-child(1) { width: 43px !important; }
        .ib-items thead th:nth-child(2) { width: 62px !important; }
        .ib-items thead th:nth-child(3) { width: auto !important; }
        .ib-items thead th:nth-child(4) { width: 78px !important; }
        .ib-items thead th:nth-child(5) { width: 92px !important; }
        .ib-items thead th:nth-child(6) { width: 112px !important; }
        .ib-items thead th:last-child { width: 25px !important; border-right: 0; }
        .ib-items tbody td { height: 92px; padding: 5px 7px; border-right: 1px solid #171717; border-bottom: 0; }
        .ib-items tbody tr:first-child td { height: auto; }
        .ib-items tbody td:last-child { border-right: 0; }
        .ib-cell-input { color: #111; font-size: 13px; }
        .ib-num-col { color: #111; font-family: Arial, Helvetica, sans-serif; }
        .ib-desc-col { min-width: 0; }
        .ib-item-actions { min-height: 32px; border-bottom: 1.5px solid #171717; }
        .ib-item-select { margin: 5px 8px; font-size: 11px; }
        .ib-add-row { padding: 7px 9px; border-bottom: 0; color: #333; }
        .ib-tax-toggle { justify-content: flex-end; gap: 6px; padding: 5px 10px; border-bottom: 1px solid #777; font-size: 10px; }
        .ib-tax-toggle button { padding: 2px 6px; border-radius: 0; color: #111; }
        .ib-summary-block { grid-template-columns: 53% 47%; min-height: 190px; border-bottom: 2px solid #171717; }
        .ib-words { padding: 10px 13px; border-right: 1.5px solid #171717; }
        .ib-words-label { color: #111; font-size: 11px; font-weight: 700; }
        .ib-words-value { min-height: 24px; color: #111; font-size: 12px; }
        .ib-notes { color: #111; }
        .ib-totals-row { min-height: 31px; padding: 7px 12px; border-bottom: 1px solid #777; font-size: 12px; }
        .ib-totals-row label { color: #111; font-weight: 700; }
        .ib-totals-row.ib-grand { min-height: 45px; border-top: 1px solid #171717; font-size: 16px; }
        .ib-footer { min-height: 170px; grid-template-columns: 53% 47%; border-top: 0; }
        .ib-bank { padding: 10px 13px; border-right: 1.5px solid #171717; }
        .ib-bank-label { color: #111; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .ib-bank-row { gap: 5px; margin-bottom: 4px; font-size: 11px; }
        .ib-bank-row label { min-width: 78px; color: #111; font-weight: 700; }
        .ib-bank-row input { color: #111; }
        .ib-sign { padding: 10px 13px; align-items: flex-end; }
        .ib-sign-for { margin-bottom: 58px; color: #111; font-size: 14px; font-weight: 700; }
        .ib-sign-line { width: 190px; color: #111; border-color: #171717; text-align: center; }
        .ib-brand { min-height: 226px; padding: 34px 18px 72px 148px; text-align: left; }
        .ib-brand-logo { position: absolute; left: 18px; top: 18px; width: 112px; aspect-ratio: 1; object-fit: contain; border: 1px solid #171717; }
        .ib-brand-name, .ib-brand-tagline { text-align: left; margin-left: 0; }
        .ib-brand-address { text-align: left; margin-bottom: 20px; }
        .ib-brand-row:first-of-type, .ib-brand-row:last-of-type { left: 148px; right: auto; }
        .ib-meta { display: none; }
        .ib-parties { grid-template-columns: 60% 40%; border-bottom: 0; }
        .ib-party { min-height: 126px; }
        .ib-client-select { display: block; width: 100%; margin: 0 0 4px; border: 1px solid #999; background: #fff; font: inherit; font-size: 11px; }
        .ib-invoice-meta { display: grid; gap: 7px; }
        .ib-invoice-meta .ib-meta-row { font-size: 11px; }
        .ib-invoice-meta .ib-field { width: 100%; text-align: left !important; }
        .ib-customer-gst { display: grid; grid-template-columns: 3fr 2fr; gap: 0; padding: 8px 13px; border-top: 1.5px solid #171717; border-bottom: 1.5px solid #171717; font-size: 11px; }
        .ib-customer-gst span { display: flex; align-items: baseline; min-width: 0; gap: 5px; }
        .ib-customer-gst span + span { padding-left: 14px; }
        .ib-customer-gst strong { flex: 0 0 auto; }
        .ib-customer-gst .ib-field { min-width: 0; width: 100%; text-align: left; }
        .ib-dispatch { display: grid; gap: 5px; padding: 9px 13px; border-bottom: 1.5px solid #171717; font-size: 11px; }
        .ib-dispatch-row { display: grid; grid-template-columns: 185px 1fr; gap: 6px; }
        .ib-dispatch-origin { grid-template-columns: 185px 1fr; }
        .ib-dispatch-details { grid-template-columns: 2fr 1fr 1fr; gap: 12px; }
        .ib-dispatch-details label { display: flex; align-items: baseline; gap: 5px; min-width: 0; white-space: nowrap; }
        .ib-dispatch-details input { min-width: 0; }
        .ib-dispatch input { border: none; border-bottom: 1px dotted #777; background: transparent; font: inherit; width: 100%; }
        .ib-transport input { border: none; background: transparent; font: inherit; width: 100%; }
        .ib-items tbody tr:first-child td { height: auto; }
        .ib-transport { margin-top: 22px; display: grid; gap: 9px; font-size: 11px; }
        .ib-transport-row { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px dotted #777; padding-bottom: 3px; }
        .ib-transport-row strong { flex: 0 0 auto; white-space: nowrap; }
        .ib-transport-row input { flex: 1; min-width: 0; }
        @media (max-width: 640px) { .ib-brand { padding: 122px 18px 72px; } .ib-brand-logo { width: 82px; } .ib-brand-row:first-of-type, .ib-brand-row:last-of-type { left: 18px; } .ib-dispatch-row, .ib-dispatch-details { grid-template-columns: 1fr; gap: 2px; } .ib-customer-gst { grid-template-columns: 1fr; gap: 6px; } .ib-customer-gst span + span { padding-left: 0; } }
        @media print { @page { size: A4 portrait; margin: 0; } .ib-root { width: 210mm; height: 297mm; min-height: 297mm; padding: 0; } .ib-sheet { width: 210mm; max-width: 210mm; height: 297mm; min-height: 297mm; box-shadow: none; } }
        .ib-root { background: #eef0f5; color: #1e397f; }
        .ib-sheet { font-size: 13.5px; }
        .ib-sheet { width: min(100%, 820px); border: 2px solid #1e397f; box-shadow: 0 12px 26px rgba(30, 57, 127, .12); color: #1e397f; }
        .ib-letterhead, .ib-summary-block, .ib-footer { border-color: #1e397f; }
        .ib-brand { min-height: 190px; padding: 46px 18px 66px; text-align: center; }
        .ib-brand-logo { left: 18px; top: 38px; width: 90px; border: 0; }
        .ib-brand-name { width: min(100%, 570px); margin: 0 auto 5px; padding: 5px 12px 4px; border: 3px solid #1e397f; border-radius: 5px; color: #1e397f; text-align: center; font-size: 30px; font-weight: 900; }
        .ib-brand-tagline, .ib-brand-address { color: #1e397f; text-align: center; }
        .ib-brand-row:first-of-type { left: 12px; }
        .ib-brand-row:last-of-type { left: auto; right: 12px; }
        .ib-brand-row label, .ib-brand-row .ib-field, .ib-meta-row label, .ib-party-label, .ib-party-inline label, .ib-totals-row label, .ib-bank-row label, .ib-bank-label { color: #1e397f; }
        .ib-parties { grid-template-columns: 60% 40%; }
        .ib-party + .ib-party, .ib-words, .ib-bank { border-color: #1e397f; }
        .ib-party { min-height: 124px; }
        .ib-items thead th { border-color: #1e397f; }
        .ib-items tbody td { border-color: #1e397f; border-bottom: 0; }
        .ib-items tbody tr:first-child td { height: auto; }
        .ib-items tbody td, .ib-items thead th, .ib-cell-input, .ib-num-col, .ib-totals-row, .ib-sign-for, .ib-sign-line { color: #1e397f; }
        .ib-customer-gst, .ib-dispatch, .ib-item-actions { border-color: #1e397f; }
        .ib-totals-row { min-height: 31px; border-color: #8393bd; }
        .ib-totals-row.ib-grand { border-color: #1e397f; }
        .ib-sign { align-items: center; text-align: center; }
        .ib-sign-for { margin-bottom: 58px; }
        .ib-sign-line { text-align: center; }
        @media print { .ib-brand-name { border: 3px solid #1e397f !important; } }
        @media (max-width: 640px) { .ib-brand { padding: 120px 18px 66px; } .ib-brand-logo { left: 18px; top: 18px; width: 72px; } .ib-brand-row:first-of-type, .ib-brand-row:last-of-type { left: 18px; right: auto; } .ib-sheet { width: 100%; } }
      `}</style>

      <div className="ib-toolbar">
        <span className="ib-toolbar-title">Editable bill — fill in the fields, then save or print</span>
        <div className="ib-toolbar-actions">
          <button className="ib-btn ib-secondary" onClick={handleSave}>Save invoice</button>
          <button className="ib-btn ib-secondary" onClick={handleExportPdf}>Save PDF</button>
          <button className="ib-btn" onClick={handlePrint}>Print</button>
        </div>
      </div>

      <div className="ib-sheet" ref={printRef}>
        {/* Letterhead */}
        <div className="ib-letterhead">
          <div className="ib-brand">
            <img className="ib-brand-logo" src={logoImage} alt="Business logo" />
            <input
              className="ib-brand-name"
              value={seller.name}
              onChange={(e) => setSeller({ ...seller, name: e.target.value })}
            />
            <input
              className="ib-brand-tagline"
              value={seller.tagline}
              onChange={(e) => setSeller({ ...seller, tagline: e.target.value })}
            />
            <textarea
              className="ib-brand-address"
              rows={2}
              value={seller.address}
              onChange={(e) => setSeller({ ...seller, address: e.target.value })}
            />
            <div className="ib-brand-row">
              <label>GSTIN</label>
              <input
                className="ib-field"
                style={{ textAlign: "left" }}
                value={seller.gstin}
                onChange={(e) => setSeller({ ...seller, gstin: e.target.value })}
              />
            </div>
            <div className="ib-brand-row ib-phone-row">
              <label>Cell</label>
              <div className="ib-phone-values">{formatPhoneLines(seller.phone).map((line) => <span key={line}>{line}</span>)}</div>
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="ib-parties">
          <div className="ib-party">
            <div className="ib-party-label">Client</div>
            <div className="ib-client-autocomplete">
              <input className="ib-party-field ib-name" placeholder="Buyer / client name" value={buyer.name} onFocus={() => setClientSuggestionsOpen(true)} onChange={(e) => { setBuyer({ ...buyer, id: undefined, name: e.target.value }); setClientSuggestionsOpen(true); }} onBlur={() => setTimeout(() => setClientSuggestionsOpen(false), 150)} />
              {clientSuggestionsOpen && matchingClients.length > 0 && <div className="ib-suggestion-menu">{matchingClients.map((client) => <button type="button" key={client.id} className="ib-suggestion-item" onMouseDown={() => selectClient(client)}><strong>{client.name}</strong><small>{client.address || 'Saved client'}</small></button>)}</div>}
            </div>
            <textarea
              className="ib-party-field"
              rows={2}
              placeholder="Address"
              value={buyer.address}
              onChange={(e) => setBuyer({ ...buyer, address: e.target.value })}
              style={{ resize: "none" }}
            />
          </div>
          <div className="ib-party">
            <div className="ib-party-label">Invoice details</div>
            <div className="ib-party-inline"><div className="ib-inline-item"><label>State code</label><input value={seller.stateCode} onChange={(e) => setSeller({ ...seller, stateCode: e.target.value })} /></div><div className="ib-inline-item"><label>State name</label><input value={seller.stateName || ""} onChange={(e) => setSeller({ ...seller, stateName: e.target.value })} /></div></div>
            <div className="ib-invoice-meta">
              <div className="ib-meta-row"><label>Invoice No.</label><input className="ib-field" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} /></div>
              <div className="ib-meta-row"><label>Date</label><input className="ib-field" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
            </div>
          </div>
        </div>
        <div className="ib-customer-gst"><span><strong>GSTIN</strong><input className="ib-field" value={buyer.gstin} onChange={(e) => setBuyer({ ...buyer, gstin: e.target.value })} /></span><span><strong>Contact number</strong><input className="ib-field" value={buyer.phone || ""} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} /></span></div>
        <div className="ib-dispatch">
          <div className="ib-dispatch-row ib-dispatch-origin"><strong>Goods despatched from Palani to</strong><input value={buyer.shipping || ""} onChange={(e) => setBuyer({ ...buyer, shipping: e.target.value })} /></div>
          <div className="ib-dispatch-row ib-dispatch-details"><label>Through <input value={buyer.through || ""} onChange={(e) => setBuyer({ ...buyer, through: e.target.value })} /></label><label>L.R.NO <input value={buyer.lrNo || ""} onChange={(e) => setBuyer({ ...buyer, lrNo: e.target.value })} /></label><label>Date <input type="date" value={buyer.dispatchDate || ""} onChange={(e) => setBuyer({ ...buyer, dispatchDate: e.target.value })} /></label></div>
        </div>

        {/* Items */}
        <table className="ib-items">
          <thead>
            <tr>
              <th style={{ width: 43 }}>S.<br />No.</th>
              <th style={{ width: 62 }}>HSN<br />Code</th>
              <th className="ib-desc-col">Item Description</th>
              <th className="ib-num" style={{ width: 78 }}>QTY/KG</th>
              <th className="ib-num" style={{ width: 92 }}>Rate/KG<br />Rs. &nbsp; Ps.</th>
              <th className="ib-num" style={{ width: 112 }}>Amount<br />Rs. &nbsp; Ps.</th>
              <th style={{ width: 24 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="ib-num-col">{i + 1}</td>
                <td>
                  <input className="ib-cell-input" value={r.hsn} onChange={(e) => updateRow(r.id, "hsn", e.target.value)} />
                </td>
                <td className="ib-description-cell">
                  <div className="ib-item-autocomplete">
                    <textarea className="ib-cell-input" rows={1} value={r.description} onFocus={() => setActiveItemSuggestion(r.id)} onBlur={() => setTimeout(() => setActiveItemSuggestion(null), 150)} onChange={(e) => { e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; updateRow(r.id, "description", e.target.value); }} placeholder="Describe the work or goods" />
                    {activeItemSuggestion === r.id && itemCatalog.length > 0 && matchingItems(r.description).length > 0 && <div className="ib-suggestion-menu">{matchingItems(r.description).map((item) => <button type="button" key={item.id} className="ib-suggestion-item" onMouseDown={() => selectItem(r.id, item)}><strong>{item.description}</strong><small>{item.hsn || 'No HSN'} · {item.unit} · ₹ {item.rate.toLocaleString('en-IN')}</small></button>)}</div>}
                  </div>
                </td>
                <td>
                  <input
                    className="ib-cell-input ib-num-col"
                    value={r.qty}
                    onChange={(e) => updateRow(r.id, "qty", e.target.value)}
                    inputMode="decimal"
                  />
                </td>
                <td>
                  <input
                    className="ib-cell-input ib-num-col"
                    value={r.rate}
                    onChange={(e) => updateRow(r.id, "rate", e.target.value)}
                    inputMode="decimal"
                  />
                </td>
                <td className="ib-num-col ib-amount">{formatINR(lineAmounts[i] || 0)}</td>
                <td>
                  <button className="ib-row-remove ib-print-hide" onClick={() => removeRow(r.id)} aria-label="Remove row">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ib-item-actions ib-print-hide">
          {itemCatalog.length > 0 && <select className="ib-item-select" defaultValue="" onChange={(e) => { const item = itemCatalog.find((entry) => entry.id === Number(e.target.value)); if (item) setRows((current) => [...current, { ...item, qty: "1" }]); e.target.value = ""; }}>
            <option value="">Add saved item...</option>
            {itemCatalog.map((item) => <option key={item.id} value={item.id}>{item.description}</option>)}
          </select>}
          <button className="ib-add-row" onClick={addRow}>+ Add line item</button>
        </div>

        {/* Words + totals */}
        <div className="ib-summary-block">
          <div className="ib-words">
            <div className="ib-words-label">Amount in words</div>
            <div className="ib-words-value">{amountInWords}</div>
            <div className="ib-transport"><div className="ib-transport-row"><strong>Transportation Mode:</strong><input /></div><div className="ib-transport-row"><strong>Vehicle no:</strong><input /></div><div className="ib-transport-row"><strong>Driver Signature:</strong><input /></div></div>
          </div>
          <div className="ib-totals">
            <div className="ib-totals-row">
              <label>Total</label>
              <span className="ib-totals-val">{formatINR(subtotal)}</span>
            </div>
            <div className="ib-totals-row"><label>IGST ({taxRate}%)</label><span className="ib-totals-val">{formatINR(taxBreakup.igst)}</span></div>
            <div className="ib-totals-row"><label>CGST ({(parseFloat(taxRate) || 0) / 2}%)</label><span className="ib-totals-val">{formatINR(taxBreakup.cgst)}</span></div>
            <div className="ib-totals-row"><label>SGST ({(parseFloat(taxRate) || 0) / 2}%)</label><span className="ib-totals-val">{formatINR(taxBreakup.sgst)}</span></div>
            <div className="ib-totals-row">
              <label>Round off</label>
              <span className="ib-totals-val">{roundOff >= 0 ? "+" : ""}{formatINR(roundOff)}</span>
            </div>
            <div className="ib-totals-row ib-grand">
              <label>Gr. Total</label>
              <span className="ib-totals-val">₹ {formatINR(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer: bank + signature */}
        <div className="ib-footer">
          <div className="ib-bank">
            <div className="ib-bank-label">Bank details</div>
            <div className="ib-bank-row">
              <label>Account name</label>
              <input value={seller.bankName} onChange={(e) => setSeller({ ...seller, bankName: e.target.value })} />
            </div>
            <div className="ib-bank-row">
              <label>A/c No.</label>
              <input value={seller.accNo} onChange={(e) => setSeller({ ...seller, accNo: e.target.value })} />
            </div>
            <div className="ib-bank-row">
              <label>IFSC</label>
              <input value={seller.ifsc} onChange={(e) => setSeller({ ...seller, ifsc: e.target.value })} />
            </div>
            <div className="ib-bank-row">
              <label>Branch</label>
              <input value={seller.branch} onChange={(e) => setSeller({ ...seller, branch: e.target.value })} />
            </div>
          </div>
          <div className="ib-sign">
            <div className="ib-sign-for">For {seller.name || "—"}</div>
            <div className="ib-sign-line">Authorised signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
