const { saveTicket } = require('./src/db/ticketRepo');

saveTicket({
  ticket_id: '30924',
  titulo: 'câmeras do GIMPO',
  local: 'Gimpo » Az - Brascargo',
  url: 'https://rochalog.sd.cloud.invgate.net/requests/show/index/id/30924',
  collected_at: new Date().toISOString(),
});

console.log('✅ OK');
