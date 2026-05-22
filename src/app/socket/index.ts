import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { registerChatSocket } from './chatSocket';

export const createSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  registerChatSocket(io);
  return io;
};
