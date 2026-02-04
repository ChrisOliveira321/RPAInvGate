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

// CF 114, CF114, CF-114, CF:114, CF#114
function hasCfNumber(text) {
  return /\bcf\s*[-#: ]?\s*\d{1,5}\b/i.test(text || '');
}

function extractCameraId(text) {
  if (!text) return null;

  // 1) CF 114, CF114, CF-114, CF:114, CF#114
  let m = text.match(/\bcf\s*[-#: ]?\s*(\d{1,5})\b/i);
  if (m) return `CF ${m[1]}`;

  // 2) camera 114, cam 114, camera no 114, camera nº 114, camera num 114
  // (normalizado remove acento: "câmera" -> "camera")
  m = text.match(/\b(cam(era)?|camera)\s*(n|no|nº|num)?\s*[-#: ]?\s*(\d{1,5})\b/i);
  if (m) return `CF ${m[4]}`;

  // 3) fallback: cftv 114
  m = text.match(/\bcftv\s*[-#: ]?\s*(\d{1,5})\b/i);
  if (m) return `CF ${m[1]}`;

  return null;
}

/**
 * Gate: evita falsos positivos de “categoria CFTV” (ex: bafômetro).
 * Retorna true quando o texto realmente parece CFTV.
 */
function isRealCftvText({ title, descriptionText, activityText, activitiesText } = {}) {
  const blob = normalize([title, descriptionText, activityText, activitiesText].filter(Boolean).join(' '));

  // ✅ fortíssimo: CF + número => é CFTV
  if (hasCfNumber(blob)) return true;

  // ✅ positivos (sinais de CFTV)
  const positives = [
    'cftv',
    'camera',
    'cam',          // sem espaço, porque pode vir "cam1" / "cam-12"
    'nvr',
    'dvr',
    'sem imagem',
    'sem sinal',
    'offline',
    'fora do ar',
    'lente',
    'ptz',
    'gravacao',
    'gravando',
    'imagem',
    'video',
  ];

  // ❌ negativos (coisas que caem no grupo errado)
  const negatives = [
    'bafometro',
    'bafometro', // redundância ok (não atrapalha)
    'cancela',
    'balanca',
    'ocr',
    'painel',
    'catraca',
    'torniquete',
  ];

  const hasPositive = hasAny(blob, positives);
  const hasNegative = hasAny(blob, negatives);

  // ✅ se tem sinal de CFTV e NÃO tem negativo => é CFTV
  return hasPositive && !hasNegative;
}

function classifyCftvIssue({ title, descriptionText, activityText, activitiesText } = {}) {
  const blob = normalize([title, descriptionText, activityText, activitiesText].filter(Boolean).join(' '));

  // ✅ tenta extrair sempre
  const cameraId = extractCameraId(blob);

  // ✅ PARTE QUE FALTAVA:
  // se NÃO parecer CFTV, não é "CF_OUTROS" — é "NAO_CFTV"
  if (!isRealCftvText({ title, descriptionText, activityText, activitiesText })) {
    return { issueType: 'NAO_CFTV', cameraId };
  }

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
    'nova camera',
    'nova cam',
    'colocar camera',
    'instalar camera',
    'instalacao de camera',
    'instalacao de cameras',
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
    'reposicionar',
    'reposicionamento',
  ])) {
    return { issueType: 'CF_POSICIONAMENTO', cameraId };
  }

  // ✅ é CFTV de verdade, mas não bateu regras específicas
  return { issueType: 'CF_OUTROS', cameraId };
}

module.exports = {
  classifyCftvIssue,
  isRealCftvText,
  extractCameraId,
};
