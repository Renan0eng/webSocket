const express = require('express');
const http = require('http');
const WebSocket = require('ws');

// Configuração do servidor Express
const app = express();
const server = http.createServer(app);

// Configuração do WebSocket
const wss = new WebSocket.Server({ server });

// Serve arquivos estáticos
app.use(express.static('public'));

// Armazenar as conexões WebSocket por sala
const rooms = {};

wss.on('connection', (ws) => {
  console.log('Novo cliente conectado');

  let currentRoom = null;

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('Mensagem recebida: ', data);

    // Entrar na sala
    if (data.type === 'join-room') {
      currentRoom = data.roomCode;
      if (!rooms[currentRoom]) {
        rooms[currentRoom] = [];
      }
      rooms[currentRoom].push(ws);
      console.log(`Cliente entrou na sala: ${currentRoom}`);

      // Notificar aos outros clientes que alguém entrou
      rooms[currentRoom].forEach(client => {
        if (client !== ws) {
          client.send(JSON.stringify({ type: 'user-connected', id: ws._socket.remoteAddress }));
        }
      });
    }

    // Enviar a oferta WebRTC
    if (data.type === 'offer') {
      const { target, offer } = data;
      rooms[currentRoom].forEach(client => {
        if (client !== ws && client._socket.remoteAddress === target) {
          client.send(JSON.stringify({ type: 'offer', offer, from: ws._socket.remoteAddress }));
        }
      });
    }

    // Enviar a resposta WebRTC
    if (data.type === 'answer') {
      const { target, answer } = data;
      rooms[currentRoom].forEach(client => {
        if (client !== ws && client._socket.remoteAddress === target) {
          client.send(JSON.stringify({ type: 'answer', answer }));
        }
      });
    }

    // Enviar candidato ICE
    if (data.type === 'ice-candidate') {
      const { target, candidate } = data;
      rooms[currentRoom].forEach(client => {
        if (client !== ws && client._socket.remoteAddress === target) {
          client.send(JSON.stringify({ type: 'ice-candidate', candidate }));
        }
      });
    }
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
    if (currentRoom) {
      rooms[currentRoom] = rooms[currentRoom].filter(client => client !== ws);
      // Notificar os outros clientes que alguém saiu
      rooms[currentRoom].forEach(client => {
        client.send(JSON.stringify({ type: 'user-disconnected', id: ws._socket.remoteAddress }));
      });
    }
  });
});

// Iniciar o servidor na porta 3000
server.listen(3000, () => {
  console.log('Servidor WebSocket rodando na porta 3000');
});
