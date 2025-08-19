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
    const { scores, adviceLevel, playerRank, userFreeText } = JSON.parse(event.body);

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

    // --- ストリートファイター6の知識ベース（AIが参照する情報源） ---
    // ここに、スト6に関する正確で簡潔な情報を記述します。
    // 各スキル軸、ランク帯、アドバイスのタイプ（典型例、課題、練習方法）に分けて細かく記述してください。
    // AIはこの情報からアドバイスを生成することを最優先します。
    const sf6KnowledgeBase = {
        // スキル軸ごとの詳細な知識
        patternRecognition: {
            "Bronze": {
                typicalIssues: "相手の単調な飛び込みや突進技に何度も当たってしまう。相手が同じ行動を繰り返していることに気づかない。",
                challenges: "相手の行動パターンを意識して見ること、特に危険な技の後の行動に注目する練習。",
                practiceMethods: "対戦後にリプレイを見返し、相手がどんな時に飛び、ドライブインパクトを撃ってきたかを確認する。トレーニングモードで特定の技をガードした後の相手の行動パターンを予測する練習。"
            },
            "Silver": {
                typicalIssues: "相手の簡単なセットプレイやゲージ運用（例: OD技からのコンボ）を見逃しやすい。",
                challenges: "相手のドライブゲージ残量やSAゲージ残量も意識して行動選択に役立てる。",
                practiceMethods: "相手のドライブインパクトの癖を見つける練習（溜めが長いか、特定の連携に混ぜるか）。トレーニングモードで起き上がりの防御択を試す中で、相手の攻めパターンを観察する。"
            },
            "Gold": {
                typicalIssues: "相手の中級レベルの読み合い（例：遅らせ投げ、無敵技の重ね）に気づきにくい。",
                challenges: "相手の行動の選択肢とその後の展開を複数予測する力を養う。",
                practiceMethods: "リプレイで相手が同じ状況でどう動いているかをフレーム単位で確認。特に意識したい相手の行動（例：起き攻め後の打撃か投げか）を絞って観察する練習。"
            },
            "Platinum": {
                typicalIssues: "相手の細かい癖や、状況に応じた選択肢の変化に対応しきれない。",
                challenges: "相手の意識配分を読み取り、対応を揺さぶる。",
                practiceMethods: "特定のキャラのフレーム消費やゲージ管理、セットプレイを詳細に研究し、そのキャラ使いがよくやる行動パターンを頭に入れる。"
            },
            "Diamond": {
                typicalIssues: "プロレベルのプレイヤーの思考の深さや、普段使わない選択肢の使い分けに対応が追いつかない。",
                challenges: "相手の行動の「意図」を深掘りし、その行動に至る心理を理解する。",
                practiceMethods: "トッププレイヤーの配信や動画を見て、なぜその行動を選んだのかを考察する。自分より強い相手のリプレイを何度も見て、相手の「読み」のタイミングを分析する。"
            },
            "Master": {
                typicalIssues: "相手の微細な行動の変化や、環境に適応する柔軟なパターン変化に対応する難しさ。",
                challenges: "相手の「最適解」へのアプローチを素早く見抜き、その裏をかくカウンターパターンを構築する。",
                practiceMethods: "様々なキャラ、様々なプレイヤーと対戦し、即座に相手の思考を分析・適応する練習。自分自身の癖をなくし、行動をランダム化する練習も有効。"
            },
        },
        prediction: {
            "Bronze": {
                typicalIssues: "相手の行動を予測する意識が低く、常に後手に回りがち。読み合いに参加できていない。",
                challenges: "まず「相手が何をしたいか」をシンプルに予測する意識を持つ。",
                practiceMethods: "対空を狙う意識を持つ（相手が飛んできたら昇竜拳やSA）。ドライブインパクトを撃ってくる相手には、こちらもドライブインパクトで返す準備をする。"
            },
            "Silver": {
                typicalIssues: "読みが当たっても、次に繋げられずにチャンスを逃すことがある。予測の精度が低い。",
                challenges: "相手の行動予測から、有利な状況を作る、あるいは大ダメージに繋げる。",
                practiceMethods: "トレーニングモードで、相手がジャンプした際の対空コンボを練習。特定の技をガードした後に、相手が投げか打撃か予測して、投げ抜けと小技暴れを使い分ける練習。"
            },
            "Gold": {
                typicalIssues: "主要な読み合いはできるが、相手のフェイントや遅らせ行動に対応しきれない。",
                challenges: "多重読みを意識し、相手の裏をかく選択肢を準備する。",
                practiceMethods: "相手が投げを嫌がる癖があるなら、シミー（投げ間合いに入ってから少し歩き、相手の投げ抜けモーションを見てから打撃を当てる）の練習。相手のインパクトを読んで、パリィやSAで返す練習。"
            },
            "Platinum": {
                typicalIssues: "相手が自分の行動をどう読んでいるかを予測しきれず、読み負けることが多い。",
                challenges: "相手の思考の階層を一段深く読み、その裏をかく行動を仕掛ける。",
                practiceMethods: "リプレイで、自分が読み負けた場面を分析し、相手が何を期待していたか、自分は何ができたかを考える。有利フレーム時に、打撃・投げ・待つ、の3択を意識してトレーニング。"
            },
            "Diamond": {
                typicalIssues: "読みの精度は高いが、ごく稀に発生する特殊な状況や、読み切れない択でペースを崩される。",
                challenges: "予測の精度を極限まで高め、不利状況での最適なリスク管理を習得する。",
                practiceMethods: "相手のドライブゲージ残量を見て、ドライブラッシュの有無を予測し、対応択を用意する。特定のキャラの特殊なセットプレイに対して、最もローリスクな防御方法を練習。"
            },
            "Master": {
                typicalIssues: "高レベルな読み合いの中で、相手の僅かなミスを見逃したり、完璧なカウンターを決めきれない。",
                challenges: "相手の思考を支配し、常に主導権を握る読み合いを展開する。",
                practiceMethods: "相手の起き上がりの選択肢（リバーサル、ガード、バックステップなど）を読んで、最適な攻め（詐欺飛び、重ね、投げ、シミー）を使い分ける練習。相手のSAゲージが溜まったタイミングでの行動を予測し、対策を練る。"
            },
        },
        reactionSpeed: {
            "Bronze": {
                typicalIssues: "見てから対応できるはずのドライブインパクトを返せない。対空が間に合わないことが多い。",
                challenges: "相手の特定の大技や、飛び込みを見てから防御・反撃する練習。",
                practiceMethods: "トレーニングモードでダミーにドライブインパクトを撃たせて、パニッシュカウンターを返す練習。相手のジャンプ攻撃に対して、対空技を出すタイミングを体に覚えさせる練習。"
            },
            "Silver": {
                typicalIssues: "確定反撃を入れられる技を見逃すことがある。相手のラッシュからの攻めにガードが間に合わない。",
                challenges: "自分のキャラの主要な確定反撃（確反）を確実に決める。",
                practiceMethods: "相手キャラの主要技のフレーム表を確認し、自分のキャラのどの技が確反になるか覚える。トレーニングモードでラッシュからの攻めに対して、ガードを固める、投げ抜けを入力する練習。"
            },
            "Gold": {
                typicalIssues: "反応速度は向上したが、最適な対応（例：最大リターンコンボ）に繋げられない。",
                challenges: "見てからの対応と同時に、最大リターンを狙えるコンボを瞬時に入力する。",
                practiceMethods: "相手の飛びを見てから、対空技の後の追撃コンボを確実に決める練習。ドライブインパクト返しの後に、自分が一番ダメージを出せるコンボを練習。"
            },
            "Platinum": {
                typicalIssues: "反応速度は十分だが、状況が複雑になったり、複数択を同時に見なければならない状況でミスが増える。",
                challenges: "多重の情報を処理しながら、高精度な反応を維持する。",
                practiceMethods: "トレモでダミーにランダムで打撃と投げを仕掛けさせ、見てから打撃ガード・投げ抜けを練習。ドライブラッシュからの攻めに対して、ガードとパリィの切り替え練習。"
            },
            "Diamond": {
                typicalIssues: "高精度な反応は可能だが、ごく一部のフレーム有利・不利の状況判断を誤ることがある。",
                challenges: "フレーム単位での有利不利状況を正確に把握し、最適な行動を即座に判断する。",
                practiceMethods: "特定の技をガードした後のフレーム状況を把握し、有利不利に応じた行動を選択する練習。リプレイで自分が不利フレーム時に暴れてしまった場面を見直し、適切な防御行動を検討する。"
            },
            "Master": {
                typicalIssues: "反応速度はプロ級だが、相手の読みに合わせた行動を瞬時に切り替えられず、わずかな隙を突かれる。",
                challenges: "反応速度を活かし、読み合いの優位を決定づける。",
                practiceMethods: "相手の遅らせ重ねや連携の中の隙を見てから、無敵技やOD技で割り込む練習。画面端での起き攻めに対する様々な防御択をトレーニングモードで練習し、最適な反応を身につける。"
            },
        },
        multiLayerReading: {
            "Bronze": {
                typicalIssues: "自分の行動が相手に読まれていることに気づかず、同じ攻撃を繰り返してしまいうまくいかない。",
                challenges: "相手が何を嫌がっているか、何を狙っているかを意識する。",
                practiceMethods: "まずは投げと打撃のシンプルな二択を相手に仕掛けてみて、相手の防御行動（ガードが多いか、投げ抜けが多いか）を観察する。"
            },
            "Silver": {
                typicalIssues: "相手の読みを意識し始めるが、裏をかく行動ができない。相手のフェイントに引っかかりやすい。",
                challenges: "相手がどう動くかだけでなく、相手が自分の何を読んでいるかを予測する。",
                practiceMethods: "相手が投げ抜けを意識しているなら打撃、打撃をガードしているなら投げ、と使い分ける練習。インパクトをガードされた後に、相手がどう動くか見て、次の行動を決める練習。"
            },
            "Gold": {
                typicalIssues: "多重読みを試みるが、最適なタイミングで仕掛けられない。相手に読まれる行動が多い。",
                challenges: "相手の心理を揺さぶるための有効な手段を増やす。",
                practiceMethods: "シミー（投げ間合いに入ってから少し歩き、相手の投げ抜けを見てから攻撃）の練習。無敵技をガードさせるフェイントや、あえて確定反撃を入れさせない立ち回り練習。"
            },
            "Platinum": {
                typicalIssues: "読み合いの選択肢は多いが、状況判断ミスでリスクを負いやすい。",
                challenges: "相手の思考の癖を深く読み、リスクを最小限に抑えながら読み合いを制する。",
                practiceMethods: "相手がSAゲージを溜めている時にどう動くかを予測し、適切な行動を選択する。画面端でのセットプレイにおいて、相手のガード方向やリバーサルを予測し、最適解を選ぶ練習。"
            },
            "Diamond": {
                typicalIssues: "高レベルな読み合いで、相手のわずかなミスや心理の隙を突ききれない。",
                challenges: "相手の「読み」をコントロールし、自分に有利な状況を常に作り出す。",
                practiceMethods: "対戦中に相手の得意な行動をわざと誘発させ、それを潰す練習。相手が最も嫌がる行動を特定し、それを心理戦の軸にする。"
            },
            "Master": {
                typicalIssues: "読み合いの精度は極めて高いが、相手の柔軟な対応や精神的なプレッシャーで崩されることがある。",
                challenges: "相手の全てを読み切り、完全に主導権を握る。",
                practiceMethods: "様々なキャラの対策動画やプロの試合を研究し、自分のキャラでできる新たな選択肢や連携を見つける。あえてセオリーと違う行動を混ぜて、相手の思考を乱す練習。"
            },
        },
        diversityOfOptions: {
            "Bronze": {
                typicalIssues: "使える技が少なく、同じ攻めや守りを繰り返してしまい、相手に読まれやすい。",
                challenges: "キャラの基本的な技やシステムを理解し、使える行動の幅を広げる。",
                practiceMethods: "キャラのコマンドリストを見て、使っていない技やコンボをトレーニングモードで試す。ジャンプ攻撃、中段、下段、投げなど、基本的な崩し方を意識する。"
            },
            "Silver": {
                typicalIssues: "状況に合わせた最適な行動選択ができていない。有利フレームを活かしきれていない。",
                challenges: "フレーム状況に応じて、適切な技や行動を選択する。",
                practiceMethods: "自分のキャラの主要な通常技や特殊技の有利不利フレームを覚える。ガードさせた後に有利になる技から、打撃と投げの二択を仕掛ける練習。"
            },
            "Gold": {
                typicalIssues: "攻めは多様化してきたが、防御オプションが少ない。リソース運用が単調。",
                challenges: "攻守両面で多様な選択肢を持ち、リソースも効果的に運用する。",
                practiceMethods: "ドライブパリィやOD技での割り込み、ジャストパリィの練習。ドライブゲージが少ない時の立ち回りや、SAゲージが溜まった時の攻め方を練習。"
            },
            "Platinum": {
                typicalIssues: "選択肢は豊富だが、相手のキャラやプレイヤーの癖に合わせて柔軟に切り替えられない。",
                challenges: "相手の弱点や行動に合わせて、最適な選択肢を即座に選び出す。",
                practiceMethods: "特定のキャラに対して有効な牽制技や崩し方、防御オプションを調べて実践する。コンボ選択肢も、相手の体力やゲージ状況に応じて変えられるように練習する。"
            },
            "Diamond": {
                typicalIssues: "選択肢の幅は広いが、リスクリターンの判断や、相手への精神的負荷をかける行動が不足している。",
                challenges: "自分の行動が相手に与える影響を計算し、ゲームプランを構築する。",
                practiceMethods: "画面端での起き攻めパターンを複数用意し、相手の防御行動を読んで使い分ける練習。自分のキャラの持っているセットプレイや詐欺飛びを完璧にする。"
            },
            "Master": {
                typicalIssues: "選択肢はほぼ無限だが、相手の対応力や、試合の流れに合わせて最適なリズムを掴むのが難しい。",
                challenges: "相手を読みの沼に引き込み、常に自分のペースでゲームをコントロールする。",
                practiceMethods: "様々なキャラの対策動画やプロの試合を研究し、自分のキャラでできる新たな選択肢や連携を見つける。あえてセオリーと違う行動を混ぜて、相手の思考を乱す練習。"
            },
        },
        mentalResilience: {
            "Bronze": {
                typicalIssues: "相手の大ダメージコンボや予想外の動きでパニックになり、その後のラウンドで冷静さを失う。",
                challenges: "冷静さを保ち、次のラウンドで立て直す意識を持つ。",
                practiceMethods: "対戦中に一度深呼吸をする癖をつける。負けても「今の何が悪かった？」と一瞬だけ反省し、すぐに「次はどうする？」と気持ちを切り替える練習。"
            },
            "Silver": {
                typicalIssues: "連敗すると焦りやイライラが増し、普段できるはずのミスが増える。逆ギレ行動が出やすい。",
                challenges: "感情に左右されず、状況判断を冷静に行う。",
                practiceMethods: "負けた時に「なぜ負けたか」を冷静に分析する癖をつける。感情的になりそうになったら、少し休憩を挟む。トレーニングモードで反復練習し、自信をつける。"
            },
            "Gold": {
                typicalIssues: "リードしている時に慎重になりすぎて攻めが弱くなる、または焦って逆転されることがある。",
                challenges: "有利状況でも不利状況でも、常に最善の判断と行動を継続する。",
                practiceMethods: "体力リード時の立ち回り（逃げ切り、ゲージ温存）の練習。不利な状況から逆転を狙う場面での冷静な判断練習（例えば、SAゲージが溜まった時の切り返しタイミング）。"
            },
            "Platinum": {
                typicalIssues: "格上の相手や苦手なキャラとの対戦で、最初から諦めてしまったり、普段の力を出せない。",
                challenges: "相手が誰であろうと、自分のゲームプランを遂行する。",
                practiceMethods: "苦手なキャラの対策を事前に少しでも調べておく。格上との対戦では、「一つでも新しいことを試す」「一つの目標（例：対空を3回出す）を達成する」など、小さな目標を設定して挑戦する。"
            },
            "Diamond": {
                typicalIssues: "あと一歩でランクが上がる場面などで緊張し、入力ミスや判断ミスが増える。",
                challenges: "プレッシャーの中でも、普段通りのパフォーマンスを発揮する。",
                practiceMethods: "模擬戦や対戦会で、本番に近い緊張感の中で練習を重ねる。自分にとって大事な試合の前に、深呼吸やルーティンを行うなど、メンタルを整える工夫をする。"
            },
            "Master": {
                typicalIssues: "メンタルは強いが、相手の精神的な揺さぶり（煽り、挑発など）に乗せられてしまうことがある。",
                challenges: "相手のあらゆる精神攻撃にも動じず、冷静さを保ち、逆に相手を揺さぶる。",
                practiceMethods: "どんな状況でも冷静さを保つための瞑想や集中力トレーニング。相手の挑発行動に対して、無視するか、逆に冷静に読みを深める練習。"
            },
        },
    };

    // 自由記述の内容をアドバイスに含めるかどうかの判断
    let freeTextPrompt = "";
    if (userFreeText && userFreeText.trim().length > 0) {
        freeTextPrompt = `ユーザーの今日の気づき・課題・具体例は「${userFreeText.trim()}」です。この内容に直接寄り添ったアドバイスを必ず含んでください。`;
    }

    // スコアの詳細な説明をプロンプトに組み込む
    const scoreDetailsPrompt = Object.keys(scores).map(key => {
        const score = scores[key];
        let description = "";
        switch(key) {
            case 'patternRecognition': description = getPatternRecognitionDescription(score); break;
            case 'prediction': description = getPredictionDescription(score); break;
            case 'reactionSpeed': description = getReactionSpeedDescription(score); break;
            case 'multiLayerReading': description = getMultiLayerReadingDescription(score); break;
            case 'diversityOfOptions': description = getDiversityOfOptionsDescription(score); break;
            case 'mentalResilience': description = getMentalResilienceDescription(score); break;
        }
        return `${getSkillNameInJapanese(key)}：${score}点（これは${playerRank}ランクのストリートファイター6プレイヤーにおいて、${description}レベルに相当します）`;
    }).join('\n');

    let levelInstruction = '';
    switch (adviceLevel) {
        case 'high-level':
            levelInstruction = `プロフェッショナルな視点から、${playerRank}ランクのプレイヤーが次に目指すべき、より高度で深い読み合いの戦略や練習法について、`;
            break;
        case 'gamer':
            levelInstruction = `ゲーマー向けに、${playerRank}ランクのプレイヤーがランクマッチや対戦会で即座に役立つ実践的なアドバイスや、具体的な練習のヒントも交えながら、`;
            break;
        case 'enjoy':
            levelInstruction = `楽しくプレイするための、${playerRank}ランクのプレイヤーがゲームを継続するモチベーション維持につながるヒントや、気軽に試せる練習法も交えながら、`;
            break;
        case 'kid':
            levelInstruction = `キャラクターや動きに例えながら、${playerRank}ランクのお友達にも分かりやすく、優しく、`;
            break;
        default:
            levelInstruction = `実践的なアドバイスや具体的な練習の例も交えながら、`;
    }

    // AIへの最終プロンプト
    const prompt = `あなたはストリートファイター6の専門家であり、最高のコーチです。
ユーザーは現在のランクが「${playerRank}」で、AIアドバイスレベルを「${adviceLevel}」と指定しています。
以下の診断結果と、ユーザーの「今日の気づき・課題・具体例」を総合的に考慮し、ストリートファイター6の攻略に特化した、具体的かつ実践的なアドバイスを生成してください。

### 診断結果:
${scoreDetailsPrompt}
${freeTextPrompt}

### 知識ベース（この情報から最優先で情報を引用・要約し、自然な文章に組み込んでください。特にストリートファイター6のシステムや用語を積極的に使い、具体的にアドバイスしてください。）:
${JSON.stringify(sf6KnowledgeBase)}

### 回答の構成とルール:
* 回答は必ず以下の3つのセクションに分けて出力してください。セクション名も必須です。
    1.  **【典型例・今の状況】**
    2.  **【課題・今後の伸びしろ】**
    3.  **【具体的な練習方法・アドバイス】**
* **各セクションの間に必ず空行（改行2つ `\\n\\n`）を入れてください。**
* **各セクションは最大でも3〜5行程度**の簡潔な文章にまとめてください。余計な情報は含めず、核心を突いた内容にしてください。
* **架空のコンボや誤った技名は絶対に生成しないでください。** 具体例を挙げる際は、知識ベースにある一般的なシステム（例: ドライブインパクト、パリィ、SAなど）に関するものを優先するか、具体的な技名ではなく「対空技」「確定反撃コンボ」といった汎用的な表現を使ってください。
* ユーザーの「今日の気づき・課題・具体例」の悩みに直接寄り添ったアドバイスを必ず含んでください。
* 必ず日本語で出力してください。

${levelInstruction}それぞれの強み・伸ばすと良い能力や練習アドバイスを教えてください。`;


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

