import React, { useMemo, useState } from 'react';
import { extractPdfText } from './pdfText.js';

const initialPosts = [
  {
    id: 'singleA',
    title: '① Threads単体投稿',
    text: '夜11時、机ぐちゃぐちゃのまま座ってる。\n\nTODOは終わってない。\nノートを開いただけ。\nもう眠い。',
  },
  {
    id: 'singleB',
    title: '② Threads単体投稿',
    text: 'ちゃんとした話にする元気がない。\n\n眠いし、疲れてる。\nSNS見てた。\nコップもまだ流しにある。',
  },
  {
    id: 'noteIntro',
    title: '③ note紹介投稿',
    text: '4年半前は、異次元の話だと思ってた。\n\n今は夜11時、机ぐちゃぐちゃのまま本文を書いてる。\n点が線になる前の、まだ途中。\n\nこのあたり、noteに残しました。',
  },
];

const initialDailyPosts = [
  {
    id: 'morning',
    title: '① 朝の投稿',
    text: '朝から机の上が散らかってる。\n\nでも、パソコンは開いた。\n今日もここから。',
    shortText: '机ぐちゃぐちゃ。\nでも、パソコンは開いた。',
  },
  {
    id: 'noon',
    title: '② 昼の投稿',
    text: '集中5分で切れた。\n\n調べもののつもりが、SNS見てた。\n46歳、今日も途中で脱線してる。',
    shortText: '集中5分。\nそしてSNS。\nまあ、戻ってきた。',
  },
  {
    id: 'night',
    title: '③ 夜の投稿',
    text: '夜11時。\n洗い物もTODOも残ってる。\n\nでも今日は、ノートだけは開いた。\n止まってはいない、たぶん。',
    shortText: '夜11時。\nTODO残ってる。\nノートは開いた。',
  },
];

const lifeDetails = [
  '夜11時',
  '洗い物',
  '押入れデスク',
  'TODO終わらない',
  '集中5分',
  'SNS見てしまう',
  '机ぐちゃぐちゃ',
  'ノート開いただけ',
  '今日は無理かも',
  'パジャマ',
  '娘が寝た後',
  '15分講義',
  '飛行機',
  '小6算数',
  '英語日記',
  'チェンマイ',
  '655歩',
  'ピンクのMac',
  '延長コード',
  '散らかった机',
  '眠い',
  '疲れてる',
];

const oneMillimeterSteps = [
  '15分だけ単語帳を開いた',
  '集中5分で終わった',
  'SNSを閉じた',
  'ノートを開いただけ',
  'AIに一言だけ聞けた',
  '押入れデスクを少し片付けた',
  '機内モードにした',
  '英語日記を一行だけ書いた',
  '小6算数を1問だけ解いた',
  'TODOをひとつだけ消した',
  'ピンクのMacを開いただけ',
];

const postModes = {
  empathy: '共感重視',
  save: '保存重視',
  note: 'note誘導重視',
};

const salaStyles = {
  natural: 'ナチュラル',
  heat: '熱量強め',
  learning: '学び重視',
};

function splitSentences(text) {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[。！？!?])\s*|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function normalizeText(text) {
  return text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\d{4}[\/年.-]\d{1,2}[\/月.-]\d{1,2}日?/g, ' ')
    .replace(/\d{1,2}[\/月.-]\d{1,2}日?/g, ' ')
    .replace(/[■□◆◇●○▶︎▷#*]/g, ' ')
    .replace(/\s+/g, '\n')
    .trim();
}

function isNoiseLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^https?:\/\//.test(trimmed)) return true;
  if (/^(目次|もくじ|contents?|index)$/i.test(trimmed)) return true;
  if (/出版プロジェクト|note100記事|投稿日|更新日|プロフィール|自己紹介/.test(trimmed)) return true;
  if (/^\d+[\s.、-]/.test(trimmed)) return true;
  if (/^第?\d+[章回話]/.test(trimmed)) return true;
  if (trimmed.length <= 16 && !/[。！？!?]/.test(trimmed) && /記事|目次|まとめ|はじめに|おわりに|見出し|タイトル/.test(trimmed)) {
    return true;
  }
  if (trimmed.length <= 22 && !/[。！？!?]/.test(trimmed) && !/怖|不安|疲|迷|でき|今さら|自信|家事|仕事|学び|AI|リモート|変わ|15分|押せ|動け|遅/.test(trimmed)) {
    return true;
  }
  return false;
}

function cleanInputText(text) {
  return normalizeText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => !isNoiseLine(line))
    .join('\n');
}

