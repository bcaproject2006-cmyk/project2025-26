import { useState, useEffect } from "react";
import axios from "axios";
import "./Billing.css";

const Billing = () => {
  const BASE_URL = "http://localhost:8000/api";

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [showInvoice, setShowInvoice] = useState(false);

  // Helper to get token from either storage
  const getToken = () => {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const res = await axios.get(`${BASE_URL}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const formatted = res.data.map(inv => {
        const dateObj = new Date(inv.invoice_date);
        return {
          id: `INV-${inv.invoice_id}`,
          invoice_id: inv.invoice_id,
          order_id: inv.order_id,
          customer: inv.customer_name || "Unknown",
          email: inv.customer_email || "",
          amount: parseFloat(inv.total_amount || 0),
          status: inv.order_status || "pending",
          date: dateObj.toLocaleDateString("en-IN")
        };
      });

      setInvoices(formatted);
    } catch (err) {
      console.error("Invoice fetch error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const openInvoice = async (invoiceId) => {
    try {
      const token = getToken();

      const invoiceData = invoices.find(inv => inv.invoice_id === invoiceId);
      if (!invoiceData) {
        console.error("Invoice not found in list");
        return;
      }

      const orderRes = await axios.get(`${BASE_URL}/orders/${invoiceData.order_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const itemsRes = await axios.get(`${BASE_URL}/orders/${invoiceData.order_id}/items`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const orderDate = new Date(orderRes.data.order_date);
      const formattedOrderDate = {
        date: orderDate.toLocaleDateString("en-IN")
      };

      setSelectedInvoice({
        ...orderRes.data,
        customer_name: invoiceData.customer,
        customer_email: invoiceData.email,
        formattedOrderDate
      });
      setInvoiceItems(itemsRes.data);
      setShowInvoice(true);
    } catch (err) {
      console.error("Invoice open error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
      }
    }
  };

  const downloadInvoice = async (orderId) => {
    try {
      const token = getToken();
      const response = await axios.get(`${BASE_URL}/invoices/${orderId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${orderId}.pdf`);
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
        window.location.href = '/login';
      }
    }
  };

  if (loading) {
    return (
      <div className="billing-page">
        <p>Loading invoices...</p>
      </div>
    );
  }

  return (
    <div className="billing-page">
      <div className="page-header">
        <h1>Billing & Invoices</h1>
      </div>

      <div className="table-section">
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
                <td><span className="id-badge">{invoice.id}</span></td>
                <td><span className="order-id">#ORD-{invoice.order_id}</span></td>
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
                <td>₹{invoice.amount.toFixed(2)}</td>
                <td><span className={`status-badge ${invoice.status}`}>{invoice.status}</span></td>
                <td>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => openInvoice(invoice.invoice_id)}
                  >
                    View
                  </button>
                </td>
                <td>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => downloadInvoice(invoice.order_id)}
                  >
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInvoice && selectedInvoice && (
        <div className="invoice-modal">
          <div className="invoice-card">
            <div className="invoice-header">
              <h2>Invoice - #{selectedInvoice.order_id}</h2>
              <button className="close-btn" onClick={() => setShowInvoice(false)}>✕</button>
            </div>

            <div className="invoice-customer">
              <h3>Customer Information</h3>
              <p><b>Name:</b> {selectedInvoice.customer_name || "N/A"}</p>
              <p><b>Email:</b> {selectedInvoice.customer_email || "N/A"}</p>
              <p><b>Address:</b> {selectedInvoice.delivery_address || selectedInvoice.address || "N/A"}</p>
            </div>

            <div className="invoice-items">
              <h3>Order Items</h3>
              {(() => {
                // Calculate subtotal once
                const subtotal = invoiceItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
                const deliveryFee = parseFloat(selectedInvoice.delivery_fee) || 0;
                const discount = parseFloat(selectedInvoice.discount) || 0;

                return (
                  <table className="invoice-table">
                    <thead>
                      <tr>
                        <th>Sr. No.</th>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Price (₹)</th>
                        <th>Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item, index) => (
                        <tr key={item.order_item_id}>
                          <td>{index + 1}</td>
                          <td>{item.product_name}</td>
                          <td>{item.quantity}</td>
                          <td>{parseFloat(item.price).toFixed(2)}</td>
                          <td>{parseFloat(item.subtotal).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      {/* Subtotal */}
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold' }}>Subtotal:</td>
                        <td style={{ fontWeight: 'bold' }}>₹{subtotal.toFixed(2)}</td>
                      </tr>
                      {/* Delivery Fee (if > 0) */}
                      {deliveryFee > 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'right' }}>Delivery Fee:</td>
                          <td>₹{deliveryFee.toFixed(2)}</td>
                        </tr>
                      )}
                      {/* Discount (if > 0) */}
                      {discount > 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'right', color: '#10b981' }}>Discount:</td>
                          <td style={{ color: '#10b981' }}>-₹{discount.toFixed(2)}</td>
                        </tr>
                      )}
                      {/* Grand Total */}
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1em' }}>Grand Total:</td>
                        <td style={{ fontWeight: 'bold', fontSize: '1.1em', color: '#1a73e8' }}>
                          ₹{parseFloat(selectedInvoice.total_amount).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                );
              })()}
            </div>

            <div className="invoice-footer">
              <p><b>Order Date:</b> {selectedInvoice.formattedOrderDate?.date || "N/A"}</p>
              <p><b>Payment:</b> {selectedInvoice.payment_mode}</p>
              <p><b>Status:</b> {selectedInvoice.order_status}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;