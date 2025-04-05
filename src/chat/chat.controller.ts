import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessage } from './interface';
import { ApiBearerAuth, ApiSecurity, ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { PrivyAuthGuard } from 'src/auth/privy-auth-guard';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('streams')
  @ApiOperation({ summary: 'Get all available chat streams' })
  getStreams() {
    return this.chatService.getStreams();
  }

  @Get('streams/:streamId/messages')
  @ApiOperation({ summary: 'Get the last 20 messages from a specific stream' })
  @ApiParam({ name: 'streamId', description: 'ID of the chat stream' })
  getMessages(@Param('streamId') streamId: string) {
    return this.chatService.getMessages(streamId);
  }

  @Post('streams/:streamId/messages')
  @UseGuards(PrivyAuthGuard)
  @ApiBearerAuth()
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Post a new message to a specific stream' })
  @ApiParam({ name: 'streamId', description: 'ID of the chat stream' })
  @ApiBody({ 
    description: 'Message details', 
    schema: {
      type: 'object',
      required: ['username', 'profile_pic', 'message'],
      properties: {
        username: { type: 'string', example: 'john_doe' },
        profile_pic: { type: 'string', example: 'https://example.com/avatar.jpg' },
        message: { type: 'string', example: 'Hello everyone!' },
      },
    }
  })
  postMessage(
    @Param('streamId') streamId: string,
    @Body() messageData: ChatMessage,
  ) {
    const newMessage = this.chatService.addMessage(streamId, messageData);
    
    return {
      success: true,
      message: newMessage,
    };
  }

  @Post('streams')
  @UseGuards(PrivyAuthGuard)
  @ApiBearerAuth()
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Create a new chat stream' })
  @ApiBody({ 
    description: 'Stream details', 
    schema: {
      type: 'object',
      required: ['streamId'],
      properties: {
        streamId: { type: 'string', example: 'tech-talk' }
      },
    }
  })
  createStream(@Body('streamId') streamId: string) {
    const created = this.chatService.createStream(streamId);
    
    return {
      success: created,
      message: created 
        ? `Stream "${streamId}" created successfully` 
        : `Stream "${streamId}" already exists`,
    };
  }
}