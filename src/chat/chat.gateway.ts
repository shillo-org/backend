import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { ChatService } from './chat.service';
  import { ChatMessage } from "./interface";
  import { Logger } from '@nestjs/common';
  
  @WebSocketGateway({
    cors: {
      origin: '*', // In production, specify your frontend origin
    },
  })
  export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(ChatGateway.name);
    
    @WebSocketServer()
    server: Server;
  
    constructor(private readonly chatService: ChatService) {}
  
    /**
     * Handle new WebSocket connections
     */
    handleConnection(client: Socket) {
      this.logger.log(`Client connected: ${client.id}`);
    }
  
    /**
     * Handle WebSocket disconnections
     */
    handleDisconnect(client: Socket) {
      this.logger.log(`Client disconnected: ${client.id}`);
      
      // Get all rooms (streams) this client was in and leave them
      const rooms = Array.from(client.rooms).filter(room => room !== client.id);
      rooms.forEach(room => client.leave(room));
    }
  
    /**
     * Handle client joining a stream
     */
    @SubscribeMessage('joinStream')
    handleJoinStream(
      @ConnectedSocket() client: Socket,
      @MessageBody() streamId: string,
    ) {
      // Leave all other streams first
      const currentRooms = Array.from(client.rooms).filter(room => room !== client.id);
      currentRooms.forEach(room => client.leave(room));
      
      // Join the new stream
      client.join(streamId);
      
      // Send last 20 messages to the client
      const messages = this.chatService.getMessages(streamId);
      client.emit('previousMessages', messages);
      
      this.logger.log(`Client ${client.id} joined stream: ${streamId}`);
      return { success: true, streamId };
    }
  
    /**
     * Handle client leaving a stream
     */
    @SubscribeMessage('leaveStream')
    handleLeaveStream(
      @ConnectedSocket() client: Socket,
      @MessageBody() streamId: string,
    ) {
      client.leave(streamId);
      this.logger.log(`Client ${client.id} left stream: ${streamId}`);
      return { success: true, streamId };
    }
  
    /**
     * Handle new message from client
     */
    @SubscribeMessage('sendMessage')
    handleSendMessage(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { streamId: string; message: ChatMessage },
    ) {
      const { streamId, message } = data;
      
      // Store the message
      const storedMessage = this.chatService.addMessage(streamId, message);
      
      // Broadcast to everyone in the stream
      this.server.to(streamId).emit('newMessage', storedMessage);
      
      return { success: true, message: storedMessage };
    }
  }