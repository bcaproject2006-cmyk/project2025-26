import React from 'react';
import './AboutUs.css';

const AboutUs = () => {
  return (
    <div className="about-page">
      <div className="container">
        <h1>About FreshBasket</h1>
        <p className="intro">
          Your trusted partner for fresh, quality groceries delivered to your doorstep.
        </p>

        <section className="mission-section">
          <h2>Our Mission</h2>
          <p>
            At FreshBasket, we believe that everyone deserves access to fresh, healthy food without leaving home. 
            Our mission is to make grocery shopping effortless, affordable, and reliable – connecting you with the best local produce and essentials.
          </p>
        </section>

        <section className="story-section">
          <h2>Our Story</h2>
          <p>
            Founded in 2024, FreshBasket started as a small family initiative to bring farm‑fresh vegetables to our neighbourhood in Surat. 
            What began as a weekend service quickly grew into a full‑fledged online grocery platform, thanks to the trust and support of our community.
          </p>
          <p>
            Today, we serve hundreds of customers daily, offering a wide range of products – from organic fruits and vegetables to pantry staples, dairy, and more. 
            We partner directly with local farmers and trusted brands to ensure quality at every step.
          </p>
        </section>

        <section className="values-section">
          <h2>Our Values</h2>
          <ul>
            <li><strong>Quality First:</strong> We never compromise on freshness. Every item is handpicked and inspected.</li>
            <li><strong>Customer Centric:</strong> Your satisfaction is our priority – we’re here to help, 24/7.</li>
            <li><strong>Sustainability:</strong> We minimise packaging waste and support eco‑friendly practices.</li>
            <li><strong>Community:</strong> We’re proud to be part of your neighbourhood and give back whenever we can.</li>
          </ul>
        </section>

        <section className="team-section">
          <h2>Meet the Team</h2>
          <div className="team-grid">
            <div className="team-member">
              <div className="member-avatar">👩‍💼</div>
              <h3>Archi Mistry</h3>
              <p className="member-role">Founder & CEO</p>
              <p className="member-bio">Archi has over a decade of experience in retail and supply chain. She’s passionate about bringing fresh food to every home.</p>
            </div>
            <div className="team-member">
              <div className="member-avatar">👩‍💼</div>
              <h3>Krishna Kadam</h3>
              <p className="member-role">Head of Operations</p>
              <p className="member-bio">Krishna ensures that your orders reach you on time, every time. She leads our delivery and warehouse teams.</p>
            </div>
            <div className="team-member">
              <div className="member-avatar">👩‍🍳</div>
              <h3>Swati Mishra</h3>
              <p className="member-role">Quality Assurance</p>
              <p className="member-bio">Swati personally samples and inspects products to guarantee freshness and taste.</p>
            </div>
            <div className="team-member">
              <div className="member-avatar">👩‍💻</div>
              <h3>Foram Panchal</h3>
              <p className="member-role">Customer Support Lead</p>
              <p className="member-bio">Foram and her team are always ready to assist you with any questions or concerns.</p>
            </div>
          </div>
        </section>

        <section className="contact-note">
          <h2>Get in Touch</h2>
          <p>
            Have questions or want to partner with us? Reach out at <a href="mailto:supportfreshbasket@gmail.com">supportfreshbasket@gmail.com</a> or visit our <a href="/help">Help Centre</a>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;