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
    // playerRankも受け取るように変更
    const { scores, adviceLevel, playerRank } = JSON.parse(event.body);

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
            levelDescription = `ストリートファイター6のプロフェッショナルな視点から、${playerRank}ランクのプレイヤーが次に目指すべき、より高度で深い読み合いの戦略や練習法について、端的に、かつ具体的で実践的なアドバイスを、`;
            break;
        case 'gamer':
            // ゲーマー向け: スト6のランクマッチや対戦会で役立つ実践的なアドバイス
            levelDescription = `ストリートファイター6のゲーマー向けに、${playerRank}ランクのプレイヤーがランクマッチや対戦会で即座に役立つ実践的なアドバイスや、具体的なコンボ練習の例も交えながら、端的に、かつ具体的で実践的なアドバイスを、`;
            break;
        case 'enjoy':
            // エンジョイ: スト6を楽しくプレイするための、気軽で分かりやすいアドバイス
            levelDescription = `ストリートファイター6を楽しくプレイするための、${playerRank}ランクのプレイヤーがゲームを継続するモチベーション維持につながるヒントや、気軽に試せる練習法も交えながら、端的に、かつ具体的で実践的なアドバイスを、`;
            break;
        case 'kid':
            // 子供向け: スト6のキャラクターや動きに例えながら、分かりやすく優しいアドバイス
            levelDescription = `ストリートファイター6のキャラクターや動きに例えながら、${playerRank}ランクのお友達にも分かりやすく、優しく、短く、端的に、かつ具体的で実践的なアドバイスを、`;
            break;
        default:
            // デフォルト: ゲーマー向けに近い実践的なアドバイス
            levelDescription = `ストリートファイター6の読み合いにおいて、${playerRank}ランクのプレイヤー向けに、実践的なアドバイスや具体的な練習の例も交えながら、端的に、かつ具体的で実践的なアドバイスを、`;
    }

    // スコアの詳細な説明をプロンプトに組み込む
    // ここで各点数が意味する具体的なプレイヤーのレベル感をAIに伝える
    const scoreDetails = {
        patternRecognition: `パターン認識力：${scores.patternRecognition}点（これはストリートファイター6において、${getPatternRecognitionDescription(scores.patternRecognition)}レベルに相当します）`,
        prediction: `予測力：${scores.prediction}点（これはストリートファイター6において、${getPredictionDescription(scores.prediction)}レベルに相当します）`,
        reactionSpeed: `反応速度：${scores.reactionSpeed}点（これはストリートファイター6において、${getReactionSpeedDescription(scores.reactionSpeed)}レベルに相当します）`,
        multiLayerReading: `多重読み：${scores.multiLayerReading}点（これはストリートファイター6において、${getMultiLayerReadingDescription(scores.multiLayerReading)}レベルに相当します）`,
        diversityOfOptions: `選択肢多様性：${scores.diversityOfOptions}点（これはストリートファイター6において、${getDiversityOfOptionsDescription(scores.diversityOfOptions)}レベルに相当します）`,
        mentalResilience: `メンタル耐性：${scores.mentalResilience}点（これはストリートファイター6において、${getMentalResilienceDescription(scores.mentalResilience)}レベルに相当します）`,
    };

    // プロンプトにランク情報とスコアの意味を追加
    const prompt = `ストリートファイター6において、あなたの現在のランクは「${playerRank}」です。
以下の読み合いスキル診断結果に基づいてアドバイスを生成してください。
${scoreDetails.patternRecognition}
${scoreDetails.prediction}
${scoreDetails.reactionSpeed}
${scoreDetails.multiLayerReading}
${scoreDetails.diversityOfOptions}
${scoreDetails.mentalResilience}
これらの10点満点での結果と、あなたの「${playerRank}」という現在のランクを総合的に考慮し、${levelDescription}強み・伸ばすと良い能力や練習アドバイスを教えてください。具体的なストリートファイター6の用語（例：ドライブインパクト、パリィ、OD技、SA、セットプレイ、起き攻め、フレーム、有利不利、確反、モダン、クラシック）や、キャラクター固有の行動（例：リュウの昇竜拳、春麗の百裂脚）も積極的に交えてください。`;


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

