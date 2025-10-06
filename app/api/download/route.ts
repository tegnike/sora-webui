import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const apiKey = searchParams.get('apiKey');
    const variant = searchParams.get('variant') || 'mp4';

    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId is required' },
        { status: 400 }
      );
    }

    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // コンテンツを取得
    const url = `https://api.openai.com/v1/videos/${videoId}/content${variant !== 'mp4' ? `?variant=${variant}` : ''}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download content');
    }

    const blob = await response.blob();

    // ファイル拡張子とContent-Typeを設定
    let contentType = 'video/mp4';
    let extension = 'mp4';

    if (variant === 'thumbnail') {
      contentType = 'image/webp';
      extension = 'webp';
    } else if (variant === 'spritesheet') {
      contentType = 'image/jpeg';
      extension = 'jpg';
    }

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${videoId}_${variant}.${extension}"`,
      },
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download video' },
      { status: 500 }
    );
  }
}
