import React from 'react';
import './TermsOfService.css';

const TermsOfService = () => {
  return (
    <div className="policy-page">
      <div className="container">
        <br></br>
        <h1>Terms of Service</h1>
        <p className="last-updated">Last updated: March 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            Welcome to FreshBasket. By accessing or using our website, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
          </p>
        </section>

        <section>
          <h2>2. Account Registration</h2>
          <p>
            To place an order, you may need to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
          </p>
        </section>

        <section>
          <h2>3. Orders and Payments</h2>
          <p>
            All orders are subject to availability and acceptance. We reserve the right to cancel any order for any reason (e.g., pricing errors, stock issues). Payment must be made at the time of order via accepted methods (credit/debit cards, UPI, cash on delivery).
          </p>
        </section>

        <section>
          <h2>4. Delivery</h2>
          <p>
            We strive to deliver within the estimated time frame. However, delays may occur due to unforeseen circumstances. We are not liable for any loss resulting from delayed delivery.
          </p>
        </section>

        <section>
          <h2>5. Returns and Refunds</h2>
          <p>
            Our return policy is outlined separately and incorporated into these terms by reference. Please review it carefully.
          </p>
        </section>

        <section>
          <h2>6. User Conduct</h2>
          <p>
            You agree not to use our site for any unlawful purpose or to violate any laws. You may not attempt to gain unauthorized access to our systems.
          </p>
        </section>

        <section>
          <h2>7. Intellectual Property</h2>
          <p>
            All content on this site (logos, text, images) is the property of FreshBasket and may not be used without written permission.
          </p>
        </section>

        <section>
          <h2>8. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, FreshBasket shall not be liable for any indirect, incidental, or consequential damages arising from your use of our services.
          </p>
        </section>

        <section>
          <h2>9. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the site after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2>10. Contact Us</h2>
          <p>
            For questions about these terms, please <a href="/help?section=contact">contact us</a>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;