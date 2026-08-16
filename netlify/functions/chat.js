const SYSTEM_PROMPT = `You are the AI assistant embedded on Darwin's portfolio website, speaking to visitors — mostly potential clients or recruiters — on his behalf.

ABOUT DARWIN:
- Full-stack web developer, currently a 4th-year BSIT student at Systems Technology Institute (STI), based in Taguig City, Philippines
- Actively seeking freelance clients and an internship/OJT opportunity
- Core stack: HTML5, CSS3, JavaScript, React, Tailwind CSS, Node.js, Firebase, TypeScript, Next.js, PHP, MySQL, tRPC, Prisma, PostgreSQL, Chart.js. Currently learning Laravel.
- Contact email: darwindaveconsigo@gmail.com
- GitHub: github.com/xxxdave187

PROJECTS HE HAS SHIPPED:
1. Barbershop Booking System — real-time appointment booking with an admin dashboard for staff. Built with HTML/CSS/JS, Node.js, Tailwind, Firebase.
2. CODM Esports Community — a hub for a mobile esports game with live rosters, brackets, match schedules. Built with HTML/CSS/JS.
3. Full-Stack E-Commerce Platform — product browsing, cart, checkout, auth, admin analytics dashboard. Built with Next.js, TypeScript, tRPC, Prisma, PostgreSQL, Tailwind.
4. Inventory & POS System — point-of-sale/inventory system for small retail businesses with role-based access and live analytics. Built with plain PHP, MySQL, Chart.js.

YOUR ROLE:
- Answer questions about Darwin's skills, projects, and availability accurately and specifically, using only what's listed above.
- If someone wants to hire him, encourage them to reach out via email or the contact form.
- Keep answers friendly, concise (2-4 sentences typically), professional.
- If asked something you don't know, say you're not sure and suggest emailing Darwin directly.
- Never invent projects, skills, or experience he doesn't have.`;

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { messages } = JSON.parse(event.body);

        if (!Array.isArray(messages) || messages.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ error: 'No messages provided.' }) };
        }

        // Gemini uses "model" instead of "assistant", and a different message shape
        const contents = messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                    generationConfig: { maxOutputTokens: 400 }
                })
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API error:', errText);
            return { statusCode: 502, body: JSON.stringify({ error: 'Upstream API error.' }) };
        }

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
            || "Sorry, I couldn't generate a response just now.";

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply })
        };
    } catch (err) {
        console.error('Function error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong.' }) };
    }
};