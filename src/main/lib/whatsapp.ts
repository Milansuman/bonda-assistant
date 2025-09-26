import express from 'express';
import { twiml } from 'twilio';
import { processMessage } from './ai/bonda';

const { MessagingResponse } = twiml;

const app = express();

// Middleware to parse URL-encoded bodies (Twilio sends data this way)
app.use(express.urlencoded({ extended: false }));

// WhatsApp webhook endpoint
app.post('/whatsapp', async (req, res) => {
  try {
    const incomingMessage = req.body.Body;
    const fromNumber = req.body.From;
    
    console.log(`Received WhatsApp message from ${fromNumber}: ${incomingMessage}`);
    
    // Use the phone number as conversation ID to maintain context per user
    const conversationId = fromNumber.replace('whatsapp:', '');
    
    // Process the message through Bonda AI
    const aiResponse = await processMessage(incomingMessage, conversationId);
    
    // Create Twilio response
    const twiml = new MessagingResponse();
    twiml.message(aiResponse);
    
    console.log(`Sending AI response to ${fromNumber}: ${aiResponse}`);
    
    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('Error processing WhatsApp message:', error);
    
    // Send error response
    const twiml = new MessagingResponse();
    twiml.message('Sorry, I encountered an error processing your message. Please try again.');
    res.type('text/xml').send(twiml.toString());
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.WHATSAPP_PORT || 3000;

// Export function to start the server
export function startWhatsAppServer(): void {
  app.listen(PORT, () => {
    console.log(`WhatsApp Bonda AI webhook server listening on port ${PORT}`);
  });
}

// Auto-start the server when this module is imported
startWhatsAppServer();