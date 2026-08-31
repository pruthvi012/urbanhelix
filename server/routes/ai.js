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

        // Smart fallback — reads real data and replies based on it
        const { question = '', context = {} } = req.body || {};
        const projects = context.projects || [];
        const q = question.toLowerCase();

        // Try to find matching projects by ward/location name from question
        const matched = projects.filter(p => {
            const ward = (p.location?.ward || '').toLowerCase();
            const title = (p.title || '').toLowerCase();
            // Check if any word in the question appears in ward or title
            return q.split(/\s+/).some(word => word.length > 3 && (ward.includes(word) || title.includes(word)));
        });

        let answer;
        if (matched.length > 0) {
            const summary = matched.slice(0, 3).map(p => {
                const status = p.status === 'completed' ? '✅ Completed' :
                               p.status === 'in_progress' ? '🔄 In Progress' :
                               p.status === 'delayed' ? '⚠️ Delayed' : `📋 ${p.status}`;
                const budget = p.budget ? `₹${(p.budget / 100000).toFixed(1)}L` : '';
                return `• ${p.title} — ${status}${budget ? ` (${budget})` : ''}`;
            }).join('\n');
            answer = `Here's what's happening:\n\n${summary}${matched.length > 3 ? `\n\n...and ${matched.length - 3} more project(s).` : ''}`;
        } else if (projects.length > 0) {
            answer = `I couldn't find specific projects matching your query. Currently there are ${projects.length} active projects citywide. Try asking about a specific ward like "Koramangala" or "BTM Layout".`;
        } else {
            answer = `No project data available right now. Please check the Projects section for live updates.`;
        }

        res.json({ success: true, answer });
    }
});

module.exports = router;
