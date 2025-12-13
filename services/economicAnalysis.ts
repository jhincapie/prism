
import { GoogleGenAI, Type } from "@google/genai";
import type { EconomicAnalysis } from '../types';

let ai: GoogleGenAI | null = null;

/**
 * Lazily initializes and returns the GoogleGenAI client.
 * Throws an error if the API key is not available in the environment.
 */
const getAiClient = (): GoogleGenAI => {
    if (ai) {
        return ai;
    }

    if (typeof process === 'undefined' || !process.env || !process.env.API_KEY) {
        throw new Error("API key is not configured. Please ensure the API_KEY environment variable is set.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai;
};

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        currencyInfo: {
            type: Type.OBJECT,
            properties: {
                code: { type: Type.STRING, description: 'The 3-letter ISO 4217 currency code for the country (e.g., "USD", "EUR", "COP").' },
                rate: { type: Type.NUMBER, description: 'The approximate exchange rate, representing how many units of the local currency equal 1 USD.' }
            },
            required: ['code', 'rate'],
        },
        netWorthPercentile: {
            type: Type.OBJECT,
            properties: {
                percentile: { type: Type.NUMBER, description: 'The estimated net worth percentile for an individual household in the target year and country.' },
                explanation: { type: Type.STRING, description: 'A brief explanation of the percentile ranking, citing data sources if possible.' }
            },
            required: ['percentile', 'explanation'],
        },
        summary: {
            type: Type.STRING,
            description: 'A brief summary (2-3 sentences) of the financial standing this portfolio represents.'
        }
    },
    required: ['currencyInfo', 'netWorthPercentile', 'summary'],
};

export const getEconomicAnalysis = async (
    finalMedianValue: number,
    years: number,
    country: string
): Promise<Pick<EconomicAnalysis, 'netWorthPercentile' | 'summary' | 'currencyInfo'>> => {
    const prompt = `
        Analyze the financial significance of a portfolio with a final median value of $${finalMedianValue.toLocaleString()} USD after ${years} years from today (target year: ${new Date().getFullYear() + years}).
        Provide the analysis in the context of the projected ${country} economy for that future year.

        Your task:
        1. Determine the 3-letter ISO 4217 currency code for ${country} and its approximate current exchange rate to 1 USD.
        2. Estimate the ${country} net worth percentile ranking for a single household with this portfolio value in that future year. 
        
        CRITICAL REASONING REQUIRED:
        - You must calculate the future value of the money by accounting for average inflation rates for ${country} over ${years} years.
        - Compare this adjusted purchasing power against projected wealth distribution data for ${country}.
        
        3. Provide a concise, 2-3 sentence summary of the financial standing this portfolio represents.

        Return the data strictly in the specified JSON format.
    `;

    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema,
                // Enable thinking to allow the model to calculate inflation impacts and lookup economic data mentally
                // This 'thinkingBudget' allows the model to reason before outputting the final JSON.
                thinkingConfig: { thinkingBudget: 1024 }, 
            },
        });

        const jsonString = response.text.trim();
        const analysisResult = JSON.parse(jsonString);

        if (
            typeof analysisResult.netWorthPercentile?.percentile !== 'number' ||
            typeof analysisResult.summary !== 'string' ||
            typeof analysisResult.currencyInfo?.code !== 'string' ||
            typeof analysisResult.currencyInfo?.rate !== 'number'
        ) {
            throw new Error("Invalid data structure received from API.");
        }

        return analysisResult;

    } catch (error) {
        console.error("Error fetching economic analysis:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to get AI analysis. ${error.message}`);
        }
        throw new Error("An unknown error occurred while fetching AI analysis.");
    }
};
