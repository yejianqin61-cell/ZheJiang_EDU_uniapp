import { Injectable } from '@nestjs/common';

@Injectable()
export class SplitterService {
  async split(rawText: string): Promise<string[]> {
    // TODO: Call LLM with prompt template (see AI_Architecture.md §2.3)
    // Return array of question text segments
    return [];
  }
}
