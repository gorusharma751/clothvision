import { GoogleGenAI } from '@google/genai';

export const envVal = (name, fallback = '') => String(process.env[name] ?? fallback).trim();

const isTruthy = (value = '') => /^(1|true|yes|on)$/i.test(String(value || '').trim());

export const isPlaceholderValue = (value = '') => {
  const v = String(value || '').trim();
  if (!v) return true;

  const patterns = [
    /^replace_with_/i,
    /^your[_-]?/i,
    /^paste[_-]?/i,
    /^example/i,
    /^dummy/i,
    /your_key/i,
    /api[_-]?key[_-]?here/i
  ];

  return patterns.some((re) => re.test(v));
};

export const isVertexAiEnabled = () => {
  const provider = envVal('GEMINI_PROVIDER').toLowerCase();
  if (provider === 'vertex' || provider === 'vertexai') return true;
  if (provider === 'studio' || provider === 'aistudio' || provider === 'gemini') return false;
  return isTruthy(envVal('GOOGLE_GENAI_USE_VERTEXAI'));
};

const getApiKey = (vertexMode) => {
  const candidates = vertexMode
    ? [envVal('VERTEX_API_KEY'), envVal('GEMINI_API_KEY'), envVal('GOOGLE_API_KEY')]
    : [envVal('GEMINI_API_KEY'), envVal('GOOGLE_API_KEY')];

  return candidates.find((candidate) => !isPlaceholderValue(candidate)) || '';
};

const toLegacyResponse = (response) => {
  const textValue = typeof response?.text === 'string' ? response.text : '';
  return {
    text: () => textValue || '',
    candidates: Array.isArray(response?.candidates) ? response.candidates : []
  };
};

const wrapModel = (client, modelName) => ({
  generateContent: async (contents) => {
    const response = await client.models.generateContent({
      model: modelName,
      contents
    });

    return { response: toLegacyResponse(response) };
  }
});

export const getTextModelName = () => envVal('GEMINI_TEXT_MODEL', 'gemini-2.5-flash-lite');
export const getImageModelName = () => envVal('GEMINI_IMAGE_MODEL', 'gemini-2.5-flash-image');

export const getClient = () => {
  const vertexMode = isVertexAiEnabled();
  const projectRaw = envVal('GOOGLE_CLOUD_PROJECT');
  const project = isPlaceholderValue(projectRaw) ? '' : projectRaw;
  const locationRaw = envVal('GOOGLE_CLOUD_LOCATION', 'us-central1');
  const location = isPlaceholderValue(locationRaw) ? 'us-central1' : locationRaw;
  const apiKey = getApiKey(vertexMode);
  const hasProject = Boolean(project);
  const hasApiKey = Boolean(apiKey);
  const hasAdc = Boolean(envVal('GOOGLE_APPLICATION_CREDENTIALS'));

  if (vertexMode && !hasApiKey && !hasProject) {
    const err = new Error('Vertex AI is enabled but GOOGLE_CLOUD_PROJECT is missing.');
    err.code = 'GEMINI_VERTEX_CONFIG_MISSING';
    throw err;
  }

  if (!vertexMode && !apiKey) {
    const err = new Error('Missing Gemini API key. Set GEMINI_API_KEY (or GOOGLE_API_KEY) in backend/.env.local.');
    err.code = 'GEMINI_KEY_MISSING';
    throw err;
  }

  if (vertexMode && !hasApiKey && hasProject && !hasAdc) {
    const err = new Error('Vertex AI is enabled but no VERTEX_API_KEY and no GOOGLE_APPLICATION_CREDENTIALS were found.');
    err.code = 'GEMINI_KEY_MISSING';
    throw err;
  }

  const options = { vertexai: vertexMode };

  if (vertexMode) {
    // SDK requires either API key OR project/location in Vertex mode (not both).
    if (hasApiKey) {
      options.apiKey = apiKey;
    } else {
      options.project = project;
      options.location = location;
    }
  } else if (hasApiKey) {
    options.apiKey = apiKey;
  }

  const client = new GoogleGenAI(options);

  return {
    provider: vertexMode ? 'vertex' : 'gemini',
    getGenerativeModel: ({ model }) => wrapModel(client, model)
  };
};