// --- 各スキル軸の段階別定義をAIに伝えるヘルパー関数 ---
// これらの関数は、AIがスコアの「意味」を理解するのに役立ちます。
// 必要に応じて、さらに詳細な説明を追加できます。

function getPatternRecognitionDescription(score) {
    if (score <= 2) return "相手の基本的な行動パターン（飛び、突進技の多用など）を認識するのが難しい初心者レベル";
    if (score <= 5) return "相手の主要な行動パターンや癖（例：特定の連携の終わり方、ゲージの使い方）に気づくことがある中級者レベル";
    if (score <= 8) return "相手の複雑なセットプレイや心理的な癖、リソース管理まで深く認識できる上級者レベル";
    return "相手の微細な行動パターン、意識配分、キャラ固有のフレーム消費の癖まで素早く認識し、完璧な対応ができるプロ級レベル";
}

function getPredictionDescription(score) {
    if (score <= 2) return "相手の行動を予測する意識が低く、常に後手になっている初心者レベル";
    if (score <= 5) return "読みを試みるが、成功率はまだ安定しない中級者レベル";
    if (score <= 8) return "相手の主要な行動（飛び、置き技、投げ）を先読みし、有利な反撃や差し返しを成功させられる上級者レベル";
    return "相手の行動パターンと心理を深く読み解き、複数択の中から最適な先読み行動を高い精度で実行できるプロ級レベル";
}

function getReactionSpeedDescription(score) {
    if (score <= 2) return "相手の確定反撃や対空攻撃をほとんど防げない初心者レベル";
    if (score <= 5) return "見てからの対応が半分程度はできるが、安定しない中級者レベル";
    if (score <= 8) return "特定の技や行動（インパクト、ラッシュ、ジャンプ攻撃）を見てからの対応を高い精度で成功させられる上級者レベル";
    return "どんな状況でも相手の行動を見てから最速で最適な反撃や防御行動を安定して実行できるプロ級レベル";
}

function getMultiLayerReadingDescription(score) {
    if (score <= 2) return "自分の行動が相手に読まれていることに気づきにくく、同じパターンを繰り返してしまう初心者レベル";
    if (score <= 5) return "相手が何をしようとしているかを意識し始めるが、その裏をかく行動はまだ難しい中級者レベル";
    if (score <= 8) return "相手の読みを意識し、その裏をかく行動（シミー、遅らせ投げ、無敵技ガード）を狙って成功させられる上級者レベル";
    return "相手の心理を深く読み解き、複数回の読み合いを連続で制する高度な心理戦を展開できるプロ級レベル";
}

function getDiversityOfOptionsDescription(score) {
    if (score <= 2) return "使える技や戦術が少なく、同じ攻めや守りを繰り返してしまう初心者レベル";
    if (score <= 5) return "ある程度の選択肢は持っているが、状況に合わせた最適な選択ができない中級者レベル";
    if (score <= 8) return "状況に応じて豊富な選択肢（牽制、崩し、防御、リソース運用）を使い分け、相手の対策を困難にさせられる上級者レベル";
    return "自分のキャラの全アセットを最大限に活用し、どんな状況でも最適な選択肢を柔軟に選び、ゲームを支配できるプロ級レベル";
}

function getMentalResilienceDescription(score) {
    if (score <= 2) return "予想外のダメージや連続ヒットでパニックになり、冷静な判断ができない初心者レベル";
    if (score <= 5) return "不利な状況でも立て直そうとするが、まだ感情に左右されやすい中級者レベル";
    if (score <= 8) return "どんなに不利な状況やミスが続いても、感情的にならず、冷静に状況を判断し、最善の行動を選択できる上級者レベル";
    return "プレッシャーのかかる場面や、相手が格上でも常に冷静沈着で、ミスを即座に分析し次のラウンドに活かせるプロ級レベル";
}

