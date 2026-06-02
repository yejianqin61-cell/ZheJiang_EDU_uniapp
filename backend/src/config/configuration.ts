export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  },

  wx: {
    appId: process.env.WX_APP_ID ?? '',
    appSecret: process.env.WX_APP_SECRET ?? '',
    mchId: process.env.WX_MCH_ID ?? '',
    apiV3Key: process.env.WX_API_V3_KEY ?? '',
  },

  llm: {
    primary: {
      model: process.env.QWEN3_MODEL ?? 'qwen-plus-latest',
      apiUrl: process.env.QWEN3_API_URL ?? '',
      apiKey: process.env.QWEN3_API_KEY ?? '',
    },
    fallback: {
      model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
      apiUrl: process.env.DEEPSEEK_API_URL ?? '',
      apiKey: process.env.DEEPSEEK_API_KEY ?? '',
    },
    embedding: {
      model: process.env.EMBEDDING_MODEL ?? 'text-embedding-v4',
      apiUrl: process.env.EMBEDDING_API_URL ?? '',
      apiKey: process.env.EMBEDDING_API_KEY ?? '',
      dimension: 1536,
    },
    timeout: 30000,
    retryMax: 2,
    circuitBreakerThreshold: 5,
    circuitBreakerWindow: 120000,
  },

  ocr: {
    apiUrl: process.env.PADDLEOCR_URL ?? 'http://localhost:8866',
    timeout: 60000,
  },

  cos: {
    secretId: process.env.COS_SECRET_ID ?? '',
    secretKey: process.env.COS_SECRET_KEY ?? '',
    bucket: process.env.COS_BUCKET ?? '',
    region: process.env.COS_REGION ?? 'ap-guangzhou',
  },

  export: {
    pythonServiceUrl: process.env.EXPORT_SERVICE_URL ?? 'http://localhost:5000',
    timeout: 15000,
    downloadUrlTtl: 86400, // 24h
  },

  paper: {
    price: parseInt(process.env.PAPER_PRICE ?? '500', 10), // cents
    regenerateDailyLimit: 3,
    generateTimeout: 30000,
  },

  knowledge: {
    mergeSimilarityThreshold: 0.92,
    embeddingDimension: 1536,
    vectorSearchProbes: 10,
    ivfflatLists: 100,
  },
});
