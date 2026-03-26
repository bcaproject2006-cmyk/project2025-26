import React from 'react';
import './ReturnPolicy.css';

const ReturnPolicy = () => {
  return (
    <div className="policy-page">
      <div className="container">
        <br></br>
        <h1>Return Policy</h1>
        <p className="last-updated">Last updated: March 2026</p>
        
        <section>
          <h2>30-Minute Return Window</h2>
          <p>
            At FreshBasket, we take pride in the quality of our products. If for any reason you are not satisfied with your purchase, you have <strong>30 minutes from the time of delivery</strong> to request a return or replacement.
          </p>
        </section>

        <section>
          <h2>Eligibility for Returns</h2>
          <p>To be eligible for a return, the item must be:</p>
          <ul>
            <li>In its original condition (unused, unopened packaging).</li>
            <li>Accompanied by the original receipt or proof of purchase.</li>
            <li>Reported within 30 minutes of delivery.</li>
          </ul>
          <p>
            Perishable items (fresh fruits, vegetables, dairy) are eligible for return only if they are damaged or spoiled upon arrival.
          </p>
        </section>

        <section>
          <h2>How to Initiate a Return</h2>
          <p>
            To start a return, please contact our customer support team through the <a href="/help?section=contact">Contact Us</a> page or call us at <strong>+91 84694 16768</strong> within 30 minutes of delivery. Provide your order number and details of the issue.
          </p>
        </section>

        <section>
          <h2>Refunds</h2>
          <p>
            Once your return is inspected and approved, we will process a refund to your original payment method within 5-7 business days. For cash on delivery orders, we will issue a store credit or process a bank transfer (details required).
          </p>
        </section>

        <section>
          <h2>Non-Returnable Items</h2>
          <p>The following items cannot be returned:</p>
          <ul>
            <li>Gift cards</li>
            <li>Personal care items (if seal is broken)</li>
            <li>Items purchased during flash sales (final sale)</li>
          </ul>
        </section>

        <section>
          <h2>Contact Us</h2>
          <p>
            If you have any questions about our return policy, please <a href="/help?section=contact">contact us</a>.
          </p>
          <br></br>
        </section>
      </div>
    </div>
  );
};

export default ReturnPolicy;