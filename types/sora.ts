export interface VideoGenerationRequest {
  prompt: string;
  input_reference?: {
    type: 'image';
    image: string; // base64 encoded
  };
  model?: 'sora-2' | 'sora-2-pro';
  size?: string;
  seconds?: number;
}

export interface VideoStatus {
  id: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  url?: string;
  error?: {
    type: string;
    message: string;
  };
}

export interface GenerateResponse {
  videoId: string;
}