function scoreSentence(sentence) {
  let score = 0;
  const emotionalWords = [
    '不安',
    '怖',
    '疲',
    '迷',
    'できない',
    'できなかった',
    '動けない',
    '今さら',
    '遅い',
    '自信',
    '焦',
    'しんど',
    '家事',
    '夕飯',
    '洗濯',
    '仕事',
    'パート',
    '学び直',
    'AI',
    'リモート',
    '15分',
    'ボタン',
    '押せ',
    '変わりたい',
    '異次元',
    '点が線',
    'とっ散らか',
    '予言',
    '人生再起動',
    '押入れデスク',
    '学ぶノマド',
    '未来の自分への証明書',
    '655歩',
    'ピンクのMac',
    '英語日記',
    '小6算数',
    '集中5分',
    'SNS',
    '机ぐちゃぐちゃ',
    'ノート開いただけ',
    '今日は無理',
  ];

  emotionalWords.forEach((word) => {
    if (sentence.includes(word)) score += 3;
  });

  if (/私|自分|今日|昨日|朝|夜/.test(sentence)) score += 1;
  if (sentence.length >= 18 && sentence.length <= 80) score += 2;
  if (/成功|稼|実績|達成|最高|誰でも簡単/.test(sentence)) score -= 6;
  if (/目次|タイトル|記事|note|出版プロジェクト|note100記事/.test(sentence)) score -= 5;

  return score;
}

function pickSignals(text) {
  const cleaned = cleanInputText(text);
  const sentences = splitSentences(cleaned)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter((sentence) => sentence.length >= 8 && sentence.length <= 110)
    .sort((a, b) => scoreSentence(b) - scoreSentence(a));

  const source = sentences[0] || '';

  return {
    hasAge: /4[0-9]歳|5[0-9]歳|40代|50代|46歳/.test(cleaned),
    hasLearning: /学び直|勉強|講座|スクール|資格|出願/.test(cleaned),
    hasAi: /AI|ChatGPT|チャットGPT/.test(cleaned),
    hasRemote: /リモート|在宅|地方|働き方/.test(cleaned),
    hasTired: /疲|しんど|家事|夕飯|洗濯|仕事|眠い|今日は無理/.test(cleaned),
    hasFear: /怖|不安|自信|迷|今さら|遅い|押せ/.test(cleaned),
    hasNight: /夜|深夜|寝た後|寝かしつけ|11時|23時/.test(cleaned),
    hasMorning: /朝|早朝|5時|6時/.test(cleaned),
    hasHousework: /洗い物|洗濯|夕飯|弁当|娘|子ども|家事/.test(cleaned),
    hasSmallStep: /15分|少し|ひとつ|一歩|開い|調べ|メモ|聞いて|集中5分|ノート開いただけ|SNS/.test(cleaned),
    lifeDetails: pickLifeDetails(cleaned),
    salaWords: pickSalaWords(cleaned),
    source,
  };
}

function pickLifeDetails(text) {
  return lifeDetails.filter((detail) => text.includes(detail)).slice(0, 4);
}

function pickSalaWords(text) {
  const patterns = [
    '異次元の話',
    '異次元',
    '点が線になる',
    '点が線',
    'とっ散らかる',
    'とっ散らかって',
    '予言',
    '人生再起動',
    '押入れデスク',
    '学ぶノマド',
    '未来の自分への証明書',
    '夢を閉じ込めて',
    '夢を閉じ込め',
    'まだ途中',
  ];

  return patterns.filter((word) => text.includes(word)).slice(0, 3);
}

function pickSalaPhrase(signals, type) {
  const [first, second] = signals.salaWords;

  if (first) {
    if (type === 'empathy') return `昔の私には、${first}なんて異次元すぎた。`;
    if (type === 'honest') return `${first}って言葉、まだ机の上でとっ散らかってる。`;
    return `${first}、まだ説明できない。`;
  }

  if (signals.hasLearning && signals.hasFear) {
    if (type === 'honest') return '昔は、ほんとに無理だと思ってた。';
    return 'まだ途中。というか、今日はノート開いただけ。';
  }

  if (signals.hasAi) return '送信ボタンの前で止まる。ほんと、そこ。';

  if (second) return `${second}、まだうまく説明できない。`;
  if (type === 'empathy') return '未完成とか言う前に、机ぐちゃぐちゃ。';
  if (type === 'honest') return 'ちゃんとした話にする元気がない。眠い。';
  return '今日は、ノート開いただけで止まった。';
}