// --- ヘルパー関数群（プロンプト内でスコアの意味を伝えるため） ---
function getSkillNameInJapanese(key) {
    switch(key) {
        case 'patternRecognition': return 'パターン認識力';
        case 'prediction': return '予測力';
        case 'reactionSpeed': return '反応速度・最適対応力';
        case 'multiLayerReading': return '多重読み・心理戦';
        case 'diversityOfOptions': return '選択肢の多様性・柔軟性';
        case 'mentalResilience': return 'メンタル耐性・動揺度';
        default: return key;
    }
}

function getPatternRecognitionDescription(score) {
    if (score <= 2) return "相手の基本的な行動パターン（飛び、突進技の多用など）を認識するのが難しい初心者レベル。ドライブゲージやSAゲージの残量に意識が向かない傾向";
    if (score <= 5) return "相手の主要な行動パターンや癖（例：特定の連携の終わり方、ゲージの使い方）に気づくことがある中級者レベル。ドライブインパクトを返せるようになるが、安定しない";
    if (score <= 8) return "相手の複雑なセットプレイや心理的な癖、リソース管理まで深く認識できる上級者レベル。相手のゲージ管理を見てOD技やSAの有無を意識できる";
    return "相手の微細な行動パターン、意識配分、キャラクター固有のフレーム消費の癖まで素早く認識し、それに応じた完璧な対応や戦略変更ができるプロ級レベル。相手の読みの読みまで意識した行動を選択できる";
}

