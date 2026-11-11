import { Request, Response } from 'express';
import { reviewCode, explainCode, chatAboutCode } from '../services/aiService.js';
import { config } from '../config.js';

export async function handleReview(req: Request, res: Response): Promise<void> {
  try {
    const { code, language, filePath } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Code content is required.' });
      return;
    }

    const review = await reviewCode(code, language || 'javascript', filePath);
    res.json(review);
  } catch (err: any) {
    res.status(500).json({
      error: 'AI code review failed.',
      details: err?.message || 'Unknown error occurred during code analysis.',
    });
  }
}

export async function handleExplain(req: Request, res: Response): Promise<void> {
  try {
    const { code, language, context } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Code content is required.' });
      return;
    }

    const explanation = await explainCode(code, language || 'javascript', context);
    res.json(explanation);
  } catch (err: any) {
    res.status(500).json({
      error: 'AI code explanation failed.',
      details: err?.message || 'Unknown error occurred during code explanation.',
    });
  }
}

export async function handleChat(req: Request, res: Response): Promise<void> {
  try {
    const { question, code, language, history } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Question is required.' });
      return;
    }

    const response = await chatAboutCode(
      question,
      code || '',
      language || 'javascript',
      Array.isArray(history) ? history : []
    );

    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      error: 'AI chat request failed.',
      details: err?.message || 'Unknown error occurred during assistant query.',
    });
  }
}

export async function getAiStatus(req: Request, res: Response): Promise<void> {
  res.json({
    configuredModel: config.ollama.model,
    ollamaBaseUrl: config.ollama.baseUrl,
    hasGeminiFallback: Boolean(config.geminiApiKey),
    timestamp: new Date().toISOString(),
  });
}
