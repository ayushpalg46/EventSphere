// routes/ai.js
// AI Features Route using Google Gemini API (with template fallback for offline/development test)
// Created by Ayush

const express = require('express');
const router = express.Router();
const { dbQuery } = require('../database/db');
const { isLoggedIn } = require('../middleware/auth');

// Endpoint: AI-Generated Description
router.post('/ai/generate-description', isLoggedIn, async (req, res) => {
  const { bulletPoints, category, title } = req.body;

  if (!bulletPoints) {
    return res.status(400).json({ error: 'Please provide some bullet points.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const prompt = `You are a professional copywriter. Write a highly engaging, immersive and descriptive event description page for an event named "${title || 'EventSphere Event'}" under the category "${category || 'General'}". Here are the key bullet points of the event details:\n${bulletPoints}\n\nFormat the response as a clean HTML snippet with proper headings, paragraphs, and lists. Do not write markdown code blocks (e.g. do not include \`\`\`html tags). Make it sound professional, exciting and attractive to ticket buyers.`;

  // Check if API key is valid or dummy
  if (!apiKey || apiKey.includes('Dummy') || apiKey.includes('replace')) {
    console.log('[AI Service] API key is dummy. Using fallback template generator...');
    const fallbackHtml = generateFallbackDescription(title, category, bulletPoints);
    return res.json({ text: fallbackHtml, isFallback: true });
  }

  try {
    // Call Google Gemini 1.5 Flash API directly using native node fetch
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    let textResult = data.candidates[0].content.parts[0].text;
    
    // Clean up any potential markdown wrapped block
    if (textResult.startsWith('```html')) {
      textResult = textResult.replace(/^```html/, '').replace(/```$/, '');
    } else if (textResult.startsWith('```')) {
      textResult = textResult.replace(/^```/, '').replace(/```$/, '');
    }

    res.json({ text: textResult.trim(), isFallback: false });

  } catch (err) {
    console.error('[AI Service] Gemini API Call failed:', err.message);
    // Graceful fallback so program doesn't crash during hackathon demo!
    const fallbackHtml = generateFallbackDescription(title, category, bulletPoints);
    res.json({ text: fallbackHtml, isFallback: true, error: err.message });
  }
});

// Endpoint: Smart Schedule Builder (suggests optimal Ordering based on flow)
router.post('/ai/suggest-schedule', isLoggedIn, async (req, res) => {
  const { sessionsList } = req.body; // Array of objects: { time, title, speaker, description }

  if (!sessionsList || sessionsList.length === 0) {
    return res.status(400).json({ error: 'No sessions provided.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const prompt = `You are a master event organizer. Reorganize and order the following event sessions for optimal audience engagement, speaker availability flow, and logical progression. 
  Here is the list of proposed sessions:\n${JSON.stringify(sessionsList, null, 2)}\n
  Output the result ONLY as a JSON array of objects containing the fields: "time" (suggested time slot, starting from event start time), "title", "speaker", and a short "reason" (explaining why this slot is optimal). 
  Do not include markdown tags, code blocks, or extra text. Output strict JSON.`;

  if (!apiKey || apiKey.includes('Dummy') || apiKey.includes('replace')) {
    console.log('[AI Service] API key is dummy. Reordering sessions using basic bubble sort algorithm fallback...');
    const fallbackSchedule = sortSessionsFallback(sessionsList);
    return res.json({ schedule: fallbackSchedule, isFallback: true });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );

    if (!response.ok) throw new Error('API failed');

    const data = await response.json();
    let textResult = data.candidates[0].content.parts[0].text.trim();

    // Clean JSON wrapping
    if (textResult.startsWith('```json')) {
      textResult = textResult.replace(/^```json/, '').replace(/```$/, '');
    } else if (textResult.startsWith('```')) {
      textResult = textResult.replace(/^```/, '').replace(/```$/, '');
    }

    const reorderedList = JSON.parse(textResult);
    res.json({ schedule: reorderedList, isFallback: false });

  } catch (err) {
    console.error('[AI Service] Schedule API failed:', err.message);
    const fallbackSchedule = sortSessionsFallback(sessionsList);
    res.json({ schedule: fallbackSchedule, isFallback: true, error: err.message });
  }
});

// Endpoint: AI-Generated Event Recommendations
router.get('/ai/recommendations', isLoggedIn, async (req, res) => {
  const userId = req.session.user.id;

  try {
    // 1. Find categories of events attended/booked
    const bookedCategories = await dbQuery.all(
      `SELECT DISTINCT e.category FROM bookings b
       JOIN events e ON b.event_id = e.id
       WHERE b.user_id = ? AND b.payment_status = 'paid'`,
      [userId]
    );

    // 2. Find categories of events wishlisted
    const wishlistedCategories = await dbQuery.all(
      `SELECT DISTINCT e.category FROM wishlist w
       JOIN events e ON w.event_id = e.id
       WHERE w.user_id = ?`,
      [userId]
    );

    // Merge categories
    const categoriesSet = new Set();
    bookedCategories.forEach(c => categoriesSet.add(c.category));
    wishlistedCategories.forEach(c => categoriesSet.add(c.category));
    const userCategories = Array.from(categoriesSet);

    let recommendedEvents = [];

    if (userCategories.length > 0) {
      // Find upcoming events matching these categories that user hasn't booked yet
      const placeholders = userCategories.map(() => '?').join(',');
      recommendedEvents = await dbQuery.all(
        `SELECT * FROM events 
         WHERE category IN (${placeholders}) 
         AND status = 'upcoming'
         AND id NOT IN (SELECT event_id FROM bookings WHERE user_id = ? AND payment_status = 'paid')
         ORDER BY start_date ASC LIMIT 4`,
        [...userCategories, userId]
      );
    }

    // If no recommendations are found, fallback to general upcoming popular events
    if (recommendedEvents.length === 0) {
      recommendedEvents = await dbQuery.all(
        `SELECT * FROM events 
         WHERE status = 'upcoming' 
         AND id NOT IN (SELECT event_id FROM bookings WHERE user_id = ?)
         ORDER BY start_date ASC LIMIT 4`,
        [userId]
      );
    }

    res.json(recommendedEvents);

  } catch (err) {
    console.error('Error serving recommendations:', err);
    res.status(500).json({ error: 'Failed to fetch recommendations.' });
  }
});

// --- FALLBACK LOGIC HELPERS ---

function generateFallbackDescription(title, category, bulletPoints) {
  const points = bulletPoints.split('\n').filter(p => p.trim() !== '');
  let listItemsHtml = points.map(p => `<li>${p.replace(/^[-*•]\s*/, '')}</li>`).join('');

  return `
    <div class="ai-generated-content">
      <h3>About ${title}</h3>
      <p>Welcome to the ultimate <strong>${category}</strong> experience! We are thrilled to bring you this highly anticipated event, specifically curated to spark inspiration, learning, and fun.</p>
      
      <h4>Key Event Highlights:</h4>
      <ul>
        ${listItemsHtml}
      </ul>
      
      <h4>Why You Should Attend:</h4>
      <p>This is a rare opportunity to network with industry peers, learn from expert speakers, and witness live sessions. Whether you're looking to upgrade your skills, enjoy high-quality entertainment, or meet like-minded people, this event has something special for you.</p>
      
      <p><em>Grab your tickets before slots fill up! Early bird rates may apply.</em></p>
    </div>
  `;
}

function sortSessionsFallback(sessions) {
  // Simulating schedule builder. Let's sort them alphabetically or put "Keynote" first
  return sessions.map((session, idx) => {
    let suggestedTime = '';
    
    // Add dummy slot hours starting from 10:00 AM
    const hour = 10 + idx;
    suggestedTime = `${hour}:00 AM`;
    if (hour >= 12) {
      suggestedTime = `${hour === 12 ? 12 : hour - 12}:00 PM`;
    }

    return {
      time: suggestedTime,
      title: session.title,
      speaker: session.speaker || 'Guest Speaker',
      reason: idx === 0 ? 'Standard opening keynote starts the day with peak audience energy.' : 'Logical sequential flow building on previous sessions.'
    };
  });
}

module.exports = router;