function getPredictionDescription(score) {
    if (score <= 2) return "相手の行動を予測する意識が低く、常に後手になっている初心者レベル。防御に徹しがち";
    if (score <= 5) return "読みを試みるが、成功率はまだ安定しない中級者レベル。読みが当たっても次の行動に繋げられないことがある";
    if (score <= 8) return "相手の主要な行動（例：飛び込み、置き技、投げ）を先読みし、有利な反撃や差し返しを成功させられる上級者レベル。モダン操作であればアシストコンボを狙える";
    return "相手の行動パターンと心理を深く読み解き、複数択の中から最も効果的な先読み行動（例：ドライブインパクト返し、パリィ、投げ抜け、大ダメージコンボ）を高い精度で実行できるプロ級レベル";
}

function getReactionSpeedDescription(score) {
    if (score <= 2) return "相手の確定反撃や対空攻撃をほとんど防げない初心者レベル。咄嗟の状況判断が遅れる傾向";
    if (score <= 5) return "半分程度は見てから対応できるが、安定しない中級者レベル。特に画面端や状況が複雑な場面でのミスが多い";
    if (score <= 8) return "相手の特定の技や行動（例：ドライブインパクト、ドライブラッシュ、ジャンプ攻撃）を見てからの対応（差し返し、対空、投げ抜け）を高い精度で成功させられる上級者レベル。クラシック操作であれば確定反撃コンボを入れられる";
    return "どんな状況でも相手の行動を見てから最速で最適な反撃や防御行動（例：パニッシュカウンター、大ダメージコンボ、完璧な対空コンボ）を安定して実行できるプロ級レベル。入力精度も極めて高い";
}

