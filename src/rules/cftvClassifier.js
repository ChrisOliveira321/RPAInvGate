// src/rules/cftvClassifier.js

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text, words) {
  return words.some(w => text.includes(w));
}

function extractCameraId(text) {
  if (!text) return null;

  // 1) CF 114, CF114, CF-114, CF:114, CF#114
  let m = text.match(/\bcf\s*[-#: ]?\s*(\d{1,5})\b/i);
  if (m) return `CF ${m[1]}`;

  // 2) camera 114, câmera 114, cam 114 (normalizado remove acento)
  // aceita separadores: espaço, -, :, # e também "n°"/"no"/"num" (bem comum)
  m = text.match(/\b(cam(era)?|camera)\s*(n|no|nº|num)?\s*[-#: ]?\s*(\d{1,5})\b/i);
  if (m) return `CF ${m[4]}`;

  // 3) fallback opcional: "cftv 114"
  m = text.match(/\bcftv\s*[-#: ]?\s*(\d{1,5})\b/i);
  if (m) return `CF ${m[1]}`;

  return null;
}

function classifyCftvIssue({ title, descriptionText, activityText }) {
  const blob = normalize(
    [title, descriptionText, activityText]
      .filter(Boolean)
      .join(' ')
  );

  // ✅ independente da classificação, tenta extrair sempre
  const cameraId = extractCameraId(blob);

  // 🔴 OFFLINE
  if (hasAny(blob, [
    'offline',
    'off line',
    'indisponivel',
    'caiu',
    'sem sinal',
    'sem imagem',
    'fora do ar',
    'camera off'
  ])) {
    return { issueType: 'CF_OFFLINE', cameraId };
  }

  // 🧽 LIMPEZA
  if (hasAny(blob, [
    'limpeza',
    'limpar',
    'suja',
    'sujo',
    'embacada',
    'lente suja',
    'imagem suja'
  ])) {
    return { issueType: 'CF_LIMPEZA', cameraId };
  }

  // 🛠️ INSTALAÇÃO
  if (hasAny(blob, [
    'instalar',
    'instalacao',
    'nova camera',
    'nova cam',
    'colocar camera',
    'instalar camera'
  ])) {
    return { issueType: 'CF_INSTALACAO', cameraId };
  }

  // 🎯 POSICIONAMENTO
  if (hasAny(blob, [
    'fora de posicao',
    'fora de posicionamento',
    'angulo',
    'virar camera',
    'ajustar camera',
    'reposicionar'
  ])) {
    return { issueType: 'CF_POSICIONAMENTO', cameraId };
  }

  return { issueType: 'CF_OUTROS', cameraId };
}

module.exports = {
  classifyCftvIssue,
};
