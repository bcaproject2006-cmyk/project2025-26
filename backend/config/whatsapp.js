// config/whatsapp.js
const twilio = require('twilio');
const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.provider = process.env.WHATSAPP_PROVIDER || 'twilio';
    
    if (this.provider === 'twilio') {
      // Validate credentials
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.error('❌ Twilio credentials missing. Check .env file.');
      }
      
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      // The sandbox number MUST include 'whatsapp:' prefix
      const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;
      if (!twilioNumber) {
        console.error('❌ TWILIO_WHATSAPP_NUMBER missing in .env');
      }
      
      // Ensure proper format: whatsapp:+14155238886
      this.fromNumber = twilioNumber;
      console.log(`✅ Twilio WhatsApp configured with From: ${this.fromNumber}`);
    }
  }

  /**
   * Format phone number to international format (E.164)
   * Input: "9876543210" -> "whatsapp:+919876543210"
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // Add India country code (+91) if missing
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    } else if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
      // Already has 91 prefix
    } else {
      console.warn(`⚠️ Unusual phone number format: ${phone} -> ${cleaned}`);
    }
    
    return `whatsapp:+${cleaned}`;
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(to, message) {
    const formattedTo = this.formatPhoneNumber(to);
    
    if (!formattedTo) {
      throw new Error('Invalid phone number');
    }

    console.log(`📱 Sending WhatsApp to: ${formattedTo}`);
    console.log(`📱 Message: ${message.substring(0, 50)}...`);

    if (this.provider === 'twilio') {
      return this.sendViaTwilio(formattedTo, message);
    } else if (this.provider === 'meta') {
      return this.sendViaMeta(formattedTo, message);
    } else {
      throw new Error(`Unknown WhatsApp provider: ${this.provider}`);
    }
  }

  /**
   * Send via Twilio
   */
  async sendViaTwilio(to, message) {
    try {
      const response = await this.client.messages.create({
        from: this.fromNumber,
        to: to,
        body: message
      });
      
      console.log(`✅ WhatsApp sent via Twilio: ${response.sid}`);
      console.log(`   Status: ${response.status}`);
      return { success: true, sid: response.sid, status: response.status };
    } catch (error) {
      // Detailed error logging
      console.error('❌ Twilio WhatsApp error:');
      console.error(`   Code: ${error.code}`);
      console.error(`   Message: ${error.message}`);
      console.error(`   More info: ${error.moreInfo || 'N/A'}`);
      
      // Provide helpful hints
      if (error.code === 21211) {
        console.error('💡 HINT: The "To" number is invalid or not whitelisted in Twilio Sandbox.');
        console.error('   For testing, the destination number must send a join code to your Twilio sandbox number.');
      } else if (error.code === 21610) {
        console.error('💡 HINT: The destination number has not opted in to receive messages.');
      } else if (error.code === 63007) {
        console.error('💡 HINT: Twilio sandbox number is not configured correctly.');
      }
      
      throw error;
    }
  }

  /**
   * Send via Meta Cloud API
   */
  async sendViaMeta(to, message) {
    try {
      const url = `https://graph.facebook.com/v18.0/${process.env.META_PHONE_NUMBER_ID}/messages`;
      
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: to.replace('whatsapp:', ''), // Meta expects just the number
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ WhatsApp sent via Meta: ${response.data.messages[0].id}`);
      return { success: true, id: response.data.messages[0].id };
    } catch (error) {
      console.error('❌ Meta WhatsApp error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send offer notification to a customer
   */
  async sendOfferNotification(customer, offer) {
    const message = this.formatOfferMessage(customer.name, offer);
    return this.sendMessage(customer.phone_no, message);
  }

  /**
   * Format offer message
   */
  formatOfferMessage(customerName, offer) {
    const expiry = offer.valid_until 
      ? new Date(offer.valid_until).toLocaleDateString('en-IN')
      : 'Limited time';
    
    const discountText = offer.offer_type === 'percentage' 
      ? `${offer.discount_value}% OFF` 
      : `₹${offer.discount_value} OFF`;
    
    const minOrderText = offer.min_purchase > 0 
      ? `\nMin. order: ₹${offer.min_purchase}` 
      : '';
    
    return `🎉 *Special Offer for ${customerName || 'You'}!*\n\n` +
           `*${offer.offer_name}*\n` +
           `${discountText}${minOrderText}\n\n` +
           `📅 Valid until: ${expiry}\n` +
           `🛒 Use code: *${offer.offer_code}*\n\n` +
           `_Order now on FreshBasket!_`;
  }

  /**
   * Broadcast offer to multiple customers
   */
  async broadcastOffer(offer, customers) {
    const results = [];
    let successCount = 0;
    
    for (const customer of customers) {
      try {
        if (customer.whatsapp_opt_in && customer.phone_no) {
          const result = await this.sendOfferNotification(customer, offer);
          results.push({ 
            customer_id: customer.customer_id, 
            success: true, 
            ...result 
          });
          successCount++;
          
          // Add delay to avoid rate limiting
          await this.sleep(500);
        }
      } catch (error) {
        results.push({ 
          customer_id: customer.customer_id, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    console.log(`📊 Broadcast complete: ${successCount}/${customers.length} successful`);
    return results;
  }

  async sendMediaMessage(to, message, mediaUrl) {
  const formattedTo = this.formatPhoneNumber(to);

  try {
    const response = await this.client.messages.create({
      from: this.fromNumber,
      to: formattedTo,
      body: message,
      mediaUrl: [mediaUrl]
    });

    console.log("✅ WhatsApp PDF sent:", response.sid);
    return response;
  } catch (error) {
    console.error("❌ WhatsApp media error:", error.message);
    throw error;
  }
}
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new WhatsAppService();