function getMultiLayerReadingDescription(score) {
    if (score <= 2) return "自分の行動が相手に読まれていることに気づきにくく、同じパターンを繰り返してしまう初心者レベル";
    if (score <= 5) return "相手が何をしようとしているかを意識し始めるが、その裏をかく行動はまだ難しい中級者レベル";
    if (score <= 8) return "相手が自分の行動をどう読んでいるかを推測し、その裏をかく行動（例：ドライブインパクトのフェイント、投げのシミー、遅らせ投げ、無敵技のガード、ドライブラッシュのキャンセル）を狙って成功させられる上級者レベル";
    return "相手の心理を深く読み解き、複数回の読み合いを連続で制する高度な心理戦（例：読みの読み、リソース管理、相手のSAゲージ消費を誘う立ち回り）を展開できるプロ級レベル。相手を手のひらで転がすような感覚がある";
}

function getDiversityOfOptionsDescription(score) {
    if (score <= 2) return "使える技や戦術が少なく、同じ攻めや守りを繰り返してしまう初心者レベル。キャラの基本技しか使えない傾向";
    if (score <= 5) return "ある程度の選択肢は持っているが、状況に合わせた最適な選択ができない中級者レベル。立ち回りがパターン化しやすい";
    if (score <= 8) return "状況に応じて豊富な選択肢（例：様々な距離での牽制、崩し、防御オプション、リソース運用）を使い分け、相手の対策を困難にさせられる上級者レベル。キャラの強みを引き出せる";
    return "自分のキャラクターの全アセットを最大限に活用し、どんな状況でも相手の弱点や行動を潰すための最適な選択肢を柔軟に選び、ゲームを支配できるプロ級レベル。キャラ対策も深い";
}

function getMentalResilienceDescription(score) {
    if (score <= 2) return "予想外のダメージや連続ヒットでパニックになり、冷静な判断ができない初心者レベル。逆ギレ行動や適当な技を振ってしまう傾向";
    if (score <= 5) return "不利な状況でも立て直そうとするが、まだ感情に左右されやすい中級者レベル。緊張で入力ミスが増えることがある";
    if (score <= 8) return "どんなに不利な状況やミスが続いても、感情的にならず、冷静に状況を判断し、最善の行動（例：防御重視、体力リード時の逃げ切り、ゲージ温存）を選択できる上級者レベル";
    return "プレッシャーのかかる場面や、相手が格上でも常に冷静沈着。ミスを即座に分析し、次のラウンドに活かせるプロ級レベル。相手の精神を揺さぶるような行動も意図的にできる";
}

