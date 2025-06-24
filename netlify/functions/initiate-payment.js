// Located at: netlify/functions/initiate-payment.js

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function getAuthToken(env) {
    // ... (This helper function is unchanged)
}

exports.handler = async function(event) {
    // --- **THE FIX IS HERE** ---
    // Define the headers that give permission to your GitHub Pages site.
    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://bluefalcon-real.github.io',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Netlify functions must handle a "preflight" OPTIONS request first.
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // "No Content"
            headers: corsHeaders
        };
    }
    // --- **END OF FIX** ---

    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers: corsHeaders, 
            body: JSON.stringify({ message: 'Method Not Allowed' }) 
        };
    }

    try {
        // ... (The entire M-Pesa API call logic is unchanged)
        
        // Return a success response WITH the permission headers
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: "STK push initiated successfully.", ...data })
        };

    } catch (error) {
        console.error('Handler Error:', error);
        // Return an error response WITH the permission headers
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: error.message || "An internal server error occurred." })
        };
    }
};