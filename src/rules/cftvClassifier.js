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
  // pega CF 114, CF114, CF-114, CF:114
  const m = text.match(/\bcf\s*[-#: ]?\s*(\d{1,5})\b/);
  if (!m) return null;
  return `CF ${m[1]}`;
}

function classifyCftvIssue({ title, descriptionText, activityText }) {
  const blob = normalize(
    [title, descriptionText, activityText]
      .filter(Boolean)
      .join(' ')
  );

  const cameraId = extractCameraId(blob);

  // 🔴 OFFLINE
  if (hasAny(blob, [
    'offline',
    'off line',
    'indisponivel',
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
    'embaçada',
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
    'instalação',
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
    'fora de posição',
    'fora de posicionamento',
    'angulo',
    'ângulo',
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
