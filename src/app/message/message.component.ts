import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { HttpClient } from '@angular/common/http';

interface Message {
  sender: string;
  recipient: string;
  content: string;
  timestamp?: string | Date; // Add timestamp property
}

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.css']
})
export class MessageComponent implements OnInit, OnDestroy {
  userName = localStorage.getItem('user_email') || 'User'; // Use actual email
  users: { name: string, email: string }[] = [];
  messageForm: FormGroup;
  messages: Message[] = [];
  selectedRecipient: { name: string, email: string } | null = null; // <-- FIXED
  searchTerm: string = '';

  // Add these properties to your component class
  sidebarOpen = false;
  isMobile = false;

  private socket: Socket;

  constructor(private fb: FormBuilder, private router: Router, private http: HttpClient) {
    this.messageForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(250)]]
    });
    this.socket = io('https://localfit.onrender.com', {
      transports: ['websocket', 'polling']
    });
  }
  ngOnInit() {
     console.log('Current user from localStorage:', this.userName);
     
     // Use local API server to get real users from database
     this.http.get<{ success: boolean, data: { id: number, name: string, email: string }[] }>('/api/all-users')
  .subscribe({
    next: response => {
      console.log('API Response:', response);
      if (response.success && response.data) {
        console.log('Real users loaded from database:', response.data);
        this.users = response.data;
        console.log('Users array populated:', this.users);
      } else {
        console.error('API response format unexpected:', response);
        this.users = [];
      }
    },
    error: error => {
      console.error('Error loading users from database:', error);
      console.log('Make sure your local Node.js server is running on port 3001');
      // Fallback to mock data only if local API fails
      this.users = [
        { name: 'Test User 1', email: 'test1@example.com' },
        { name: 'Test User 2', email: 'test2@example.com' }
      ];
    }
  });

    this.socket.on('all-messages', (msgs: Message[]) => {
      console.log('All messages received:', msgs);
      this.messages = msgs;
    });
    this.socket.on('receive-message', (msg: Message) => {
      console.log('New message received:', msg);
      this.messages.push(msg);
      // Scroll to bottom if the message is for the currently selected conversation
      if (this.selectedRecipient && 
          ((msg.sender === this.selectedRecipient.email && msg.recipient === this.userName) ||
           (msg.sender === this.userName && msg.recipient === this.selectedRecipient.email))) {
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      }
    });

    // Add Socket.IO connection logging
    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    this.isMobile = window.innerWidth <= 700;
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth <= 700;
      if (!this.isMobile) this.sidebarOpen = false;
    });
  }

  ngOnDestroy() {
    this.socket.disconnect();
  }

  selectRecipient(user: { name: string, email: string }) {
  if (user.email !== this.userName) {
    this.selectedRecipient = user;
    this.messageForm.reset();
    // Fetch messages from backend for this conversation  
    this.http.get<Message[]>(
      `/api/messages?user1=${this.userName}&user2=${user.email}`
    ).subscribe({
      next: msgs => {
        console.log('Messages loaded:', msgs);
        // Merge new messages, avoid duplicates
        const all = [...this.messages];
        msgs.forEach(m => {
          if (!all.find(existing =>
            existing.sender === m.sender &&
            existing.recipient === m.recipient &&
            existing.content === m.content
          )) {
            all.push(m);
          }
        });
        this.messages = all;
        // Scroll to bottom to show most recent messages
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      },
      error: error => {
        console.error('Error loading messages:', error);
      }
    });
    // Close sidebar on mobile
    if (this.isMobile) {
      this.sidebarOpen = false;
    }
  }
}
  sendMessage() {
  if (this.messageForm.valid && this.selectedRecipient) {
    // Create timestamp in GMT+8 timezone
    const nowGMT8 = new Date().toLocaleString("en-US", {timeZone: "Asia/Singapore"});
    const msg: Message = {
      sender: this.userName,
      recipient: this.selectedRecipient.email,
      content: this.messageForm.value.content,
      timestamp: new Date(nowGMT8) // Add current timestamp in GMT+8
    };
    this.socket.emit('send-message', msg);
    // Save to backend using local API
     this.http.post('/api/send-message', msg)
      .subscribe({
        next: response => {
          console.log('Message saved to backend:', response);
        },
        error: error => {
          console.error('Error saving message:', error);
        }
      });
    this.messageForm.reset();
    // Scroll to bottom to show new message
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }
}

  filteredMessages() {
    if (!this.selectedRecipient) return [];
    const messages = this.messages.filter(
      m =>
        (m.sender === this.userName && m.recipient === this.selectedRecipient!.email) ||
        (m.sender === this.selectedRecipient!.email && m.recipient === this.userName)
    );
    
    // Sort messages by timestamp to show most recent messages
    return messages.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB; // Sort chronologically (oldest first, newest last)
    });
  }

  goToProductListing() {
    this.router.navigate(['/product-listing']);
  }

  // Method to scroll to the bottom of messages container
  scrollToBottom(): void {
    try {
      const messagesContainer = document.querySelector('.messages-wrapper');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  get usersWithConversation() {
    const convoEmails = new Set<string>();
    this.messages.forEach(msg => {
      if (msg.sender === this.userName) {
        convoEmails.add(msg.recipient);
      }
      if (msg.recipient === this.userName) {
        convoEmails.add(msg.sender);
      }
    });
    return this.users.filter(user =>
      user.email !== this.userName && convoEmails.has(user.email)
    );
  }

  filteredUsers() {
    console.log('filteredUsers called - Total users:', this.users.length, 'Current user:', this.userName);
    console.log('All users:', this.users);
    const term = this.searchTerm.toLowerCase();
    const filtered = this.users.filter(user =>
      user.email !== this.userName &&
      (user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term))
    );
    console.log('Filtered users for display:', filtered);
    return filtered;
  }

  // Method to format timestamp for display
  formatMessageTime(timestamp?: string | Date): string {
    if (!timestamp) {
      return 'now';
    }

    const messageDate = new Date(timestamp);
    const now = new Date();
    
    // Convert to GMT+8 timezone
    const gmt8Offset = 8 * 60; // 8 hours in minutes
    const messageGMT8 = new Date(messageDate.getTime() + (gmt8Offset * 60 * 1000));
    const nowGMT8 = new Date(now.getTime() + (gmt8Offset * 60 * 1000));
    
    const diffInMs = nowGMT8.getTime() - messageGMT8.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    // If message is less than 1 minute old
    if (diffInMinutes < 1) {
      return 'now';
    }
    // If message is less than 1 hour old
    else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    // If message is less than 24 hours old
    else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    // If message is less than 7 days old
    else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }
    // For older messages, show the actual date in GMT+8
    else {
      return messageGMT8.toLocaleDateString('en-US', { timeZone: 'Asia/Singapore' });
    }
  }

  // Method to format time for message bubbles (shows actual time)
  formatMessageBubbleTime(timestamp?: string | Date): string {
    if (!timestamp) {
      return 'now';
    }

    const messageDate = new Date(timestamp);
    const now = new Date();
    
    // Convert to GMT+8 timezone for comparison
    const messageGMT8 = new Date(messageDate.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
    const nowGMT8 = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
    const isToday = messageGMT8.toDateString() === nowGMT8.toDateString();
    
    if (isToday) {
      // Show time in HH:MM format for today's messages in GMT+8
      return messageDate.toLocaleTimeString('en-US', { 
        timeZone: 'Asia/Singapore',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      // Show date and time for older messages in GMT+8
      return messageDate.toLocaleDateString('en-US', { timeZone: 'Asia/Singapore' }) + ' ' + 
             messageDate.toLocaleTimeString('en-US', { 
               timeZone: 'Asia/Singapore',
               hour: '2-digit', 
               minute: '2-digit',
               hour12: true 
             });
    }
  }

  // Method to get the last message time for a user in the sidebar
  getLastMessageTime(user: { name: string, email: string }): string {
    // Find the most recent message with this user
    const userMessages = this.messages.filter(
      m => (m.sender === this.userName && m.recipient === user.email) ||
           (m.sender === user.email && m.recipient === this.userName)
    );

    if (userMessages.length === 0) {
      return 'No messages';
    }

    // Sort by timestamp to get the most recent
    const lastMessage = userMessages.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    })[0];

    return this.formatMessageTime(lastMessage.timestamp);
  }

  // Method to get the last message content for preview
  getLastMessageContent(user: { name: string, email: string }): string {
    // Find the most recent message with this user
    const userMessages = this.messages.filter(
      m => (m.sender === this.userName && m.recipient === user.email) ||
           (m.sender === user.email && m.recipient === this.userName)
    );

    if (userMessages.length === 0) {
      return 'Start a conversation...';
    }

    // Sort by timestamp to get the most recent
    const lastMessage = userMessages.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    })[0];

    // Truncate long messages for preview
    const maxLength = 30;
    const content = lastMessage.content;
    const prefix = lastMessage.sender === this.userName ? 'You: ' : '';
    const fullMessage = prefix + content;
    
    return fullMessage.length > maxLength 
      ? fullMessage.substring(0, maxLength) + '...' 
      : fullMessage;
  }
}