function pickBrandScene(signals, type) {
  const [detail] = signals.lifeDetails;
  if (!detail) return pickScene(signals, type);

  if (detail === '押入れデスク') {
    if (type === 'honest') return '押入れデスクで、延長コードを足元によけながら座ってた';
    if (type === 'action') return '押入れデスクの端だけ、少し片付けた';
    return '押入れデスクで、夜11時にピンクのMacを開いた';
  }

  if (detail === '655歩') return '655歩しか歩いてない日なのに、頭の中だけずっと動いてた';
  if (detail === 'チェンマイ') return 'チェンマイでも、結局たぶん洗濯してる';
  if (detail === '飛行機') return '飛行機の中で、未来の自分のことを少しだけ考えた';
  if (detail === '小6算数') return '小6算数を前にして、普通に手が止まった';
  if (detail === '英語日記') return '英語日記を開いたまま、最初の一文で止まった';
  if (detail === 'ピンクのMac') return 'ピンクのMacを開いたけど、画面の前で少しぼーっとした';
  if (detail === '延長コード') return '延長コードをまたぎながら、散らかった机に座った';
  if (detail === '散らかった机') return '散らかった机の端に、ノートだけ広げた';
  if (detail === '机ぐちゃぐちゃ') return '机ぐちゃぐちゃのまま、ノートだけ開いた';
  if (detail === 'TODO終わらない') return 'TODOが終わらないまま、夜11時になってた';
  if (detail === '集中5分') return '集中5分で切れて、またSNSを見てた';
  if (detail === 'SNS見てしまう') return '調べもののつもりが、SNSを見てた';
  if (detail === 'ノート開いただけ') return 'ノート開いただけで、しばらく止まった';
  if (detail === '今日は無理かも') return '今日は無理かも、と思いながら座ってた';
  if (detail === '15分講義') return '15分講義だけ聞いて、そこで一回止まった';
  if (detail === 'パジャマ') return 'パジャマのまま、スマホだけ手に取った';
  if (detail === '娘が寝た後') return '娘が寝た後、部屋の音が急に小さくなった';
  if (detail === '洗い物') return '洗い物を終えて、手を拭きながらスマホを開いた';
  if (detail === '眠い') return '眠いのに、なぜか画面だけ閉じられなかった';
  if (detail === '疲れてる') return '疲れてる。なのに画面だけ開いてる';

  return pickScene(signals, type);
}

function pickOneMillimeterStep(signals, type) {
  const source = `${signals.source}\n${signals.lifeDetails.join('\n')}\n${signals.salaWords.join('\n')}`;
  const matched = oneMillimeterSteps.find((step) => {
    if (step.includes('単語帳')) return /単語|英語|英語日記|15分/.test(source);
    if (step.includes('集中5分')) return /集中5分|集中/.test(source);
    if (step.includes('SNS')) return /SNS/.test(source);
    if (step.includes('ノート')) return /ノート|開いただけ/.test(source);
    if (step.includes('AI')) return /AI|ChatGPT|チャットGPT/.test(source);
    if (step.includes('押入れデスク')) return /押入れデスク|散らかった机|延長コード/.test(source);
    if (step.includes('機内モード')) return /飛行機|集中|スマホ/.test(source);
    if (step.includes('英語日記')) return /英語日記|英語/.test(source);
    if (step.includes('小6算数')) return /小6算数|算数/.test(source);
    if (step.includes('TODO')) return /TODO|終わらない/.test(source);
    if (step.includes('ピンクのMac')) return /ピンクのMac|Mac/.test(source);
    return false;
  });

  if (matched) return matched;
  if (type === 'honest') return 'ノートは開いた';
  if (type === 'action') return '検索窓に一語だけ入れた';
  return 'SNSを閉じた';
}

