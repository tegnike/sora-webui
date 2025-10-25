'use client';

import { useState, useEffect } from 'react';
import type { VideoStatus } from '@/types/sora';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [model, setModel] = useState<'sora-2' | 'sora-2-pro'>('sora-2');
  const [size, setSize] = useState('1280x720');
  const [seconds, setSeconds] = useState(4);
  const [loading, setLoading] = useState(false);
  const [videoStatus, setVideoStatus] = useState<VideoStatus | null>(null);
  const [videoId, setVideoId] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState('');

  // OpenAI REST endpoint base URL (client-side direct access)
  const VIDEO_API_BASE = 'https://api.openai.com/v1/videos';

  // モデルに応じた利用可能なサイズ
  const availableSizes = model === 'sora-2-pro'
    ? ['1792x1024', '1024x1792', '1280x720', '720x1280']
    : ['1280x720', '720x1280'];

  // 料金計算（秒単位）
  const calculatePrice = () => {
    if (model === 'sora-2') {
      return 0.10;
    } else if (model === 'sora-2-pro') {
      if (size === '1792x1024' || size === '1024x1792') {
        return 0.50;
      } else {
        return 0.30;
      }
    }
    return 0;
  };

  const pricePerSecond = calculatePrice();
  const estimatedCost = (pricePerSecond * seconds).toFixed(2);

  // 経過時間を1秒ごとに更新
  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [loading]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  // 画像を指定サイズにリサイズする関数
  const resizeImage = (file: File, targetSize: string): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const [targetWidth, targetHeight] = targetSize.split('x').map(Number);

        // すでに一致している場合はそのまま返す
        if (img.width === targetWidth && img.height === targetHeight) {
          resolve(file);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // アスペクト比を保ってトリミング
        const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (targetWidth - scaledWidth) / 2;
        const y = (targetHeight - scaledHeight) / 2;

        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/jpeg', 0.95);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  // 画像と解像度の整合性チェックと自動リサイズ
  useEffect(() => {
    if (!imageFile) {
      setError('');
      return;
    }

    const img = new Image();
    img.onload = async () => {
      const [width, height] = size.split('x').map(Number);
      if (img.width !== width || img.height !== height) {
        try {
          const resizedFile = await resizeImage(imageFile, size);
          setImageFile(resizedFile);
          setError('');
        } catch (err) {
          setError('画像のリサイズに失敗しました');
        }
      } else {
        setError('');
      }
    };
    img.src = URL.createObjectURL(imageFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [imageFile, size]);

  const pollStatus = async (videoId: string, key: string) => {
    const poll = async (): Promise<void> => {
      try {
        const res = await fetch(`${VIDEO_API_BASE}/${videoId}`, {
          headers: {
            Authorization: `Bearer ${key}`,
          },
        });
        const data = await res
          .json()
          .catch(() => ({ error: { message: 'ステータス情報の解析に失敗しました' } }));

        if (!res.ok) {
          const message =
            (data as any)?.error?.message ||
            `ステータス取得に失敗しました (${res.status})`;
          throw new Error(message);
        }

        const status = data as VideoStatus;
        setVideoStatus(status);

        if (status.status === 'completed') {
          setLoading(false);
        } else if (status.status === 'failed') {
          setError(status.error?.message || '動画生成に失敗しました');
          setLoading(false);
        } else {
          setTimeout(poll, 3000);
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    await poll();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // エラーがある場合は送信しない
    if (error) {
      return;
    }

    if (!apiKey) {
      setError('APIキーを入力してください');
      return;
    }

    setError('');
    setVideoStatus(null);
    setVideoId('');
    setElapsedSeconds(0);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('model', model);
      formData.append('size', size);
      formData.append('seconds', seconds.toString());

      if (imageFile) {
        formData.append('input_reference', imageFile);
      }

      const res = await fetch(VIDEO_API_BASE, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      const data = await res
        .json()
        .catch(() => ({ error: { message: '動画生成レスポンスの解析に失敗しました' } }));

      if (!res.ok) {
        const message =
          (data as any)?.error?.message ||
          `動画生成に失敗しました (${res.status})`;
        throw new Error(message);
      }

      const newVideoId = (data as any)?.id;
      if (!newVideoId) {
        throw new Error('動画IDを取得できませんでした');
      }

      setVideoId(newVideoId);
      await pollStatus(newVideoId, apiKey);
    } catch (err: any) {
      setError(err.message || '動画生成中にエラーが発生しました');
      setLoading(false);
    }
  };

  const downloadAsset = async (
    variant: 'mp4' | 'thumbnail' | 'spritesheet'
  ) => {
    if (!videoId) {
      return;
    }

    if (!apiKey) {
      setError('ダウンロードにはAPIキーが必要です');
      return;
    }

    try {
      const query = variant === 'mp4' ? '' : `?variant=${variant}`;
      const res = await fetch(`${VIDEO_API_BASE}/${videoId}/content${query}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) {
        throw new Error(`コンテンツの取得に失敗しました (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const extension =
        variant === 'mp4' ? 'mp4' : variant === 'thumbnail' ? 'webp' : 'jpg';
      const filename =
        variant === 'mp4'
          ? `${videoId}.mp4`
          : `${videoId}_${variant}.${extension}`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'コンテンツのダウンロードに失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Sora2 | Video Generator
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                APIキー（オプション）
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="OpenAIのAPIキーを入力してください"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  プロンプト *
                </label>
                <a
                  href="https://cookbook.openai.com/examples/sora/sora2_prompting_guide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  📖 プロンプトガイド
                </a>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="生成したい動画の説明を入力してください"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                参照画像（オプション）
              </label>
              {imageFile ? (
                <div className="space-y-2">
                  <div className="relative inline-block">
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="Preview"
                      className="max-h-40 rounded-lg border border-gray-300"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      ✕ 画像を削除
                    </button>
                  </div>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                モデル
              </label>
              <select
                value={model}
                onChange={(e) => {
                  setModel(e.target.value as 'sora-2' | 'sora-2-pro');
                  // モデル変更時にサイズをリセット
                  setSize('1280x720');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="sora-2">Sora 2（高速）</option>
                <option value="sora-2-pro">Sora 2 Pro（高品質）</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                解像度（横 x 縦）
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {availableSizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                動画の長さ
              </label>
              <select
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value={4}>4秒</option>
                <option value={8}>8秒</option>
                <option value={12}>12秒</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">推定コスト</span>
                  <p className="text-xs text-gray-500 mt-1">
                    ${pricePerSecond}/秒 × {seconds}秒
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-blue-600">${estimatedCost}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="mt-1 text-xs text-red-600">
                このツールはブラウザから直接OpenAI APIへリクエストを送信します。<br />
                利用に伴う費用や結果、生成失敗・ダウンロード不可を含む一切の事象について開発者は責任を負いません。
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !prompt}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '生成中...' : '動画を生成'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {(videoId || videoStatus) && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">生成状況</h2>
            <div className="space-y-4">
              {videoId && (
                <div>
                  <span className="font-medium">動画ID: </span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                    {videoId}
                  </code>
                </div>
              )}

              {loading && (
                <div>
                  <span className="font-medium">経過時間: </span>
                  <span className="text-gray-700">{elapsedSeconds}秒</span>
                  {elapsedSeconds >= 10 && (
                    <p className="text-yellow-700 text-sm mt-2">
                      ⚠️ 混み合っている可能性があります。生成に時間がかかっています...
                    </p>
                  )}
                </div>
              )}

              {videoStatus && (
                <div>
                  <span className="font-medium">ステータス: </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      videoStatus.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : videoStatus.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {videoStatus.status}
                  </span>
                </div>
              )}

              {videoStatus?.status === 'completed' && videoId && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => downloadAsset('mp4')}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      📹 動画をダウンロード
                    </button>
                    <button
                      onClick={() => downloadAsset('thumbnail')}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      🖼️ サムネイルをダウンロード
                    </button>
                    <button
                      onClick={() => downloadAsset('spritesheet')}
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      🎞️ スプライトシートをダウンロード
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
