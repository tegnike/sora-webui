import OpenAI from 'openai';
import type { VideoGenerationRequest } from '@/types/sora';

export function createSoraClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.openai.com/v1',
  });
}

export async function generateVideo(
  client: OpenAI,
  params: VideoGenerationRequest
) {
  const requestBody: any = {
    prompt: params.prompt,
    model: params.model || 'sora-2',
  };

  if (params.size) {
    requestBody.size = params.size;
  }

  if (params.seconds) {
    requestBody.seconds = params.seconds;
  }

  if (params.input_reference) {
    requestBody.input_reference = params.input_reference;
  }

  const response = await client.post('/videos', {
    body: requestBody,
  });

  return response;
}

export async function getVideoStatus(client: OpenAI, videoId: string) {
  const response = await client.get(`/videos/${videoId}`);
  return response;
}

export async function getVideoContent(client: OpenAI, videoId: string) {
  const response = await client.get(`/videos/${videoId}/content`);
  return response;
}