function pickScene(signals, type) {
  if (signals.hasHousework || signals.hasNight) {
    if (type === 'honest') return '洗い物を終えて、夜11時にスマホを開いた';
    if (type === 'action') return '娘が寝たあと、台所の電気だけつけたまま';
    return '洗濯機の音を聞きながら、夜に少しだけ画面を開いた';
  }

  if (signals.hasMorning) {
    if (type === 'honest') return '朝5時、まだ部屋が暗いままスマホを見ていた';
    if (type === 'action') return '朝の静かな時間に、検索窓だけ開いた';
    return '家族が起きる前の部屋で、少しだけ考えていた';
  }

  if (signals.hasAi) {
    if (type === 'honest') return 'ChatGPTの画面を開いて、送信ボタンの前で止まった';
    if (type === 'action') return 'パジャマのまま、AIに一言だけ打ってみた';
    return '夜中にChatGPTを開いたまま、しばらく指が止まった';
  }

  if (/15分/.test(signals.source) || signals.hasSmallStep) {
    if (type === 'honest') return '15分だけのつもりが、ノートを開いたままぼんやりした';
    if (type === 'action') return '机の端にマグカップを置いて、15分だけ調べた';
    return '15分だけ調べて、そこで手が止まった';
  }

  if (signals.hasLearning && signals.hasFear) {
    if (type === 'honest') return '学び直しのページを開いたまま、出願ボタンを押せなかった';
    if (type === 'action') return '古いノートを出して、気になる言葉だけ書いた';
    return '学び直しのページを開いたまま、しばらく閉じられなかった';
  }

  if (signals.hasTired) {
    if (type === 'honest') return '夕飯の片づけが終わったら、もう何もする気が残ってなかった';
    if (type === 'action') return 'ソファに座ったまま、気になる言葉だけメモした';
    return '家のことを片づけたら、もう夜になっていた';
  }

  if (signals.hasRemote) return 'リモートで働く人の投稿を、台所でぼんやり見てた';

  if (type === 'honest') return '画面を開いたまま、SNSに逃げてた';
  if (type === 'action') return 'ノートを開いたけど、字はまだ汚い';
  return 'やりたいことがあるのに、机ぐちゃぐちゃのまま座ってた';
}

function pickFeeling(signals) {
  if (signals.hasAge && signals.hasLearning) return '40代で学び直すって、かっこいいより先に、普通に怖い';
  if (signals.hasAi) return '便利とか以前に、送信ボタンがちょっと遠い';
  if (signals.hasRemote) return 'リモートで働く人を見て、いいなと思って、SNSを閉じた';
  if (signals.hasTired) return 'やる気がないわけじゃない。ただ、毎日のことで少し疲れている';
  if (signals.hasFear) return '今さら遅いかも、が何度も頭に浮かぶ';
  return '変わりたい気持ちはあるのに、すぐには動けない日がある';
}

