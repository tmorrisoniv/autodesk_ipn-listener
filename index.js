const express = require('express');
const axios = require('axios');
const app = express();

// Parse form-encoded payloads sent by Autodesk IPN
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Health check endpoint for Render
app.get('/', (req, res) => {
  res.status(200).send('IPN Listener is live');
});

// Autodesk IPN Endpoint
app.post('/api/ipn', async (req, res) => {
  // 1. Immediately acknowledge Autodesk with 200 OK
  res.status(200).send('OK');

  try {
    const payload = req.body;
    console.log('Received IPN Payload:', payload);

    // 2. Extract customer details from Autodesk payload
    const buyerEmail = payload.payer_email || payload.buyer_adsk_account;
    const firstName = payload.first_name || 'Valued User';
    const appId = payload.appId || 'UNKNOWN_APP';

    if (!buyerEmail) {
      console.warn('IPN received without a valid email address.');
      return;
    }

    // 3. Forward contact data to Brevo API
    await axios.post(
      'https://api.brevo.com/v3/contacts',
      {
        email: buyerEmail,
        attributes: {
          FIRSTNAME: firstName,
          SOURCE: 'Autodesk App Store',
          APP_ID: appId
        },
        listIds: [5], // Replace with your Brevo Contact List ID
        updateEnabled: true
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`Successfully synced ${buyerEmail} to Brevo.`);
  } catch (error) {
    console.error('Error sending data to Brevo:', error.response?.data || error.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`IPN Server running on port ${PORT}`);
});