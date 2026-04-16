import { GoogleGenAI } from '@google/genai';

export const envVal = (name, fallback = '') => String(process.env[name] ?? fallback).trim();

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

export const isVertexAiEnabled = () => true;

const KNOWN_VERTEX_LOCATIONS = new Set([
  'us-central1',
  'us-east1',
  'us-east4',
  'us-west1',
  'us-west4',
  'northamerica-northeast1',
  'southamerica-east1',
  'europe-west1',
  'europe-west2',
  'europe-west3',
  'europe-west4',
  'europe-west6',
  'europe-west9',
  'asia-east1',
  'asia-east2',
  'asia-northeast1',
  'asia-northeast3',
  'asia-south1',
  'asia-south2',
  'asia-southeast1',
  'australia-southeast1'
]);

const getApiKey = () => {
  const apiKey = envVal('VERTEX_API_KEY');
  return isPlaceholderValue(apiKey) ? '' : apiKey;
};

const toLegacyResponse = (response) => {
  const textValue = typeof response?.text === 'string' ? response.text : '';
  return {
    text: () => textValue || '',
    candidates: Array.isArray(response?.candidates) ? response.candidates : []
  };
};

export const resolveVertexModelPath = (modelName, project, location) => {
  const name = String(modelName || '').trim();
  if (!name) return name;
  if (name.includes('/')) return name;
  if (!project) return name;
  return `projects/${project}/locations/${location}/publishers/google/models/${name}`;
};

const wrapModel = (client, modelName, context = {}) => ({
  generateContent: async (contents) => {
    const resolvedModel = resolveVertexModelPath(modelName, context.project, context.location);
    const response = await client.models.generateContent({
      model: resolvedModel,
      contents
    });

    return { response: toLegacyResponse(response) };
  }
});

export const getTextModelName = () => envVal('GEMINI_TEXT_MODEL', 'gemini-2.5-flash-lite');
export const getImageModelName = () => envVal('GEMINI_IMAGE_MODEL', 'gemini-2.5-flash-image');
export const getVideoModelName = () => envVal('GEMINI_VIDEO_MODEL', 'veo-2.0-generate-001');
export const getVertexLocation = (overrides = {}) => {
  const locationRaw = String(overrides.location ?? envVal('GOOGLE_CLOUD_LOCATION', 'us-central1')).trim().toLowerCase();
  if (!locationRaw || isPlaceholderValue(locationRaw)) return 'us-central1';
  return KNOWN_VERTEX_LOCATIONS.has(locationRaw) ? locationRaw : 'us-central1';
};

export const getClient = (overrides = {}) => {
  const projectRaw = String(overrides.project ?? envVal('GOOGLE_CLOUD_PROJECT')).trim();
  const project = isPlaceholderValue(projectRaw) ? '' : projectRaw;
  const location = getVertexLocation(overrides);
  const apiKey = getApiKey();
  const hasProject = Boolean(project);
  const hasApiKey = Boolean(apiKey);
  const hasAdc = Boolean(envVal('GOOGLE_APPLICATION_CREDENTIALS'));

  if (!hasApiKey && !hasProject) {
    const err = new Error('Vertex AI config missing. Set VERTEX_API_KEY or GOOGLE_CLOUD_PROJECT in backend/.env or Heroku variables.');
    err.code = 'GEMINI_VERTEX_CONFIG_MISSING';
    throw err;
  }

  if (!hasApiKey && hasProject && !hasAdc) {
    const err = new Error('Vertex AI is enabled but no VERTEX_API_KEY and no GOOGLE_APPLICATION_CREDENTIALS were found.');
    err.code = 'GEMINI_KEY_MISSING';
    throw err;
  }

  const options = { vertexai: true };

  // SDK requires either API key OR project/location in Vertex mode (not both).
  if (hasApiKey) {
    options.apiKey = apiKey;
  } else {
    options.project = project;
    options.location = location;
  }

  const client = new GoogleGenAI(options);

  const generateVideos = async (params = {}) => {
    const resolvedModel = resolveVertexModelPath(params?.model, project, location);
    return await client.models.generateVideos({
      ...params,
      model: resolvedModel
    });
  };

  const getVideosOperation = async (operation) => {
    return await client.operations.getVideosOperation({ operation });
  };

  return {
    provider: 'vertex',
    getGenerativeModel: ({ model }) => wrapModel(client, model, { project, location }),
    generateVideos,
    getVideosOperation
  };
};