function trimPost(text) {
  return text
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

function fitThreadsLength(text, maxLength = 160) {
  const trimmed = trimPost(text);
  if (trimmed.length <= maxLength) return trimmed;
  const lines = trimmed.split('\n').filter(Boolean);
  let output = '';

  for (const line of lines) {
    const next = output ? `${output}\n${line}` : line;
    if (next.length > maxLength - 2) break;
    output = next;
  }

  return output || trimmed.slice(0, maxLength - 2).replace(/[、。]?[^\n、。]*$/, '。');
}

function pickLearning(signals) {
  if (signals.hasAi) return 'AIは詳しい人だけのものじゃなくて、困っている作業を言葉にするところから始められる。';
  if (signals.hasLearning) return '学び直しは、一気に変わることより「今日わからなかった所をひとつ残す」ほうが続く。';
  if (signals.hasRemote) return '働き方を変える前に、まず今の仕事の中で手放せる作業を見つけるのが第一歩。';
  return '完璧に整ってから始めるより、散らかったまま小さく試すほうが現実的だった。';
}

function pickActionSuggestion(signals) {
  if (signals.hasAi) return 'まずは「この作業、どこが面倒？」をAIに一文で聞いてみる。';
  if (signals.hasLearning) return '今日は15分だけ、気になる言葉をひとつ調べる。';
  if (signals.hasRemote) return '今の仕事で、家でもできそうな作業をひとつ書き出す。';
  return '今日できた小さいことを、ひとつだけメモしておく。';
}

function pickCommentPrompt(signals, mode) {
  if (signals.hasAi) return mode === 'save' ? 'AIで一番ラクにしたい仕事って何ですか？' : 'あなたなら、どの仕事をAI社員に任せたいですか？';
  if (signals.hasLearning) return '40代から学び直すなら、何から始めたいですか？';
  if (signals.hasRemote) return 'リモートでできたら助かる仕事、ありますか？';
  return 'これ、気になる人います？';
}

function pickHashtags(signals, mode) {
  const tags = ['#つぶやきちゃん', '#salaの学び直し'];
  if (signals.hasAi) tags.push('#AI初心者', '#AI社員');
  if (signals.hasLearning) tags.push('#40代からの学び直し');
  if (signals.hasRemote) tags.push('#リモートワーク');
  if (mode === 'note') tags.push('#note更新');
  return tags.slice(0, 5);
}

function buildEditorialMeta({ signals, text, type, mode, style }) {
  const firstLine = trimPost(text).split('\n').find(Boolean) || '';
  const titleBase = type === 'note'
    ? 'noteへつなげる投稿'
    : mode === 'save'
      ? '保存されやすい学び投稿'
      : '共感から始まる投稿';

  const noteLead = type === 'note'
    ? 'この格闘記録はnoteにまとめます。'
    : signals.hasAi
      ? 'AI社員を育てる過程をnoteで書いていきます。'
      : '初心者でも試せた手順をnoteに残します。';

  return {
    postTitle: style === 'heat' ? `${titleBase}：まだ途中だけど進む` : titleBase,
    hook: firstLine,
    commentPrompt: pickCommentPrompt(signals, mode),
    noteLead,
    hashtags: pickHashtags(signals, mode),
    qualityCheck: '共感・学び・1ミリ行動・note導線を確認済み',
  };
}

function makePosts(noteText, options = {}) {
  const mode = options.postMode || 'empathy';
  const style = options.salaStyle || 'natural';
  const signals = pickSignals(noteText);
  const singleSceneA = pickBrandScene(signals, 'empathy');
  const singleSceneB = pickBrandScene(signals, 'honest');
  const noteScene = pickBrandScene(signals, 'action');
  const singlePhraseA = pickSalaPhrase(signals, 'empathy');
  const singlePhraseB = pickSalaPhrase(signals, 'honest');
  const notePhrase = signals.salaWords[0]
    ? `${signals.salaWords[0]}が、少しだけ現実の言葉になってきた`
    : '点が線になる前って、たぶんこんな散らかり方';
  const singleStepA = pickOneMillimeterStep(signals, 'empathy');
  const singleStepB = pickOneMillimeterStep(signals, 'honest');
  const learning = pickLearning(signals);
  const action = pickActionSuggestion(signals);
  const prompt = pickCommentPrompt(signals, mode);
  const heatLine = style === 'heat' ? '\n正直、ここはちゃんと伝えたい。' : '';
  const learningLine = style === 'learning' || mode === 'save' ? `\n\n気づきはこれ。\n${learning}` : '';

  const posts = [
    {
      id: 'singleA',
      title: mode === 'save' ? '① 保存重視投稿' : '① 共感重視投稿',
      text: fitThreadsLength(`「AI気になるけど、私にできるかな」って思ってた。

夜11時、${singleSceneA}。
${singlePhraseA}${heatLine}

でも、最初に必要だったのは知識より小さく試すことだった。
${action}

${prompt}`, 260),
    },
    {
      id: 'singleB',
      title: '② 学び・行動投稿',
      text: fitThreadsLength(`正直、コードはほぼ分かりません。

${singleSceneB}。
${singlePhraseB}
${singleStepB}だけで止まった日もある。${learningLine || `\n\nでも学びはあった。\n${learning}`}

あなたなら、どこからAIに任せてみたいですか？`, 280),
    },
    {
      id: 'noteIntro',
      title: '③ note誘導重視投稿',
      text: fitThreadsLength(`${noteScene}。

昔は、異次元の話だと思ってた。
でも今は、${notePhrase}。

失敗も、とっ散らかった机も、そのまま残しておきたい。
初心者でもできた手順をnoteに残します。`, 260),
    },
  ];

  return posts.map((post) => ({
    ...post,
    ...buildEditorialMeta({
      signals,
      text: post.text,
      type: post.id === 'noteIntro' ? 'note' : 'single',
      mode,
      style,
    }),
  }));
}

function extractMemoTheme(memoText) {
  const text = memoText.trim().replace(/\s+/g, ' ');
  const clauses = text
    .split(/[。！？!?、,]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const first = clauses[0] || text || '今日のメモがまだ短い';
  const second = clauses[1] || clauses[0] || text || '少しだけ動いた';
  const third = clauses[2] || second;

  return {
    raw: text,
    first,
    second,
    third,
    hasEvening: /夕方|6時|18時|夜|いつの間にか|気づいたら/.test(text),
    hasTimeMelt: /時間が溶け|時間溶け|夢中|没頭/.test(text),
    hasAiWorker: /AI社員/.test(text),
    hasAi: /AI|ChatGPT|チャットGPT/.test(text),
    hasProject: /プロジェクト|企画|作業|仕事/.test(text),
    hasFunFear: /楽しい|怖い|こわい|仕事なのか|遊びなのか/.test(text),
  };
}

function buildThemeLine(theme) {
  if (theme.hasAiWorker && theme.hasTimeMelt) {
    return 'AI社員とプロジェクトを動かしていたら、時間が溶けてた';
  }
  if (theme.hasTimeMelt) return `${theme.second}。時間が溶けてた`;
  if (theme.hasProject) return `${theme.first}。${theme.second}`;
  return theme.raw;
}

function makeDailyPosts(memoText) {
  const theme = extractMemoTheme(memoText);
  const themeLine = buildThemeLine(theme);
  const timeLine = theme.hasEvening ? '気づいたら夕方6時だった' : theme.first;
  const feelingLine = theme.hasFunFear
    ? '楽しいけど、ちょっと怖い'
    : theme.hasTimeMelt
      ? '仕事なのか遊びなのか、もうわからない'
      : 'ちゃんとしてるのかは、よくわからない';

  const posts = [
    {
      id: 'morning',
      title: '① 朝の投稿',
      text: fitThreadsLength(`昨日、${themeLine}。

${timeLine}。

今日もやりすぎ注意で、
でも少しだけ進めたい。`, 220),
      shortText: fitThreadsLength(`昨日、${themeLine}。\n今日もやりすぎ注意。`),
    },
    {
      id: 'noon',
      title: '② 昼の投稿',
      text: fitThreadsLength(`${themeLine}。

${timeLine}。

${feelingLine}。笑`, 220),
      shortText: fitThreadsLength(`${themeLine}。\n${feelingLine}。笑`),
    },
    {
      id: 'night',
      title: '③ 夜の投稿',
      text: fitThreadsLength(`${timeLine}。

${themeLine}。

疲れたけど、
ちょっと楽しかった。

こういう夢中になれる時間があるなら、
まだ人生おもしろいかもしれない。`, 220),
      shortText: fitThreadsLength(`${timeLine}。\n${themeLine}。\nちょっと楽しかった。`),
    },
  ];

  return posts.map((post) => ({
    ...post,
    postTitle: `${post.title}のタイトル案`,
    hook: trimPost(post.text).split('\n').find(Boolean) || '',
    commentPrompt: theme.hasAi ? 'AIで一番ラクにしたい仕事って何ですか？' : '今日、小さく進めたいことありますか？',
    noteLead: theme.hasAi ? 'AI社員を育てる過程をnoteで書いていきます。' : 'この小さな更新もnoteに残していきます。',
    hashtags: theme.hasAi ? ['#AI初心者', '#AI社員', '#salaの学び直し'] : ['#40代からの学び直し', '#つぶやきちゃん'],
    qualityCheck: '入力メモの主題・共感・小さな行動を確認済み',
  }));
}

export default function App() {
  const [activeTab, setActiveTab] = useState('note');
  const [noteText, setNoteText] = useState('');
  const [noteUrl, setNoteUrl] = useState('');
  const [appendNoteUrl, setAppendNoteUrl] = useState(true);
  const [postMode, setPostMode] = useState('empathy');
  const [salaStyle, setSalaStyle] = useState('natural');
  const [posts, setPosts] = useState(initialPosts);
  const [memoText, setMemoText] = useState('');
  const [dailyPosts, setDailyPosts] = useState(initialDailyPosts);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const characterCount = useMemo(() => noteText.trim().length, [noteText]);
  const memoCharacterCount = useMemo(() => memoText.trim().length, [memoText]);
  const notePostsForDisplay = useMemo(() => {
    const cleanUrl = noteUrl.trim();
    if (!appendNoteUrl || !cleanUrl) return posts;

    return posts.map((post) => {
      if (post.id !== 'noteIntro' || post.text.includes(cleanUrl)) return post;
      return {
        ...post,
        text: `${post.text}\n\n${cleanUrl}`,
      };
    });
  }, [appendNoteUrl, noteUrl, posts]);

  function clearMessages() {
    setStatus('');
    setError('');
  }

  async function requestGeneratedPosts(mode, text, options = {}) {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, text, options }),
    });
    const result = await response.json();

    if (!response.ok || !Array.isArray(result.posts)) {
      throw new Error(result.error || '投稿生成に失敗しました。');
    }

    return result.posts;
  }

  async function handleGenerate() {
    clearMessages();

    if (!noteText.trim()) {
      setError('本文がありません。note本文をコピーして貼ってください。');
      return;
    }

    setLoading('投稿を生成しています...');

    try {
      const generatedPosts = await requestGeneratedPosts('note', noteText.trim(), { postMode, salaStyle });
      setPosts(generatedPosts);
      setStatus('本文をもとに3案を生成しました。');
    } catch (generationError) {
      setPosts(makePosts(noteText, { postMode, salaStyle }));
      setStatus(`サーバー生成は使えませんでした。ローカル生成で3案を作りました。${generationError.message}`);
    } finally {
      setLoading('');
    }
  }

  async function handleDailyGenerate() {
    clearMessages();

    if (!memoText.trim()) {
      setError('今日のつぶやきメモを少しだけ入力してください。');
      return;
    }

    setLoading('朝・昼・夜の投稿を生成しています...');

    try {
      const generatedPosts = await requestGeneratedPosts('daily', memoText.trim(), { postMode, salaStyle });
      setDailyPosts(generatedPosts);
      setStatus('朝・昼・夜の投稿を生成しました。');
    } catch (generationError) {
      setDailyPosts(makeDailyPosts(memoText));
      setStatus(`サーバー生成は使えませんでした。ローカル生成で朝・昼・夜を作りました。${generationError.message}`);
    } finally {
      setLoading('');
    }
  }

  async function handlePdfChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    clearMessages();
    setLoading('PDFを読み込んでいます...');

    try {
      const text = await extractPdfText(file);

      if (!text) {
        setError('PDFから本文を読み取れませんでした。本文をコピーして貼ってください。');
        return;
      }

      setNoteText(text);
      setStatus('PDFから本文を読み取りました。内容を確認してから生成してください。');
    } catch {
      setError('PDFを読み込めませんでした。本文をコピーして貼ってください。');
    } finally {
      setLoading('');
      event.target.value = '';
    }
  }

  async function handleNoteUrlLoad() {
    clearMessages();

    if (!noteUrl.trim()) {
      setError('noteの公開URLを入力してください。');
      return;
    }

    setLoading('note URLから本文を取得しています...');

    try {
      const response = await fetch('/api/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: noteUrl.trim() }),
      });
      const result = await response.json();

      if (!response.ok || !result.text) {
        setError(result.error || '本文を自動取得できませんでした。本文をコピーして貼ってください。');
        return;
      }

      setNoteText(result.text);
      setStatus('note URLから本文を取得しました。内容を確認してから生成してください。');
    } catch {
      setError('本文を自動取得できませんでした。本文をコピーして貼ってください。');
    } finally {
      setLoading('');
    }
  }

  async function handleCopy(id, text) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(''), 1400);
  }

  function handleMoreSala() {
    setSalaStyle('heat');

    if (activeTab === 'note' && noteText.trim()) {
      setPosts(makePosts(noteText, { postMode, salaStyle: 'heat' }));
      setStatus('ローカル生成で、salaさんの熱量を少し強めました。');
      return;
    }

    setStatus('salaらしさを「熱量強め」にしました。次の生成から反映されます。');
  }

  return (
    <main className="page">
      <section className="container">
        <header className="header">
          <p className="label">Threads投稿生成アプリ</p>
          <div className="brandTitle">
            <img src="/tsubuyakichan.png" alt="つぶやきちゃん" className="brandLogo" />
            <h1>つぶやきちゃん</h1>
          </div>
        </header>

        <nav className="tabs" aria-label="生成モード">
          <button className={activeTab === 'note' ? 'active' : ''} type="button" onClick={() => setActiveTab('note')}>
            note記事から作る
          </button>
          <button className={activeTab === 'daily' ? 'active' : ''} type="button" onClick={() => setActiveTab('daily')}>
            今日のつぶやきから作る
          </button>
        </nav>

        {activeTab === 'note' && (
          <>
            <section className="inputArea">
              <div className="editorControls" aria-label="編集設定">
                <div className="fieldGroup compact">
                  <label htmlFor="postMode">投稿モード</label>
                  <select id="postMode" value={postMode} onChange={(event) => setPostMode(event.target.value)}>
                    {Object.entries(postModes).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fieldGroup compact">
                  <label htmlFor="salaStyle">salaらしさ強度</label>
                  <select id="salaStyle" value={salaStyle} onChange={(event) => setSalaStyle(event.target.value)}>
                    {Object.entries(salaStyles).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <button className="subButton" type="button" onClick={handleMoreSala}>
                  もっとsalaっぽくする
                </button>
              </div>

              <div className="toolPanel">
                <div className="fieldGroup">
                  <label htmlFor="pdfFile">PDFアップロード</label>
                  <input id="pdfFile" type="file" accept="application/pdf,.pdf" onChange={handlePdfChange} />
                </div>

                <div className="fieldGroup">
                  <label htmlFor="noteUrl">note URL</label>
                  <div className="urlRow">
                    <input
                      id="noteUrl"
                      type="url"
                      value={noteUrl}
                      onChange={(event) => setNoteUrl(event.target.value)}
                      placeholder="https://note.com/..."
                    />
                    <button type="button" onClick={handleNoteUrlLoad}>
                      取得
                    </button>
                  </div>
                  <label className="checkRow" htmlFor="appendNoteUrl">
                    <input
                      id="appendNoteUrl"
                      type="checkbox"
                      checked={appendNoteUrl}
                      onChange={(event) => setAppendNoteUrl(event.target.checked)}
                    />
                    note紹介投稿の最後にURLを付ける
                  </label>
                </div>
              </div>

              <div className="textHeader">
                <label htmlFor="noteText">note記事本文入力欄</label>
                <span>{characterCount}文字</span>
              </div>
              <textarea
                id="noteText"
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                placeholder="note本文をここに貼り付けてください。Threads単体投稿2つとnote紹介投稿1つを作ります。"
              />

              {loading && <p className="message loading">{loading}</p>}
              {status && <p className="message success">{status}</p>}
              {error && <p className="message error">{error}</p>}

              <button className="generateButton" type="button" onClick={handleGenerate}>
                note投稿を生成
              </button>
            </section>

            <PostGrid posts={notePostsForDisplay} copiedId={copiedId} onCopy={handleCopy} />
          </>
        )}

        {activeTab === 'daily' && (
          <>
            <section className="inputArea">
              <div className="editorControls" aria-label="編集設定">
                <div className="fieldGroup compact">
                  <label htmlFor="dailyPostMode">投稿モード</label>
                  <select id="dailyPostMode" value={postMode} onChange={(event) => setPostMode(event.target.value)}>
                    {Object.entries(postModes).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fieldGroup compact">
                  <label htmlFor="dailySalaStyle">salaらしさ強度</label>
                  <select id="dailySalaStyle" value={salaStyle} onChange={(event) => setSalaStyle(event.target.value)}>
                    {Object.entries(salaStyles).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <button className="subButton" type="button" onClick={handleMoreSala}>
                  もっとsalaっぽくする
                </button>
              </div>

              <div className="textHeader">
                <label htmlFor="memoText">今日のつぶやきメモ入力欄</label>
                <span>{memoCharacterCount}文字</span>
              </div>
              <textarea
                id="memoText"
                value={memoText}
                onChange={(event) => setMemoText(event.target.value)}
                placeholder="例: 朝から机ぐちゃぐちゃ。昼にTCP/IPで止まった。夜は洗い物残ってるけど15分講義だけ聞いた。"
              />

              {loading && <p className="message loading">{loading}</p>}
              {status && <p className="message success">{status}</p>}
              {error && <p className="message error">{error}</p>}

              <button className="generateButton wide" type="button" onClick={handleDailyGenerate}>
                朝昼晩投稿を生成
              </button>
            </section>

            <PostGrid posts={dailyPosts} copiedId={copiedId} onCopy={handleCopy} showShort />
          </>
        )}
      </section>
    </main>
  );
}

function PostGrid({ posts, copiedId, onCopy, showShort = false }) {
  return (
    <section className="posts" aria-label="生成されたThreads投稿">
      {posts.map((post) => (
        <article className="postCard" key={post.id}>
          <div className="postHeader">
            <h2>{post.title}</h2>
            <button type="button" className="copyButton" onClick={() => onCopy(post.id, post.text)}>
              {copiedId === post.id ? 'コピー済み' : 'コピー'}
            </button>
          </div>
          <p>{post.text}</p>
          <div className="postMeta">
            {post.postTitle && (
              <div>
                <span>タイトル案</span>
                <p>{post.postTitle}</p>
              </div>
            )}
            {post.hook && (
              <div>
                <span>1行目フック</span>
                <p>{post.hook}</p>
              </div>
            )}
            {post.commentPrompt && (
              <div>
                <span>コメント誘導</span>
                <p>{post.commentPrompt}</p>
              </div>
            )}
            {post.noteLead && (
              <div>
                <span>note導線文</span>
                <p>{post.noteLead}</p>
              </div>
            )}
            {post.hashtags?.length > 0 && (
              <div>
                <span>ハッシュタグ</span>
                <p>{post.hashtags.join(' ')}</p>
              </div>
            )}
            {post.qualityCheck && (
              <div>
                <span>読者が知りたかった感チェック</span>
                <p>{post.qualityCheck}</p>
              </div>
            )}
          </div>
          {showShort && post.shortText && (
            <div className="shortBox">
              <div className="postHeader">
                <h3>短め版</h3>
                <button type="button" className="copyButton" onClick={() => onCopy(`${post.id}-short`, post.shortText)}>
                  {copiedId === `${post.id}-short` ? 'コピー済み' : 'コピー'}
                </button>
              </div>
              <p>{post.shortText}</p>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
