import { GoogleGenAI } from "@google/genai";
import { Trip, TripStatus } from "../types";

export const generateTripReport = async (trips: Trip[], query: string): Promise<string> => {
  // Ensure API Key is available
  if (!process.env.API_KEY) {
    return "AI Service Unavailable: Missing API Key.";
  }

  // Initialize the client with the API key directly from the environment variable as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare context data
  const tripSummary = trips.map(t => ({
    id: t.id.substring(0, 4),
    driver: t.driverId,
    customer: t.customerName,
    status: t.status,
    amount: t.paymentAmount || 0,
    date: new Date(t.scheduledTime).toLocaleDateString(),
    paymentMethod: t.paymentMethod
  }));

  const prompt = `
    You are a logistics fleet manager assistant. 
    Here is the current trip data in JSON format:
    ${JSON.stringify(tripSummary)}

    User Query: ${query}

    Provide a concise, professional summary or answer based on the data provided. 
    If asking for a report, summarize completed trips, total revenue, and any pending issues.
    Do not use markdown formatting like **bold** excessively, keep it readable as plain text or simple list.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to generate report. Please try again.";
  }
};