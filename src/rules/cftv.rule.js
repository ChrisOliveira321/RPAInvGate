function isCftv(breadcrumb) {
  if (!breadcrumb) return false

  const texto = breadcrumb
    .toUpperCase()
    .replace(/\s+/g, '')

  return texto.includes(
    'CONTROLEDEACESSO&CFTV»CFTV»CAMERAS'
  )
}

module.exports = { isCftv }
