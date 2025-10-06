import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get('prompt') as string;
    const model = (formData.get('model') as string) || 'sora-2';
    const size = formData.get('size') as string;
    const seconds = formData.get('seconds') as string;
    const apiKey = formData.get('apiKey') as string;
    const inputReference = formData.get('input_reference') as File | null;

    // APIキーの取得（フォームデータまたは環境変数）
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey: key });

    const params: any = {
      prompt,
      model,
    };

    if (size) {
      params.size = size;
    }
    if (seconds) {
      params.seconds = seconds; // 文字列のまま送信
    }
    if (inputReference) {
      params.input_reference = inputReference;
    }

    const response = await client.videos.create(params);

    return NextResponse.json({ videoId: response.id });
  } catch (error: any) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate video' },
      { status: 500 }
    );
  }
}
