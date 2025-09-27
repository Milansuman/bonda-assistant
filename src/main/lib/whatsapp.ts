import express from 'express';
import { twiml } from 'twilio';
import { processMessage } from './ai/bonda';
import { exec } from 'child_process';
import { promisify } from 'util';

const { MessagingResponse } = twiml;
const execAsync = promisify(exec);

const app = express();

// Function to check if message contains next/previous variations
function isNavigationCommand(message: string): { isNavigation: boolean; command?: 'next' | 'previous' } {
  const lowerMessage = message.toLowerCase().trim();
  
  // Check for "next" variations
  const nextPatterns = ['next', 'nxt', 'forward', 'ahead', 'continue', 'proceed'];
  if (nextPatterns.some(pattern => lowerMessage.includes(pattern))) {
    return { isNavigation: true, command: 'next' };
  }
  
  // Check for "previous" variations
  const previousPatterns = ['previous', 'prev', 'back', 'backward', 'before', 'earlier'];
  if (previousPatterns.some(pattern => lowerMessage.includes(pattern))) {
    return { isNavigation: true, command: 'previous' };
  }
  
  return { isNavigation: false };
}

// Function to execute navigation command
async function executeNavigationCommand(command: 'next' | 'previous'): Promise<string> {
  try {
    let xdotoolCommand: string;
    
    if (command === 'next') {
      xdotoolCommand = 'xdotool key Right';
    } else {
      xdotoolCommand = 'xdotool key Left';
    }
    
    await execAsync(xdotoolCommand);
    return `✅ Executed ${command} command`;
  } catch (error) {
    console.error(`Error executing ${command} command:`, error);
    return `❌ Failed to execute ${command} command`;
  }
}

// Middleware to parse URL-encoded bodies (Twilio sends data this way)
app.use(express.urlencoded({ extended: false }));

// WhatsApp webhook endpoint
app.post('/whatsapp', async (req, res) => {
  try {
    const incomingMessage = req.body.Body;
    const fromNumber = req.body.From;
    
    console.log(`Received WhatsApp message from ${fromNumber}: ${incomingMessage}`);
    
    // Check if this is a navigation command
    const navigationCheck = isNavigationCommand(incomingMessage);
    
    let response: string;
    
    if (navigationCheck.isNavigation && navigationCheck.command) {
      // Handle navigation command directly
      response = await executeNavigationCommand(navigationCheck.command);
    } else {
      // Use the phone number as conversation ID to maintain context per user
      const conversationId = fromNumber.replace('whatsapp:', '');
      
      // Process the message through Bonda AI
      response = await processMessage(incomingMessage, conversationId);
    }
    
    // Create Twilio response
    const twiml = new MessagingResponse();
    twiml.message(response);
    
    console.log(`Sending response to ${fromNumber}: ${response}`);
    
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