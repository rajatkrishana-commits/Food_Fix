import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON parser with boundary limits to support base64 image uploads comfortably
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Initialize the modern Gemini SDK
// AI Studio automatically injects process.env.GEMINI_API_KEY at runtime from user secrets.
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const POLICY_DOCUMENT = `
FoodFix Customer Support Policy

1. Refund Policy
Customers may be eligible for a refund if:
- The order is cancelled by the restaurant.
- The order is not delivered.
- The delivered food is spoiled, unsafe, or not edible.
- A major item is missing from the order.
- The wrong item is delivered.

Refunds are not guaranteed automatically. Final refund approval may require review by the FoodFix support team.

2. Refund Timeline
Once approved, refunds usually take 3 to 7 business days to reflect in the customer's original payment method.
Wallet refunds may reflect faster.

3. Delay Compensation Policy
If an order is delayed, the customer may be eligible for an apology coupon depending on the delay duration and order value.
A delayed order does not always mean automatic refund.
If the customer wants exact live order status, the issue should be escalated to a human agent.

4. Cancellation Policy
Customers can cancel an order before the restaurant starts preparing it.
Once preparation has started, cancellation may not be allowed.
If the order is extremely delayed, FoodFix support may review the case.

5. Coupon Policy
Only one coupon can be applied per order unless clearly mentioned in the offer.
Coupons may fail if the order does not meet minimum order value, restaurant eligibility, location eligibility, or payment method conditions.

6. Missing or Wrong Item Policy
If an item is missing or the wrong item is delivered, the customer should report it through support.
FoodFix may ask for order details or an image.
Refund or replacement depends on verification.

7. Food Quality Policy
If food is spoiled, unsafe, spilled, leaked, or packaging is damaged, the customer should upload a clear image.
FoodFix support will review the complaint.
The customer may be eligible for refund, coupon, or replacement depending on the case.

8. Human Escalation Policy
Escalate to a human agent if:
- The customer asks for a human.
- The issue needs payment verification.
- The issue needs live order tracking.
- The issue is unclear.
- The customer is very angry.
- The AI is not sure about the answer.
`;

// Helper: formats conversation history to string for model prompt injection
function formatHistory(history: { text: string; isBot: boolean }[]): string {
  if (!history || history.length === 0) return 'No previous conversation.';
  return history
    .map((msg) => `${msg.isBot ? 'Bot' : 'Customer'}: ${msg.text}`)
    .join('\n');
}

// POST endpoint: answers client questions using predefined support policy rules
app.post('/api/chat', async (req, res) => {
  try {
    const { query, history = [], image } = req.body;

    if (!apiKey) {
      return res.status(500).json({
        error: 'Missing GEMINI_API_KEY on the server. Please configure it in your Settings > Secrets.',
      });
    }

    const historyText = formatHistory(history);

    // If an image is provided, we use the Food Quality prompt pattern
    if (image) {
      // image is expected to be a data URL e.g. "data:image/jpeg;base64,..."
      const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: 'Malformed image data URL format.' });
      }
      const mimeType = match[1];
      const base64Data = match[2];

      const promptText = `You're a helpful assistant of a food service company called food fix,
 please respond to user's query, be courteous.
 Use the following policy document -
 ${POLICY_DOCUMENT}.
 Check the food quality and if the food quality is bad- food is burnt or there is mould then tell him that refund is being processed and also apologize. If the food is not corrupt, escalate to a human support agent.
 Here is the query - ${query}.
Use the following historical conversation -
${historyText}`;

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      };

      const textPart = {
        text: promptText,
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [imagePart, textPart],
        },
      });

      return res.json({ text: response.text || "I apologize, but I could not analyze the image correctly. Let me connect you with a human support agent." });
    } else {
      // Check if message is related to food quality or ruined food, but NO image is provided.
      // If it is related to food quality policy (spoiled, burnt, mould, hair, inedible, etc.), we ask for an image first.
      const lowercaseQuery = query.toLowerCase();
      const foodQualityKeywords = [
        'spoiled', 'burnt', 'mould', 'mold', 'hair', 'inedible', 'raw', 'bad taste',
        'quality', 'rotten', 'ruined', 'dirty', 'unhygienic', 'leak', 'spilled', 'damaged packaging'
      ];
      
      const containsQualityIssue = foodQualityKeywords.some(keyword => lowercaseQuery.includes(keyword));

      if (containsQualityIssue) {
        return res.json({
          text: "I am really sorry to hear that you experienced a food quality issue! To help me verify this and process a refund or replacement under our policy, could you please upload a clear photo of the food? You can use the paperclip icon in the chat input below to upload it.",
          needsImage: true
        });
      }

      // No image, normal Policy Query
      const promptText = `You're a helpful assistant of a food service company called food fix,
 please respond to user's query, be courteous.
 Use the following policy document -
 ${POLICY_DOCUMENT}.
 If the question is related to policy then only answer it else say that I'm routing to human support agent.
 Here is the query - ${query}.
Use the following historical conversation -
${historyText}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
      });

      return res.json({ text: response.text || "I am routing your request to a human support agent." });
    }
  } catch (err: any) {
    console.error('Gemini error:', err);
    res.status(500).json({ error: err.message || 'An error occurred while generating a response.' });
  }
});

// Configure Vite middleware in development, otherwise serve the compiled bundle
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server satisfies hosting at http://0.0.0.0:${PORT}`);
  });
}

startServer();
