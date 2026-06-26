import { Server as SocketIO } from 'socket.io';
import http from 'http';
import express from 'express';

// This module creates a shared Socket.io server instance that can be imported elsewhere.
// It expects an existing Express app to be passed for HTTP server creation.

let ioInstance = null;

export function initSocket(app) {
  if (ioInstance) return ioInstance; // already initialized
  const server = http.createServer(app);
  ioInstance = new SocketIO(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
  ioInstance.on('connection', socket => {
    console.log('Client connected for notifications');
  });
  return { server, io: ioInstance };
}

export function emitEvent(event, payload) {
  if (!ioInstance) {
    console.warn('Socket.io not initialized – cannot emit event');
    return;
  }
  ioInstance.emit(event, payload);
}
