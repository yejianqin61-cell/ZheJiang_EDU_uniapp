import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmbeddingService {
  private readonly dimension: number;
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.dimension = config.get<number>('llm.embedding.dimension', 1536);
    this.apiUrl = config.get<string>('llm.embedding.apiUrl', '');
    this.apiKey = config.get<string>('llm.embedding.apiKey', '');
    this.model = config.get<string>('llm.embedding.model', 'text-embedding-v4');
  }

  async embed(text: string): Promise<number[]> {
    if (this.apiUrl && this.apiKey) {
      return this.remoteEmbed(text);
    }
    return this.fallbackEmbed(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }

  // Cosine similarity between two vectors
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async remoteEmbed(text: string): Promise<number[]> {
    console.log(`[Embedding] Calling ${this.model}...`);
    try {
      const res = await axios.post(
        this.apiUrl,
        { input: text, model: this.model, dimensions: this.dimension },
        { headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 },
      );
      const embedding = res.data.data?.[0]?.embedding ?? [];
      console.log(`[Embedding] Got ${embedding.length}-dim vector`);
      return embedding;
    } catch (err: any) {
      const status = err.response?.status;
      const body = err.response?.data ?? err.message;
      console.error(`[Embedding] FAILED — HTTP ${status ?? 'N/A'}:`, JSON.stringify(body).slice(0, 500));
      throw err;
    }
  }

  // Dev fallback: deterministic pseudo-embedding based on character hashes.
  // Not semantically meaningful, but enables end-to-end dev testing.
  private fallbackEmbed(text: string): number[] {
    const vec = new Array(this.dimension);
    // Seed a simple hash from text
    let h = 0;
    for (let i = 0; i < text.length; i++) {
      h = ((h << 5) - h + text.charCodeAt(i)) | 0;
    }
    // Generate deterministic pseudo-random vector
    for (let i = 0; i < this.dimension; i++) {
      // Simple xorshift-like generator seeded from text hash
      const x = Math.sin(h + i * 0.1) * 10000;
      vec[i] = x - Math.floor(x);
    }
    // Normalize
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < this.dimension; i++) vec[i] /= norm;
    }
    return vec;
  }
}
