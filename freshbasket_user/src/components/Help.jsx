import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import './Help.css';

const Help = () => {
  const location = useLocation();
  const [faqs, setFaqs] = useState([]);
  const [faqsLoading, setFaqsLoading] = useState(true);
  const [faqsError, setFaqsError] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  // Contact form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(null);
  const [formError, setFormError] = useState(null);

  // Scroll to section based on URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('section');
    if (section === 'faq') {
      document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'contact') {
      document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location]);

  // Fetch FAQs from API
  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        setFaqsLoading(true);
        const response = await axios.get('http://localhost:8000/api/faqs');
        setFaqs(response.data);
        setFaqsError(null);
      } catch (error) {
        console.error('Error fetching FAQs:', error);
        setFaqsError('Failed to load FAQs. Please try again later.');
        // Fallback FAQs in case API fails
        setFaqs([
          { 
            question: 'How do I place an order?', 
            answer: 'Simply browse our products, add items to your cart, and proceed to checkout. You can pay online or via cash on delivery.' 
          },
          { 
            question: 'What are your delivery hours?', 
            answer: 'We deliver from 8 AM to 10 PM every day. You can choose a convenient time slot during checkout.' 
          },
          { 
            question: 'Can I modify or cancel my order?', 
            answer: 'Yes, you can modify or cancel your order within 30 minutes of placing it by visiting your orders page or contacting support.' 
          },
          { 
            question: 'Do you offer refunds?', 
            answer: 'If you receive damaged or incorrect items, we offer a full refund or replacement. Contact our support team within 24 hours.' 
          }
        ]);
      } finally {
        setFaqsLoading(false);
      }
    };

    fetchFAQs();
  }, []);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormSuccess(null);
    setFormError(null);

    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setFormError('All fields are required.');
      setFormLoading(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setFormError('Please enter a valid email address.');
      setFormLoading(false);
      return;
    }

    try {
      // Send POST request to your backend endpoint
      const response = await axios.post('http://localhost:8000/api/contact-messages', formData);
      if (response.status === 200 || response.status === 201) {
        setFormSuccess('Thank you for contacting us! We will get back to you soon.');
        setFormData({ name: '', email: '', message: '' }); // Reset form
      } else {
        setFormError('Something went wrong. Please try again later.');
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setFormError(
        error.response?.data?.message || 'Failed to send message. Please try again later.'
      );
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="help-page">
      <div className="help-hero">
        <h1>How can we help you?</h1>
        <p>Find answers to common questions below or reach out to us directly.</p>
      </div>

      <div className="help-container">
        {/* FAQ Section */}
        <section id="faq-section" className="faq-section" aria-labelledby="faq-heading">
          <h2 id="faq-heading">Frequently Asked Questions</h2>
          {faqsLoading ? (
            <div className="faq-loading">Loading FAQs...</div>
          ) : faqsError ? (
            <div className="faq-error">{faqsError}</div>
          ) : (
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <div key={index} className={`faq-item ${openFaq === index ? 'open' : ''}`}>
                  <button
                    className="faq-question"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={openFaq === index}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <span>{faq.question}</span>
                    <span className="faq-icon" aria-hidden="true">
                      {openFaq === index ? '−' : '+'}
                    </span>
                  </button>
                  <div
                    id={`faq-answer-${index}`}
                    className="faq-answer"
                    aria-hidden={openFaq !== index}
                  >
                    <p>{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contact Form Section */}
        <section id="contact-section" className="contact-section" aria-labelledby="contact-heading">
          <h2 id="contact-heading">Still have questions? Contact us</h2>
          <div className="contact-form-container">
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Your full name"
                  disabled={formLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@example.com"
                  disabled={formLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="How can we help you?"
                  rows="5"
                  disabled={formLoading}
                  required
                ></textarea>
              </div>

              {formError && <div className="form-error">{formError}</div>}
              {formSuccess && <div className="form-success">{formSuccess}</div>}

              <button type="submit" className="submit-btn" disabled={formLoading}>
                {formLoading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Help;