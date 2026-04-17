import { useState, useEffect } from "react";
import axios from "axios";
import "./Billing.css";

const Billing = () => {
  const BASE_URL = `${process.env.REACT_APP_API_BASE_URL}/api`;

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [showInvoice, setShowInvoice] = useState(false);

  const getToken = () => {
    return sessionStorage.getItem("token") || localStorage.getItem("token");
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const res = await axios.get(`${BASE_URL}/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const formatted = res.data.map((inv) => {
        const dateObj = new Date(inv.invoice_date);
        return {
          id: `INV-${inv.invoice_id}`,
          invoice_id: inv.invoice_id,
          order_id: inv.order_id,
          customer: inv.customer_name || "Unknown",
          email: inv.customer_email || "",
          amount: parseFloat(inv.total_amount || 0),
          status: inv.order_status || "pending",
          date: dateObj.toLocaleDateString("en-IN"),
        };
      });

      setInvoices(formatted);
    } catch (err) {
      console.error("Invoice fetch error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  const openInvoice = async (invoiceId) => {
    try {
      const token = getToken();
      const invoiceData = invoices.find((inv) => inv.invoice_id === invoiceId);
      if (!invoiceData) return;

      const orderRes = await axios.get(`${BASE_URL}/orders/${invoiceData.order_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const itemsRes = await axios.get(`${BASE_URL}/orders/${invoiceData.order_id}/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const orderDate = new Date(orderRes.data.order_date);
      const formattedOrderDate = orderDate.toLocaleDateString("en-IN");

      setSelectedInvoice({
        ...orderRes.data,
        customer_name: invoiceData.customer,
        customer_email: invoiceData.email,
        formattedOrderDate,
      });
      setInvoiceItems(itemsRes.data);
      setShowInvoice(true);
    } catch (err) {
      console.error("Invoice open error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/login";
      }
    }
  };

  const downloadInvoice = async (orderId) => {
    try {
      const token = getToken();
      const response = await axios.get(`${BASE_URL}/invoices/${orderId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download invoice. Please try again.");
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/login";
      }
    }
  };

  if (loading) {
    return (
      <div className="billing-page">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="billing-page">
      <div className="page-header">
        <h1>Billing & Invoices</h1>
        <p>View and download customer invoices</p>
      </div>

      <div className="table-section">
        <div className="section-header">
          <div className="section-title">
            <h2>📄 All Invoices</h2>
            <span className="item-count">{invoices.length} invoices</span>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>View</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.invoice_id}>
                  <td>
                    <span className="id-badge">{invoice.id}</span>
                  </td>
                  <td>
                    <span className="order-id">#ORD-{invoice.order_id}</span>
                  </td>
                  <td>
                    <div className="customer-cell">
                      <span className="customer-avatar">{invoice.customer.charAt(0)}</span>
                      <div>
                        <div className="customer-name">{invoice.customer}</div>
                        <div className="customer-email">{invoice.email}</div>
                      </div>
                    </div>
                   </td>
                  <td>{invoice.date}</td>
                  <td className="invoice-amount">₹{invoice.amount.toFixed(2)}</td>
                  <td>
                    <span className={`status-badge ${invoice.status}`}>{invoice.status}</span>
                   </td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => openInvoice(invoice.invoice_id)}>
                      View
                    </button>
                   </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => downloadInvoice(invoice.order_id)}>
                      PDF
                    </button>
                   </td>
                 </tr>
              ))}
            </tbody>
          </table>

          {invoices.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h4>No invoices found</h4>
              <p>Invoices will appear here once orders are placed.</p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Modal – Red Header */}
{/* Invoice Modal */}
{showInvoice && selectedInvoice && (
  <div className="invoice-modal" onClick={() => setShowInvoice(false)}>
    <div className="invoice-card" onClick={(e) => e.stopPropagation()}>
      <div className="invoice-header">
        <h2>Invoice #{selectedInvoice.order_id}</h2>
        <button className="close-btn" onClick={() => setShowInvoice(false)}>
          ✕
        </button>
      </div>

      <div className="invoice-body">
        <div className="invoice-customer">
          <h3>Customer Information</h3>
          <p><strong>Name:</strong> {selectedInvoice.customer_name || "N/A"}</p>
          <p><strong>Email:</strong> {selectedInvoice.customer_email || "N/A"}</p>
          <p><strong>Address:</strong> {selectedInvoice.delivery_address || selectedInvoice.address || "N/A"}</p>
        </div>

        <div className="invoice-items">
          <h3>Order Items</h3>

          {(() => {
            const subtotal = invoiceItems.reduce(
              (sum, item) => sum + parseFloat(item.subtotal || 0),
              0
            );
            const deliveryFee = parseFloat(selectedInvoice.delivery_fee || 0);
            const discount = parseFloat(selectedInvoice.discount || 0);
            const grandTotal = parseFloat(selectedInvoice.total_amount || 0);

            return (
              <>
                <div className="invoice-table-wrapper">
                  <table className="invoice-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Price (₹)</th>
                        <th>Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item, idx) => (
                        <tr key={item.order_item_id}>
                          <td>{idx + 1}</td>
                          <td>{item.product_name}</td>
                          <td>{item.quantity}</td>
                          <td>₹{parseFloat(item.price || 0).toFixed(2)}</td>
                          <td>₹{parseFloat(item.subtotal || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
<div className="invoice-summary">
  <div className="summary-row">
    <span>Subtotal</span>
    <span>₹{subtotal.toFixed(2)}</span>
  </div>

  {deliveryFee > 0 && (
    <div className="summary-row">
      <span>Delivery Fee</span>
      <span>₹{deliveryFee.toFixed(2)}</span>
    </div>
  )}

  {discount > 0 && (
    <div className="summary-row discount">
      <span>Discount</span>
      <span>-₹{discount.toFixed(2)}</span>
    </div>
  )}

  <div className="summary-row total">
    <span>Grand Total</span>
    <span>₹{parseFloat(selectedInvoice.total_amount || 0).toFixed(2)}</span>
  </div>
</div>
              </>
            );
          })()}
        </div>
      </div>

      <div className="invoice-footer">
        <p><span>Order Date</span><span>{selectedInvoice.formattedOrderDate || "N/A"}</span></p>
        <p><span>Payment</span><span>{selectedInvoice.payment_mode || "N/A"}</span></p>
        <p><span>Status</span><span>{selectedInvoice.order_status || "N/A"}</span></p>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default Billing;