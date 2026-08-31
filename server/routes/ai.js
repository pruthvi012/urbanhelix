const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/ask', async (req, res) => {
    try {
        const { question, context } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ success: false, message: 'Gemini API key not configured.' });
        }

        // We use gemini-1.5-flash for fast responses
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
You are UrbanBot, a helpful AI assistant for the UrbanHeliX municipal governance portal.
You speak to citizens directly to give them information about their city, wards, and ongoing projects.
Keep your answers concise, friendly, and factual based ONLY on the provided context.
If the citizen asks something unrelated to the city/projects, politely redirect them.

CURRENT CITY DATA CONTEXT:
Wards Overview: ${JSON.stringify(context.wards)}
Active Projects: ${JSON.stringify(context.projects.map(p => ({ title: p.title, status: p.status, ward: p.location?.ward })))}

CITIZEN'S QUESTION: "${question}"
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        res.json({ success: true, answer: responseText });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ success: false, message: "AI is currently unavailable. Please try again later." });
    }
});

module.exports = router;
