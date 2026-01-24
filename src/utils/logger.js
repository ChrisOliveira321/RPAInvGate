function logTicket(ticket, isCamera) {
  console.log('==========================')
  console.log('🆔 Chamado:', ticket.numero)
  console.log('🔗 URL:', ticket.url)
  console.log('📌 Título:', ticket.titulo)
  console.log('🧭 Categoria:', ticket.breadcrumb || 'Sem categoria')
  console.log('📂 Tipo:', isCamera ? 'CÂMERA (CFTV)' : 'OUTROS')
}

module.exports = { logTicket }
