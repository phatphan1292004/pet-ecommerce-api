import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { registerChatSocket } from './chatSocket';

let ioInstance: Server | null = null;

export const createSocketServer = (httpServer: HttpServer): Server => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  registerChatSocket(ioInstance);
  return ioInstance;
};

export const getIo = (): Server | null => {
  return ioInstance;
};
