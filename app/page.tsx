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

  // モデルに応じた利用可能なサイズ
  const availableSizes = model === 'sora-2-pro'
    ? ['1792x1024', '1024x1792', '1280x720', '720x1280']
    : ['1280x720', '720x1280'];

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

  const pollStatus = async (videoId: string, key: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async (): Promise<void> => {

      if (attempts >= maxAttempts) {
        setError('タイムアウトしました');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/status?videoId=${videoId}&apiKey=${encodeURIComponent(key)}`
        );
        const status: VideoStatus = await res.json();
        setVideoStatus(status);

        if (status.status === 'completed') {
          setLoading(false);
        } else if (status.status === 'failed') {
          setError(status.error?.message || '動画生成に失敗しました');
          setLoading(false);
        } else {
          attempts++;
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

      if (apiKey) {
        formData.append('apiKey', apiKey);
      }

      if (imageFile) {
        formData.append('input_reference', imageFile);
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '動画生成に失敗しました');
      }

      const { videoId: newVideoId } = await res.json();
      setVideoId(newVideoId);
      await pollStatus(newVideoId, apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="環境変数がない場合はここに入力"
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
                      onClick={async () => {
                        const key = apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
                        const res = await fetch(`/api/download?videoId=${videoId}&apiKey=${encodeURIComponent(key)}&variant=mp4`);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${videoId}.mp4`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      📹 動画をダウンロード
                    </button>
                    <button
                      onClick={async () => {
                        const key = apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
                        const res = await fetch(`/api/download?videoId=${videoId}&apiKey=${encodeURIComponent(key)}&variant=thumbnail`);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${videoId}_thumbnail.webp`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      🖼️ サムネイルをダウンロード
                    </button>
                    <button
                      onClick={async () => {
                        const key = apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
                        const res = await fetch(`/api/download?videoId=${videoId}&apiKey=${encodeURIComponent(key)}&variant=spritesheet`);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${videoId}_spritesheet.jpg`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
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
