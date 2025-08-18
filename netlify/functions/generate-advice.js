// Netlify Functionのコード
// このファイルはNetlifyのサーバー上で実行され、APIキーを安全に管理します。

// fetch関数はNode.js 18以上で利用可能です。
// Netlify FunctionsはNode.js 18以上のバージョンをサポートしています。

exports.handler = async function(event, context) {
    // POSTリクエストのみを受け付ける
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    // リクエストボディをパース
    const { scores, adviceLevel } = JSON.parse(event.body);

    // Gemini APIキーを環境変数から取得
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // APIキーがない場合はエラーを返す
    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not set in Netlify environment variables.");
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'API key not configured.' }),
        };
    }

    let levelDescription = '';
    switch (adviceLevel) {
        case 'high-level':
            // ハイレベル: スト6のプロシーンや、より深い読み合いに焦点を当てる
            levelDescription = 'ストリートファイター6のプロフェッショナルな視点から、より高度で深い読み合いの戦略や練習法について、端的に、かつ具体的で実践的なアドバイスを、';
            break;
        case 'gamer':
            // ゲーマー向け: スト6のランクマッチや対戦会で役立つ実践的なアドバイス
            levelDescription = 'ストリートファイター6のゲーマー向けに、ランクマッチや対戦会で即座に役立つ実践的なアドバイスや、具体的なコンボ練習の例も交えながら、端的に、かつ具体的で実践的なアドバイスを、';
            break;
        case 'enjoy':
            // エンジョイ: スト6を楽しくプレイするための、気軽で分かりやすいアドバイス
            levelDescription = 'ストリートファイター6を楽しくプレイするための、気軽で分かりやすいアドバイスや、ゲームを継続するモチベーション維持につながるヒントも交えながら、端的に、かつ具体的で実践的なアドバイスを、';
            break;
        case 'kid':
            // 子供向け: スト6のキャラクターや動きに例えながら、分かりやすく優しいアドバイス
            levelDescription = 'ストリートファイター6のキャラクターや動きに例えながら、子供にも分かりやすく、優しく、短く、端的に、かつ具体的で実践的なアドバイスを、';
            break;
        default:
            // デフォルト: ゲーマー向けに近い実践的なアドバイス
            levelDescription = 'ストリートファイター6の読み合いにおいて、実践的なアドバイスや具体的な練習の例も交えながら、端的に、かつ具体的で実践的なアドバイスを、';
    }

    // プロンプトにスト6のコンテキストと簡潔性を追加
    const prompt = `ストリートファイター6の読み合いにおいて、あなたのパターン認識力：${scores.patternRecognition}点、予測力：${scores.prediction}点、反応速度：${scores.reactionSpeed}点、多重読み：${scores.multiLayerReading}点、選択肢多様性：${scores.diversityOfOptions}点、メンタル耐性：${scores.mentalResilience}点、という10点満点での結果です。${levelDescription}それぞれの強み・伸ばすと良い能力や練習アドバイスを教えてください。`;

    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    const payload = { contents: chatHistory };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

    let retryCount = 0;
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second

    while (retryCount < maxRetries) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.status === 429) { // Too Many Requests
                const delay = baseDelay * Math.pow(2, retryCount);
                console.warn(`Rate limit exceeded. Retrying in ${delay / 1000}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                retryCount++;
                continue;
            }

            if (!response.ok) {
                const errorData = await response.text();
                console.error(`Gemini API error status: ${response.status}, data: ${errorData}`);
                throw new Error(`Gemini API error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ advice: text }),
                };
            } else {
                console.error("Unexpected Gemini API response structure:", result);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Failed to get advice from AI (unexpected response).' }),
                };
            }
        } catch (error) {
            console.error("Error calling Gemini API from Netlify Function:", error);
            if (retryCount < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, retryCount);
                console.warn(`Fetch failed. Retrying in ${delay / 1000}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                retryCount++;
            } else {
                return {
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Failed to generate AI advice after multiple retries.' }),
                };
            }
        }
    }
};

