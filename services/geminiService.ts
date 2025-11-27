
import { GoogleGenAI } from "@google/genai";
import { NetworkNode, AISuggestion, SecurityAnalysisResult } from '../types';
import { Edge } from 'reactflow';

// NOTE: In a real production app, this should be proxied through a backend.
// For this demo, we assume the key is in process.env or injected.
const API_KEY = process.env.API_KEY || ''; 

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

export const analyzeNetwork = async (nodes: NetworkNode[], edges: Edge[]): Promise<AISuggestion[]> => {
  if (!ai) return [{ title: 'API Key Missing', description: 'Please configure Google Gemini API Key.', type: 'optimization', priority: 'high' }];

  const topologyDescription = JSON.stringify({
    nodes: nodes.map(n => ({ type: n.data.type, label: n.data.label })),
    edges: edges.map(e => ({ source: e.source, target: e.target }))
  });

  const prompt = `
    Analyze this network topology JSON. 
    Provide 3 concise, professional tips for a network engineer.
    Focus on redundancy, bottlenecks, and industry best practices (Cisco/Juniper).
    Return strictly a JSON array of objects with keys: title, description, type (architecture|security|optimization), priority (low|medium|high).
    Do not include markdown code blocks.
    Topology: ${topologyDescription}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text || '[]';
    // Clean potential markdown blocks if the model ignores instruction
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Analysis Failed", error);
    return [{ title: 'Analysis Failed', description: 'Could not contact AI service.', type: 'optimization', priority: 'low' }];
  }
};

export const analyzeSecurity = async (nodes: NetworkNode[], edges: Edge[]): Promise<SecurityAnalysisResult> => {
  if (!ai) return { score: 0, vulnerableNodeIds: [], attackVector: 'N/A', description: 'API Key Missing', recommendations: [] };

  const topologyDescription = JSON.stringify({
    nodes: nodes.map(n => ({ id: n.id, type: n.data.type, label: n.data.label, ip: n.data.ip })),
    edges: edges.map(e => ({ source: e.source, target: e.target }))
  });

  const prompt = `
    Act as a Red Team Security Expert. Analyze this network topology.
    Identify a potential attack path or vulnerability (e.g., exposed switch, single point of failure, missing firewall).
    Return a JSON object with keys: score (0-100), vulnerableNodeIds (array of strings matching input ids), attackVector (short string), description (detailed scenario), recommendations (array of strings).
    Do not include markdown code blocks.
    Topology: ${topologyDescription}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text || '{}';
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Security Scan Failed", error);
    return { score: 0, vulnerableNodeIds: [], attackVector: 'Error', description: 'Scan failed.', recommendations: [] };
  }
};

export const getAIAssistantResponse = async (query: string, context: string): Promise<string> => {
    if (!ai) return "I need an API key to help you.";
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
              You are a witty, slightly cynical, but highly knowledgeable Senior Network Architect named "PacketSniffer". 
              You are teaching a junior engineer (the user).
              
              Context of current topology: ${context}
              
              User Query: ${query}
              
              Guidelines:
              1. Be short and concise. No textbooks.
              2. Use humor or tech sarcasm where appropriate (e.g., "Sure, if you like routing loops...").
              3. If the user asks about the specific topology provided in context, give specific advice.
              4. If the topology is empty, make a joke about the "zen of nothingness" and tell them to drag a router.
              5. Do NOT just dump definitions. Explain 'why'.
            `
        });
        return response.text || "I'm thinking...";
    } catch (e) {
        return "I'm having trouble connecting to my brain.";
    }
};

export const getCLIFix = async (command: string, error: string): Promise<string> => {
    if (!ai) return "";
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `The user typed the Cisco IOS command "${command}" and got the error "${error}".
            Provide a very short, specific fix or explanation. 1 sentence max. Example: "You need to be in configuration mode first (type 'conf t')."`
        });
        return response.text || "";
    } catch (e) {
        return "";
    }
};
