const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8080 });

// Armazena as conexões dos usuários por código
const rooms = {};

server.on('connection', (socket) => {
  console.log('Novo cliente conectado!');

  // Evento para receber o código do usuário
  socket.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'join') {
      const code = data.code;

      // Cria uma "sala" (room) se não existir
      if (!rooms[code]) {
        rooms[code] = [];
      }

      // Adiciona o usuário à sala
      rooms[code].push(socket);
      console.log(`Usuário entrou na sala ${code}`);

      // Notifica os usuários quando a sala estiver cheia (2 usuários)
      if (rooms[code].length === 2) {
        rooms[code].forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'ready', message: 'Conexão estabelecida!' }));
          }
        });
      }
    }

    // Recebe chunks de arquivo e encaminha para o outro usuário na sala
    if (data.type === 'file-chunk') {
      const code = data.code;
      const chunk = data.chunk;
      const fileName = data.fileName;
      const isLastChunk = data.isLastChunk;
      const fileSize = data.fileSize; // Tamanho total do arquivo
      const uploadedBytes = data.uploadedBytes; // Bytes já enviados

      // Calcula o progresso de upload
      const uploadProgress = (uploadedBytes / fileSize) * 100;

      // Envia o chunk e o progresso de upload para o outro usuário na sala
      rooms[code].forEach((client) => {
        if (client !== socket && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'file-chunk',
            chunk: chunk,
            fileName: fileName,
            isLastChunk: isLastChunk,
            fileSize: fileSize,
            uploadProgress: uploadProgress // Envia o progresso de upload
          }));
        }
      });
    }
  });

  // Quando o cliente fecha a conexão
  socket.on('close', () => {
    console.log('Cliente desconectado');
    // Remove o usuário de todas as salas
    for (const code in rooms) {
      rooms[code] = rooms[code].filter((client) => client !== socket);
      if (rooms[code].length === 0) {
        delete rooms[code]; // Remove a sala se estiver vazia
      }
    }
  });
});

console.log('Servidor WebSocket rodando na porta 8080');