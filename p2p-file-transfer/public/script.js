const socket = io();
const fileInput = document.getElementById('fileInput');
const sendButton = document.getElementById('sendButton');
const fileList = document.getElementById('fileList');

let peer;
const CHUNK_SIZE = 64 * 1024; // 64 KB

socket.on('offer', async (offer) => {
  peer = new SimplePeer({ initiator: false, trickle: false });
  peer.on('signal', (data) => {
    socket.emit('answer', data);
  });

  let receivedChunks = [];
  peer.on('data', (data) => {
    if (data.toString() === 'FILE_END') {
      // Reconstruir o arquivo
      const fileBlob = new Blob(receivedChunks);
      const url = URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'received_file';
      a.textContent = 'Download File';
      fileList.appendChild(a);
      receivedChunks = []; // Limpar chunks após o download
    } else {
      receivedChunks.push(data); // Adicionar chunk ao array
    }
  });

  peer.signal(offer);
});

socket.on('answer', (answer) => {
  peer.signal(answer);
});

socket.on('candidate', (candidate) => {
  peer.signal(candidate);
});

sendButton.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (file) {
    peer = new SimplePeer({ initiator: true, trickle: false });
    peer.on('signal', (data) => {
      socket.emit('offer', data);
    });

    peer.on('connect', () => {
      const fileReader = new FileReader();
      let offset = 0;

      const readNextChunk = () => {
        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        fileReader.readAsArrayBuffer(chunk);
      };

      fileReader.onload = (event) => {
        if (event.target.result.byteLength > 0) {
          peer.send(event.target.result); // Enviar chunk
          offset += event.target.result.byteLength;
          readNextChunk(); // Ler o próximo chunk
        } else {
          peer.send('FILE_END'); // Sinalizar fim do arquivo
        }
      };

      readNextChunk(); // Iniciar o processo de leitura
    });
  }
});