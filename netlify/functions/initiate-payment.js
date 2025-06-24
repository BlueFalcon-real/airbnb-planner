const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function getAuthToken(env) {
    const consumerKey = env.DARAJA_CONSUMER_KEY;
    const consumerSecret = env.DARAJA_CONSUMER_SECRET;
    if (!consumerKey || !consumerSecret) throw new Error("Daraja API credentials are not set in environment variables.");
    const auth = 'Basic ' + Buffer.from(consumerKey + ':' + consumerSecret).toString('base64');
    const response = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', { headers: { 'Authorization': auth } });
    const data = await response.json();
    if (!response.ok) throw new Error("Failed to get auth token from Daraja API.");
    return data.access_token;
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }
    try {
        const { amount, phone } = JSON.parse(event.body);
        const token = await getAuthToken(process.env);
        const shortcode = process.env.DARAJA_SHORTCODE;
        const passkey = process.env.DARAJA_PASSKEY;
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
        const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');
        const stkBody = {
            BusinessShortCode: shortcode, Password: password, Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline', Amount: amount, PartyA: phone, PartyB: shortcode,
            PhoneNumber: phone,
            CallBackURL: "https://mellifluous-crisp-1ed2a9.netlify.app/api/daraja-callback", // Must be a valid HTTPS URL
            AccountReference: "BlueFalconPlan", TransactionDesc: "Payment for Airbnb Plan"
        };
        const darajaResponse = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(stkBody)
        });
        const data = await darajaResponse.json();
        if (!darajaResponse.ok) throw new Error(data.errorMessage || 'STK Push initiation failed.');
        return { statusCode: 200, body: JSON.stringify({ message: "STK push initiated successfully.", ...data }) };
    } catch (error) {
        console.error('Handler Error:', error);
        return { statusCode: 500, body: JSON.stringify({ message: error.message || "An internal server error occurred." }) };
    }
};