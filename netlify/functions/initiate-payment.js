const axios = require('axios');

exports.handler = async function(event) {
    // The OPTIONS check is no longer needed here because netlify.toml handles it.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    try {
        // --- 1. Get Daraja Auth Token ---
        const consumerKey = process.env.DARAJA_CONSUMER_KEY;
        const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
        const auth = 'Basic ' + Buffer.from(consumerKey + ':' + consumerSecret).toString('base64');
        const tokenResponse = await axios({
            method: 'get',
            url: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            headers: { 'Authorization': auth }
        });
        const token = tokenResponse.data.access_token;
        
        // --- 2. Prepare and Initiate the STK Push ---
        const { amount, phone } = JSON.parse(event.body);
        const shortcode = process.env.DARAJA_SHORTCODE;
        const passkey = process.env.DARAJA_PASSKEY;
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
        const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');
        const stkBody = {
            BusinessShortCode: shortcode, Password: password, Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline', Amount: amount, PartyA: phone, PartyB: shortcode,
            PhoneNumber: phone,
            CallBackURL: "https://mellifluous-crisp-1ed2a9.netlify.app/.netlify/functions/callback", // Required placeholder
            AccountReference: "BlueFalconPlan", TransactionDesc: "Payment for Plan"
        };
        const darajaResponse = await axios({
            method: 'post',
            url: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            data: stkBody
        });

        // --- 3. Return Success Response ---
        return { statusCode: 200, body: JSON.stringify(darajaResponse.data) };

    } catch (error) {
        console.error('Handler Error:', error.response ? error.response.data : error.message);
        return {
            statusCode: error.response ? error.response.status : 500,
            body: JSON.stringify({ message: error.response ? error.response.data.errorMessage : "An internal server error occurred." })
        };
    }
};